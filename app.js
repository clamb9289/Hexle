// ---------- constants ----------
const MAX_RGB_DIST = Math.sqrt(3 * 255 * 255);

// Stripe "customer chooses price" payment link -- set once created (see
// setup notes). Empty string means the tip links just don't render yet,
// rather than shipping a dead "#" href.
const THANKS_URL = "https://buy.stripe.com/dRm14nff5da9bJndS6cAo09";

// Cloudflare Worker + D1 backing the "beats X% of yesterday's players"
// line -- the one piece of shared (non-localStorage) state in this whole
// project. See project memory for the Worker source/setup steps.
const STATS_API = "https://hexle-stats-api.clamb9289.workers.dev";

const LS_KEYS = {
  activeMode: "hexle_active_mode",
  // v2: each day's state now holds 3 attempts (1 official + 2 practice)
  // instead of one flat puzzle -- old hexle_day_<mode>_<date> data is simply
  // left behind under the old key name, same as past breaking storage
  // changes on this project.
  dayState: (mode, dateKey) => `hexle_day_v2_${mode}_${dateKey}`,
  stats: (mode) => `hexle_stats_${mode}`,
  gridZoom: "hexle_grid_zoom",
  welcomeNewDismissed: "hexle_welcome_new_dismissed",
  welcomeBannerSeenDate: "hexle_welcome_banner_date",
  // Deliberately separate from stats.lastCompletedKey, which Hard Reset
  // wipes -- this one must NOT be cleared by Hard Reset, or replaying
  // today's (now-different) official puzzle after each reset would fire
  // another beacon into today's real global distribution every time.
  // Only the real calendar date rolling over should reset this.
  globalRecorded: (mode, dateKey) => `hexle_global_recorded_${mode}_${dateKey}`
};

// ---------- helpers ----------
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16)
  };
}

function rgbDistance(a, b) {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

// One compass arrow pointing from a guess toward the target on the grid --
// replaces the old R/G/B channel breakdown (players found it more math
// than fun). Uses the same (row, col) positions squaresAway() already
// relies on, so direction and distance can never disagree with each other.
function directionArrow(guessHex, targetHex) {
  const g = gridPosition(guessHex);
  const t = gridPosition(targetHex);
  if (!g || !t) return "•";
  const dRow = t.row - g.row;
  const dCol = t.col - g.col;
  const vert = dRow < 0 ? "up" : dRow > 0 ? "down" : "";
  const horiz = dCol < 0 ? "left" : dCol > 0 ? "right" : "";
  const ARROWS = {
    "up-left": "↖", up: "↑", "up-right": "↗",
    left: "←", right: "→",
    "down-left": "↙", down: "↓", "down-right": "↘"
  };
  return ARROWS[[vert, horiz].filter(Boolean).join("-")] || "•";
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ---------- modes ----------
// Easy and Hard are two separate daily puzzles -- different target color,
// own guesses, own stats -- not a setting that reconfigures one shared game.
// That's what makes switching mid-session safe: you're not changing the
// rules out from under a game already in progress, you're just looking at
// the other one.
const MODES = {
  easy: { maxAttempts: 5, hints: true, label: "Easy" },
  hard: { maxAttempts: 5, hints: false, label: "Hard" }
};
const DEFAULT_MODE = "easy";
const ROMAN = { 1: "I", 2: "II", 3: "III" };

function getActiveMode() {
  const m = loadJSON(LS_KEYS.activeMode, DEFAULT_MODE);
  return MODES[m] ? m : DEFAULT_MODE;
}
function setActiveMode(m) {
  saveJSON(LS_KEYS.activeMode, m);
}

// ---------- day state ----------
// Each mode/day now holds 3 independent puzzle attempts: attempts[0] is the
// official daily puzzle (feeds stats/streak, the one that's shareable);
// attempts[1] and attempts[2] are free practice rounds at the same
// difficulty, played in order, that never touch stats -- same spirit as the
// old testing-only "refresh" button, just capped and built-in rather than
// unlimited. `jump` is 0 on a normal day; Hard Reset sets it to a large
// random value so this mode's 3 colors change today without waiting for
// tomorrow (see targets.js for why it has to be large, not a small step).
function freshDayState() {
  return {
    jump: 0,
    currentAttempt: 0,
    attempts: [0, 1, 2].map(() => ({ guesses: [], finished: false, won: false, modalShown: false }))
  };
}
function getDayState(mode, dateKey) {
  return loadJSON(LS_KEYS.dayState(mode, dateKey), freshDayState());
}
function saveDayState(mode, dateKey, state) {
  saveJSON(LS_KEYS.dayState(mode, dateKey), state);
}

// ---------- stats ----------
function getStats(mode) {
  return loadJSON(LS_KEYS.stats(mode), {
    played: 0,
    wins: 0,
    currentStreak: 0,
    maxStreak: 0,
    lastCompletedKey: null,
    distribution: {} // guess-count (string) -> win count; "lose" -> loss count
  });
}
function saveStats(mode, s) {
  saveJSON(LS_KEYS.stats(mode), s);
}
// Only ever called for the official attempt (attempts[0]) -- practice
// attempts never reach this function at all.
function recordResult(mode, attempt, dateKey, targetHex) {
  const stats = getStats(mode);
  // Deduped by date *and* target, not date alone -- a different color for
  // the same date (e.g. after a Hard Reset jump) is a genuinely different
  // puzzle and should count as its own result.
  const resultKey = `${dateKey}:${targetHex}`;
  if (stats.lastCompletedKey === resultKey) return { stats, isNewBest: false }; // already recorded this exact puzzle
  const oldMax = stats.maxStreak;
  let isNewBest = false;
  stats.played += 1;
  if (attempt.won) {
    stats.wins += 1;
    stats.currentStreak += 1;
    stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
    isNewBest = stats.currentStreak > oldMax; // strictly a new record, not just tying the old one
    const key = String(attempt.guesses.length);
    stats.distribution[key] = (stats.distribution[key] || 0) + 1;
  } else {
    stats.currentStreak = 0;
    stats.distribution["lose"] = (stats.distribution["lose"] || 0) + 1;
  }
  stats.lastCompletedKey = resultKey;
  saveStats(mode, stats);
  // At most one contribution to today's *global* distribution per browser,
  // no matter how many times Hard Reset wipes local stats and lets someone
  // replay today's official puzzle -- see globalRecorded's own comment.
  if (!loadJSON(LS_KEYS.globalRecorded(mode, dateKey), false)) {
    recordGlobalResult(mode, dateKey, attempt.won ? String(attempt.guesses.length) : "lose");
    saveJSON(LS_KEYS.globalRecorded(mode, dateKey), true);
  }
  return { stats, isNewBest };
}

// ---------- global stats (the one shared, non-localStorage piece) ----------
// Fire-and-forget -- a slow or dead Worker should never be able to block or
// break an actual game result. No personal data, just {date, mode, result}.
function recordGlobalResult(mode, dateKey, result) {
  fetch(`${STATS_API}/record`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date: dateKey, mode, result })
  }).catch(() => {}); // best-effort; local stats already saved regardless
}

function yesterdayDateKey(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return getTodayKey(d);
}

// Timed out rather than awaited indefinitely -- a slow/unreachable Worker
// should still let the result modal open promptly, just without this line.
async function fetchYesterdayDistribution(mode) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const res = await fetch(
      `${STATS_API}/distribution?date=${yesterdayDateKey(today)}&mode=${mode}`,
      { signal: controller.signal }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.distribution || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// % of yesterday's finishers who did WORSE than this result (more guesses,
// or lost). Only meaningful once there's real data -- null with no games
// yesterday rather than a misleading number.
const RESULT_RANK = ["1", "2", "3", "4", "5", "lose"]; // best to worst
function computePercentile(distribution, result) {
  if (!distribution) return null;
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  const rank = RESULT_RANK.indexOf(result);
  const worseCount = RESULT_RANK.slice(rank + 1).reduce((sum, r) => sum + (distribution[r] || 0), 0);
  return Math.round((worseCount / total) * 100);
}

// A loss can't "beat" anyone (nothing ranks worse than losing), so it gets
// a softer, still-honest framing: how many others also didn't crack it,
// rather than a discouraging "beats 0%".
function buildPercentileLine(distribution, attempt) {
  if (!distribution) return null;
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  if (attempt.won) {
    const pct = computePercentile(distribution, String(attempt.guesses.length));
    return `🏆 Beats ${pct}% of yesterday's ${modeConfig.label} players!`;
  }
  const loseShare = Math.round(((distribution.lose || 0) / total) * 100);
  return `You're not alone — ${loseShare}% of yesterday's ${modeConfig.label} players didn't crack it either.`;
}

// ---------- game state ----------
const mode = getActiveMode();
const modeConfig = MODES[mode];
const today = new Date();
const dateKey = getTodayKey(today);
let dayState = getDayState(mode, dateKey);
function curAttempt() {
  return dayState.attempts[dayState.currentAttempt];
}
// How many of the 2 practice slots haven't been played yet today. Attempts
// only ever advance forward in order, so "not finished" and "not yet
// reached" are the same set of slots.
function practiceRemaining() {
  return dayState.attempts.slice(1).filter((a) => !a.finished).length;
}
const target = attemptTarget(today, mode, dayState.currentAttempt, dayState.jump);
const targetRgb = hexToRgb(target.hex);
function dayHintsOn() {
  return modeConfig.hints;
}

// ---------- DOM refs ----------
const promptLabelEl = document.getElementById("prompt-label");
const targetNameRevealEl = document.getElementById("target-name-reveal");
const promptSwatchEl = document.getElementById("prompt-swatch");
const promptHexEl = document.getElementById("prompt-hex");
const attemptsRemainingEl = document.getElementById("attempts-remaining");
const historyEl = document.getElementById("history");
const gridContainer = document.getElementById("grid-container");
const modalBackdrop = document.getElementById("modal-backdrop");
const modal = document.getElementById("modal");
const practiceBtn = document.getElementById("practice-btn");
const latestGuessEl = document.getElementById("latest-guess");
const gridFooterEl = document.getElementById("grid-footer");
const installBtn = document.getElementById("install-btn");

// ---------- welcome banner ----------
function thanksLinkHTML() {
  if (!THANKS_URL) return "";
  return `<a class="thanks-link" href="${THANKS_URL}" target="_blank" rel="noopener">☕ Say thanks to the developer</a>`;
}

function formatFriendlyDate(date) {
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

// "New" is purely about play history, not a one-time flag someone could get
// stuck past -- once you've finished a single puzzle, ever, in either mode,
// you're a returning player for good.
function hasEverPlayed() {
  return getStats("easy").played > 0 || getStats("hard").played > 0;
}

// New-player banner: shows once, until dismissed or until they finish their
// first puzzle (whichever comes first) -- no need to nag after that, the
// ❓ button covers instructions forever. Returning-player banner: shows
// once per calendar day, greeting-style, not on every reload (a lot of
// actions here already trigger a full page reload, so "every load" would
// mean constant popping). Both render through the same popup used for
// Settings/Stats/Help (not a dedicated inline banner) -- it already centers
// over the page with a dismiss-anywhere backdrop, which happens to land
// right over the grid, the biggest thing on screen either way.
function renderWelcomeBanner() {
  if (!hasEverPlayed()) {
    if (loadJSON(LS_KEYS.welcomeNewDismissed, false)) return;
    openModal(`
      <h2>👋 Welcome to Hexle!</h2>
      <p class="banner-sub">A daily color-matching game — ${formatFriendlyDate(today)}</p>
      <div class="close-row">
        <button class="primary" id="welcome-howto-btn">❓ How to play</button>
        <button class="primary" data-close id="welcome-dismiss-btn">Let's go!</button>
      </div>
    `);
    const dismissNew = () => saveJSON(LS_KEYS.welcomeNewDismissed, true);
    modal.querySelector("#welcome-dismiss-btn").addEventListener("click", dismissNew);
    modal.querySelector("#welcome-howto-btn").addEventListener("click", () => {
      dismissNew(); // clicking through to instructions counts as onboarded too
      document.getElementById("help-btn").click();
    });
    return;
  }

  if (loadJSON(LS_KEYS.welcomeBannerSeenDate, null) === dateKey) return; // already greeted today

  const stats = getStats(mode);
  const onFire = stats.currentStreak > 0 && stats.currentStreak === stats.maxStreak;
  const streakLine = stats.currentStreak > 0
    ? `${onFire ? "🔥 " : ""}${stats.currentStreak}-day streak${onFire ? " — your best ever!" : ""}`
    : "Ready for today's puzzle?";

  openModal(`
    <div class="welcome-fire-wrap${onFire ? " on-fire" : ""}">
      <h2>${formatFriendlyDate(today)} — ${modeConfig.label}</h2>
      <p class="banner-title">${streakLine}</p>
      <p class="banner-sub">Best streak: ${stats.maxStreak}</p>
      ${thanksLinkHTML()}
    </div>
    <div class="close-row"><button class="primary" data-close>Let's go!</button></div>
  `);
  // marked seen the moment it's shown, not only on explicit dismiss -- a
  // passive greeting shouldn't require an action to stop reappearing
  saveJSON(LS_KEYS.welcomeBannerSeenDate, dateKey);
}

// ---------- install prompt ----------
// Quiet by design: this button only ever appears when there's something
// useful behind it, and it's never shown by default (see the `hidden`
// attribute in index.html). No unsolicited banner or popup -- if it's not
// installable and not iOS, the button just stays hidden, permanently.
function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}
// Every iOS browser (Safari, Chrome, etc.) runs on WebKit and shares the
// same lack of an install API -- so this covers "show the iOS instructions"
// broadly, not just Safari specifically. The instructions themselves tell
// non-Safari users to switch, since only Safari can actually add to Home Screen.
function isIOS() {
  return /iP(hone|od|ad)/.test(navigator.platform)
    || (navigator.userAgent.includes("Mac") && navigator.maxTouchPoints > 1); // iPadOS reports as "Mac"
}

let deferredInstallPrompt = null;

function updateInstallButtonVisibility() {
  if (isStandalone()) {
    installBtn.hidden = true;
    return;
  }
  installBtn.hidden = !(deferredInstallPrompt || isIOS());
}

// Chrome/Edge (desktop and Android) fire this once they've decided the page
// is installable -- holding onto it is what lets a normal in-page button
// trigger the native prompt later, instead of only a browser-menu option.
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  updateInstallButtonVisibility();
});
window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  updateInstallButtonVisibility();
});

function showIOSInstallInstructions() {
  openModal(`
    <h2>📲 Add Hexle to your Home Screen</h2>
    <p>iOS doesn't let websites trigger this directly, so it's a couple of manual taps:</p>
    <p>1. Open <strong>hexle.us</strong> in <strong>Safari</strong> (this doesn't work from Chrome or other browsers, or from a link opened inside another app).</p>
    <p>2. Tap the <strong>Share</strong> icon — a square with an arrow pointing up, in the toolbar.</p>
    <p>3. Scroll down and tap <strong>Add to Home Screen</strong>.</p>
    <p>It'll launch full-screen from your Home Screen from then on, just like a regular app.</p>
    <div class="close-row"><button class="primary" data-close>Got it</button></div>
  `);
}

installBtn.addEventListener("click", async () => {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    updateInstallButtonVisibility();
  } else if (isIOS()) {
    showIOSInstallInstructions();
  }
});

// ---------- squares-away hint ----------
// The palette's own canonical layout (16 cols x 30 rows, matching the
// reference image -- see the comment above) is the fixed coordinate system
// for this hint, independent of the CSS grid's responsive column count, so
// the same guess always reports the same distance no matter the viewport.
const GRID_COLS = 16;

function gridPosition(hex) {
  const idx = COLORS.findIndex((c) => c.hex.toUpperCase() === hex.toUpperCase());
  if (idx === -1) return null;
  return { row: Math.floor(idx / GRID_COLS), col: idx % GRID_COLS };
}

// Chebyshev (king-move) distance: 1 = any of the 8 touching swatches, 2 =
// the next ring out, and so on.
function squaresAway(guessHex, targetHex) {
  const g = gridPosition(guessHex);
  const t = gridPosition(targetHex);
  if (!g || !t) return null;
  return Math.max(Math.abs(g.row - t.row), Math.abs(g.col - t.col));
}

// ---------- quadrant board ----------
// Feedback from real players: the full 480-swatch board was too big and
// didn't add anything. Fix: only show the quarter of the grid that actually
// contains today's target -- still the same underlying 16x30 layout (and
// gridPosition()/squaresAway() above still work against that full layout
// unchanged), just a smaller slice of it rendered and guessable. Whichever
// quadrant a given attempt's target happens to land in is already
// determined by its (fixed, deterministic) position in the full grid --
// nothing new to compute for "which quadrant is today's."
const GRID_ROWS = COLORS.length / GRID_COLS; // 30
const QUAD_COLS = GRID_COLS / 2; // 8
const QUAD_ROWS = GRID_ROWS / 2; // 15

function quadrantColors(targetHex) {
  const pos = gridPosition(targetHex);
  if (!pos) return COLORS; // shouldn't happen; fail open rather than break the grid
  const colStart = pos.col < QUAD_COLS ? 0 : QUAD_COLS;
  const rowStart = pos.row < QUAD_ROWS ? 0 : QUAD_ROWS;
  const cells = [];
  for (let r = rowStart; r < rowStart + QUAD_ROWS; r++) {
    for (let c = colStart; c < colStart + QUAD_COLS; c++) {
      cells.push(COLORS[r * GRID_COLS + c]);
    }
  }
  return cells;
}

// A small 5x5 mock-up for the help modal, showing the "X" (your guess) and
// the ring number every surrounding cell would report. Built from the same
// Chebyshev distance used by squaresAway() itself, so it can't drift out of
// sync with what the game actually shows.
function squaresAwayDiagramHTML() {
  const size = 5;
  const center = 2;
  let cells = "";
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const dist = Math.max(Math.abs(r - center), Math.abs(c - center));
      if (dist === 0) {
        cells += `<div class="away-cell away-cell-x">✕</div>`;
      } else {
        cells += `<div class="away-cell away-cell-${dist}">${dist}</div>`;
      }
    }
  }
  return `<div class="squares-away-diagram">${cells}</div>`;
}

// ---------- grid rendering ----------
function buildGrid() {
  gridContainer.innerHTML = "";

  const gridEl = document.createElement("div");
  gridEl.className = "swatch-grid";

  quadrantColors(target.hex).forEach((c) => {
    const btn = document.createElement("button");
    btn.className = "swatch";
    btn.style.backgroundColor = c.hex;
    btn.dataset.hex = c.hex;
    btn.dataset.name = c.name;
    btn.setAttribute("aria-label", "Guess this color");
    btn.addEventListener("click", () => onGuess(c));
    gridEl.appendChild(btn);
  });

  gridContainer.appendChild(gridEl);
  applyUsedState();
}

function applyUsedState() {
  const attempt = curAttempt();
  const guessedHexes = new Set(attempt.guesses.map((g) => g.hex));
  const outOfGuesses = attempt.finished && !attempt.won;
  document.querySelectorAll(".swatch").forEach((btn) => {
    if (guessedHexes.has(btn.dataset.hex)) {
      btn.classList.add("used");
    }
    // out of guesses -- call out the correct swatch with a pulsing ring
    btn.classList.toggle(
      "target-reveal",
      outOfGuesses && btn.dataset.hex.toUpperCase() === target.hex.toUpperCase()
    );
  });
  const gridEl = document.querySelector(".swatch-grid");
  if (gridEl) gridEl.classList.toggle("disabled", attempt.finished);
}

// ---------- win superlatives ----------
// A unique punny title per possible guess count (1 through the max attempts
// setting tops out at 5), from most-impressive (fewest guesses) to still-fun
// at the wire.
const WIN_SUPERLATIVES = {
  1: "Hextraordinary!",
  2: "Chroma-nomenal!",
  3: "Color-ific!",
  4: "Hextastic!",
  5: "Hue Made It!"
};
function winSuperlative(guessCount) {
  return WIN_SUPERLATIVES[guessCount] || "Nice work!";
}

// ---------- confetti ----------
function launchConfetti(extra = false) {
  document.querySelector(".confetti-canvas")?.remove();

  const canvas = document.createElement("canvas");
  canvas.className = "confetti-canvas";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  // reuse the day's own palette so the confetti matches the game's colors
  const palette = COLORS.map((c) => c.hex);
  // extra: a bigger, longer pop specifically for a new personal-best streak
  const PIECE_COUNT = extra ? 280 : 160;
  const pieces = Array.from({ length: PIECE_COUNT }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * canvas.height * 0.6,
    size: 6 + Math.random() * 7,
    color: palette[Math.floor(Math.random() * palette.length)],
    speedY: 2.5 + Math.random() * 3.5,
    speedX: (Math.random() - 0.5) * 2.5,
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 12,
    shape: Math.random() < 0.5 ? "rect" : "circle"
  }));

  const duration = extra ? 4200 : 3200;
  let elapsed = 0;
  let lastTime = performance.now();

  function frame(now) {
    // clamp the per-frame delta so a backgrounded tab (rAF paused, then
    // resumed with a huge wall-clock gap) doesn't eat the whole animation
    // budget in one jump -- the player should still see it play out
    elapsed += Math.min(now - lastTime, 50);
    lastTime = now;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let stillFalling = false;
    for (const p of pieces) {
      p.x += p.speedX;
      p.y += p.speedY;
      p.rotation += p.rotationSpeed;
      if (p.y < canvas.height + 20) stillFalling = true;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      if (p.shape === "rect") {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    if (elapsed < duration && stillFalling) {
      requestAnimationFrame(frame);
    } else {
      canvas.remove();
    }
  }
  requestAnimationFrame(frame);
}
window.addEventListener("resize", () => {
  const canvas = document.querySelector(".confetti-canvas");
  if (canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
});

// ---------- guess handling ----------
// A finished game (win or loss) reveals the target's real name as a slow
// fade-in, but only once the player has actually seen the result modal and
// dismissed it — not immediately on the deciding guess itself. This flag
// defers that.
let pendingReveal = false;

function revealTargetName(animate) {
  targetNameRevealEl.textContent = target.name;
  if (animate) {
    targetNameRevealEl.classList.remove("visible");
    void targetNameRevealEl.offsetWidth; // force reflow so the transition replays
    // setTimeout instead of requestAnimationFrame -- rAF is paused entirely
    // for backgrounded/hidden tabs, so it could silently never fire
    setTimeout(() => targetNameRevealEl.classList.add("visible"), 20);
  } else {
    targetNameRevealEl.classList.add("visible");
  }
}

// Keeps the topbar practice button in sync with today's remaining practice
// attempts -- roman-numeral count while some are left, locked once they're
// all used. Disabled (not just informational) while the attempt currently
// being played isn't finished yet, so you can't skip ahead mid-puzzle.
function syncPracticeButton() {
  const remaining = practiceRemaining();
  const canAdvance = curAttempt().finished && dayState.currentAttempt < dayState.attempts.length - 1;
  if (remaining === 0) {
    practiceBtn.textContent = "🔒";
    practiceBtn.title = "No practice puzzles left today";
    practiceBtn.disabled = true;
  } else {
    practiceBtn.textContent = `🎯 ${ROMAN[remaining]}`;
    practiceBtn.title = canAdvance
      ? `${remaining} practice puzzle${remaining === 1 ? "" : "s"} left today — click to play`
      : `${remaining} practice puzzle${remaining === 1 ? "" : "s"} left today — finish this one first`;
    practiceBtn.disabled = !canAdvance;
  }
}
practiceBtn.addEventListener("click", () => {
  if (practiceBtn.disabled) return;
  dayState.currentAttempt += 1;
  saveDayState(mode, dateKey, dayState);
  location.reload();
});

function renderPrompt() {
  const attempt = curAttempt();
  const label = dayState.currentAttempt === 0
    ? `Today's color — ${modeConfig.label}`
    : `Practice ${ROMAN[dayState.currentAttempt]} of II — ${modeConfig.label}`;
  promptLabelEl.textContent = label;
  promptSwatchEl.style.backgroundColor = target.hex;
  promptHexEl.textContent = target.hex;
  const remaining = modeConfig.maxAttempts - attempt.guesses.length;
  if (attempt.finished) {
    attemptsRemainingEl.textContent = attempt.won
      ? `${winSuperlative(attempt.guesses.length)} Solved in ${attempt.guesses.length} guess${attempt.guesses.length === 1 ? "" : "es"}!`
      : "Out of guesses";
  } else {
    const modeNote = dayHintsOn() ? "" : " · no hints";
    attemptsRemainingEl.textContent = `${remaining} guess${remaining === 1 ? "" : "es"} left${modeNote}`;
  }

  if (attempt.finished && attempt.modalShown) {
    // a finished game (win or loss) from an earlier session (or
    // already-dismissed this session) — show the name plainly, no animation
    revealTargetName(false);
  } else if (!attempt.finished) {
    targetNameRevealEl.textContent = "";
    targetNameRevealEl.classList.remove("visible");
  }
  // the remaining case — just-finished, modal not yet dismissed — is left
  // alone here; closeModal() triggers the animated reveal once they close it
  syncPracticeButton();
}

// Shared between the "most recent guess" card and every history row, so any
// hint/closeness upgrade shows up consistently in both places.
function buildDirectionEl(direction) {
  const span = document.createElement("span");
  span.className = "direction-hint";
  span.textContent = direction;
  span.setAttribute("aria-label", "Direction toward today's color");
  return span;
}

function buildMiniCloseness(closeness) {
  const wrap = document.createElement("div");
  wrap.className = "mini-closeness";
  const barWrap = document.createElement("div");
  barWrap.className = "mini-closeness-bar-wrap";
  const bar = document.createElement("div");
  bar.className = "mini-closeness-bar";
  bar.style.width = `${closeness}%`;
  barWrap.appendChild(bar);
  const label = document.createElement("span");
  label.className = "mini-closeness-label";
  label.textContent = `${closeness}%`;
  wrap.appendChild(barWrap);
  wrap.appendChild(label);
  return wrap;
}

// Closeness + squares-away + direction, all as one compact inline row, so
// a guess's full feedback fits on a single line in the history row.
function appendFeedback(parent, feedback) {
  parent.appendChild(buildMiniCloseness(feedback.closeness));
  const awayBadge = document.createElement("span");
  awayBadge.className = "squares-away-badge";
  awayBadge.textContent = feedback.squaresAway === 0 ? "🎯" : `${feedback.squaresAway} away`;
  parent.appendChild(awayBadge);
  parent.appendChild(buildDirectionEl(feedback.direction));
}

// One place that decides whether a guess gets any feedback at all -- Hard
// mode returns null, and every render site below treats null as "show
// nothing but the swatch/name/hex".
function computeGuessFeedback(guessHex) {
  if (!dayHintsOn()) return null;
  const guessRgb = hexToRgb(guessHex);
  const dist = rgbDistance(guessRgb, targetRgb);
  const closeness = Math.round((1 - dist / MAX_RGB_DIST) * 100);
  return {
    closeness,
    squaresAway: squaresAway(guessHex, target.hex),
    direction: directionArrow(guessHex, target.hex)
  };
}

// Builds one guess row's DOM -- shared by the scrolling history list and
// the pinned "latest guess" copy above it, so the two can never drift out
// of sync with each other.
function buildHistoryRow(guessColor, feedback) {
  const row = document.createElement("div");
  row.className = "history-row";

  const left = document.createElement("div");
  left.className = "history-left";

  const swatch = document.createElement("div");
  swatch.className = "history-swatch";
  swatch.style.backgroundColor = guessColor.hex;

  const name = document.createElement("div");
  name.className = "history-name";
  name.textContent = guessColor.name;

  left.appendChild(swatch);
  left.appendChild(name);

  // hex-label ("HEX #") and hex-value are separate flex children so a
  // narrow row can wrap just the digits down to their own line while
  // "HEX #" stays put on the first line
  const hex = document.createElement("div");
  hex.className = "history-hex";
  const hexLabel = document.createElement("span");
  hexLabel.className = "hex-label";
  hexLabel.textContent = "HEX #";
  const hexValue = document.createElement("span");
  hexValue.className = "hex-value";
  hexValue.textContent = guessColor.hex.slice(1);
  hex.appendChild(hexLabel);
  hex.appendChild(hexValue);

  // hex/closeness/away/hints spread across the row's remaining width with
  // even spacing, instead of clumping into a left group + one big gap
  const info = document.createElement("div");
  info.className = "history-info";
  info.appendChild(hex);
  if (feedback) {
    appendFeedback(info, feedback);
  } else {
    const noHints = document.createElement("span");
    noHints.className = "no-hints-note";
    noHints.textContent = "🔒 no hints";
    info.appendChild(noHints);
  }

  row.appendChild(left);
  row.appendChild(info);
  return row;
}

// Rebuilds both guess displays from the attempt's guesses array: the most
// recent guess goes in the pinned #latest-guess box (in .fixed-top, always
// visible without scrolling), and every *other* guess -- newest of the
// rest first -- goes in the scrollable #history list below it. Each guess
// appears in exactly one of the two, not both.
function renderGuessDisplay() {
  const guesses = curAttempt().guesses;
  latestGuessEl.innerHTML = "";
  historyEl.innerHTML = "";
  if (guesses.length === 0) return;

  const last = guesses[guesses.length - 1];
  latestGuessEl.appendChild(
    buildHistoryRow({ hex: last.hex, name: last.name }, computeGuessFeedback(last.hex))
  );

  for (let i = guesses.length - 2; i >= 0; i--) {
    const g = guesses[i];
    historyEl.appendChild(
      buildHistoryRow({ hex: g.hex, name: g.name }, computeGuessFeedback(g.hex))
    );
  }
}

function onGuess(color) {
  const attempt = curAttempt();
  if (attempt.finished) return;
  if (attempt.guesses.some((g) => g.hex === color.hex)) return;

  const won = color.hex.toUpperCase() === target.hex.toUpperCase();

  attempt.guesses.push({ hex: color.hex, name: color.name, won });

  if (won) {
    attempt.finished = true;
    attempt.won = true;
    pendingReveal = true;
  } else if (attempt.guesses.length >= modeConfig.maxAttempts) {
    attempt.finished = true;
    attempt.won = false;
    pendingReveal = true;
  }
  saveDayState(mode, dateKey, dayState);

  renderGuessDisplay();
  renderPrompt();
  applyUsedState();
  if (attempt.finished) syncModeSwitcherUI(); // ✅/❌ badge shows immediately, no reload needed

  if (attempt.finished) {
    // only the official attempt (index 0) ever touches stats/streak --
    // practice attempts are free reps, same spirit as the old refresh
    // button's "never touches stats" rule.
    let stats, isNewBest = false;
    if (dayState.currentAttempt === 0) {
      ({ stats, isNewBest } = recordResult(mode, attempt, dateKey, target.hex));
    } else {
      stats = getStats(mode);
    }
    if (!attempt.modalShown) {
      attempt.modalShown = true;
      saveDayState(mode, dateKey, dayState);
      if (attempt.won) launchConfetti(isNewBest); // bigger pop for a new personal-best streak
      // percentile line is official-only and never blocks showing the
      // modal for long -- fetchYesterdayDistribution times out on its own
      if (dayState.currentAttempt === 0) {
        fetchYesterdayDistribution(mode).then((dist) => {
          showResultModal(stats, buildPercentileLine(dist, attempt));
        });
      } else {
        showResultModal(stats, null);
      }
    }
  }
}

// ---------- replay past guesses on load ----------
function replayHistory() {
  renderGuessDisplay();
}

// ---------- modals ----------
function openModal(html) {
  modal.innerHTML = html;
  modalBackdrop.classList.remove("hidden");
  modal.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeModal));
}
function closeModal() {
  modalBackdrop.classList.add("hidden");
  if (pendingReveal) {
    pendingReveal = false;
    revealTargetName(true);
  }
}
modalBackdrop.addEventListener("click", (e) => {
  if (e.target === modalBackdrop) closeModal();
});

// Peeks at the other mode's day state without switching to it -- used only
// to decide whether the "try Hard mode" nudge makes sense to show. Only the
// official attempt counts as "played today" for this purpose.
function otherModeToday() {
  const otherMode = mode === "easy" ? "hard" : "easy";
  const otherState = getDayState(otherMode, dateKey);
  return { mode: otherMode, label: MODES[otherMode].label, finished: otherState.attempts[0].finished };
}

// ---------- share ----------
// Wordle-style emoji summary of the official attempt's guesses -- graded by
// squares-away ring distance so it works the same in Hard mode too (which
// has no channel hints to draw from, but squares-away always exists).
function shareEmojiForAway(away) {
  if (away === null) return "⬜";
  if (away === 0) return "🟩";
  if (away <= 2) return "🟨";
  if (away <= 5) return "🟧";
  return "🟥";
}
function buildShareText() {
  const official = dayState.attempts[0];
  const officialTarget = attemptTarget(today, mode, 0, dayState.jump);
  const line = official.guesses
    .map((g) => shareEmojiForAway(squaresAway(g.hex, officialTarget.hex)))
    .join("");
  const result = official.won ? `${official.guesses.length}/${modeConfig.maxAttempts}` : `X/${modeConfig.maxAttempts}`;
  return `Hexle ${modeConfig.label} — ${dateKey}\n${result} ${line}\nhttps://hexle.us`;
}

function showResultModal(stats, percentileLine = null) {
  const attempt = curAttempt();
  const isOfficial = dayState.currentAttempt === 0;
  const banner = attempt.won
    ? `<p class="win-superlative">${winSuperlative(attempt.guesses.length)}</p>
       <p class="win-banner">You got it in ${attempt.guesses.length} guess${attempt.guesses.length === 1 ? "" : "es"}! 🎉</p>`
    : `<p class="lose-banner">Out of guesses!</p>`;
  const revealLine = attempt.won
    ? ""
    : `<p>${isOfficial ? "Today's" : "This practice"} color was <strong>${target.name}</strong> — <code>${target.hex}</code></p>`;
  const percentileHTML = percentileLine ? `<p class="percentile-line">${percentileLine}</p>` : "";

  const remaining = practiceRemaining();
  let actionsHTML;
  if (isOfficial) {
    actionsHTML = `
      <div class="mode-cta result-actions">
        <button class="primary" id="share-btn">📋 Share your colors</button>
        ${remaining > 0 ? `<button class="primary" id="keep-practicing-btn">Keep practicing →</button>` : ""}
      </div>`;
  } else if (remaining > 0) {
    actionsHTML = `
      <div class="mode-cta result-actions">
        <button class="primary" id="keep-practicing-btn">Keep practicing →</button>
      </div>`;
  } else {
    actionsHTML = `<p class="mode-cta-done">That's all 3 for today — see you tomorrow! 🎨</p>`;
  }

  // nudge a winning Easy player toward Hard mode, unless they've already
  // played Hard's official puzzle today too -- only shown alongside the
  // official result, not every practice round
  let modeCTA = "";
  if (isOfficial && mode === "easy" && attempt.won) {
    const other = otherModeToday();
    modeCTA = other.finished
      ? `<p class="mode-cta-done">You've already tackled Hard mode today too! 💪</p>`
      : `<div class="mode-cta">
           <p>Feeling confident?</p>
           <button class="primary" id="try-hard-btn">Try Hard mode →</button>
         </div>`;
  }

  openModal(`
    <h2>Hexle</h2>
    ${banner}
    ${revealLine}
    ${percentileHTML}
    ${actionsHTML}
    ${modeCTA}
    ${statsBodyHTML(stats)}
    ${THANKS_URL ? `<p class="thanks-row">${thanksLinkHTML()}</p>` : ""}
    <div class="close-row"><button class="primary" data-close>Close</button></div>
  `);
  modal.querySelector("#try-hard-btn")?.addEventListener("click", () => {
    setActiveMode("hard");
    location.reload();
  });
  modal.querySelector("#keep-practicing-btn")?.addEventListener("click", () => {
    dayState.currentAttempt += 1;
    saveDayState(mode, dateKey, dayState);
    location.reload();
  });
  modal.querySelector("#share-btn")?.addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    try {
      await navigator.clipboard.writeText(buildShareText());
      btn.textContent = "Copied! ✅";
    } catch {
      btn.textContent = "Couldn't copy — try manually";
    }
    setTimeout(() => { btn.textContent = "📋 Share your colors"; }, 2000);
  });
}

function statsBodyHTML(stats, modeCfg = modeConfig) {
  const winPct = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;
  const maxCount = Math.max(1, ...Object.values(stats.distribution));
  // show rows for this mode's attempts count, but never hide real history —
  // if an earlier build left non-zero data past that, keep showing those
  // rows too rather than silently dropping them
  const recordedRows = Object.keys(stats.distribution)
    .map((k) => parseInt(k, 10))
    .filter((n) => !isNaN(n));
  const rowCount = Math.max(modeCfg.maxAttempts, ...recordedRows, 0);
  const rows = [];
  for (let i = 1; i <= rowCount; i++) {
    const count = stats.distribution[String(i)] || 0;
    rows.push({ label: String(i), count, win: true });
  }
  rows.push({ label: "X", count: stats.distribution["lose"] || 0, win: false });

  const distHTML = rows.map((r) => {
    const widthPct = Math.max(6, (r.count / maxCount) * 100);
    return `<div class="dist-row">
      <span>${r.label}</span>
      <div class="dist-bar ${r.win ? "win" : ""}" style="width:${widthPct}%">${r.count}</div>
    </div>`;
  }).join("");

  return `
    <div class="stats-grid">
      <div><div class="stat-num">${stats.played}</div><div class="stat-label">Played</div></div>
      <div><div class="stat-num">${winPct}</div><div class="stat-label">Win %</div></div>
      <div><div class="stat-num">${stats.currentStreak}</div><div class="stat-label">Streak</div></div>
      <div><div class="stat-num">${stats.maxStreak}</div><div class="stat-label">Max Streak</div></div>
    </div>
    <div class="dist-title">Guess distribution</div>
    ${distHTML}
  `;
}

document.getElementById("stats-btn").addEventListener("click", () => {
  // always both modes, regardless of which board is currently active --
  // switching boards shouldn't be required just to see the other's numbers
  const sections = Object.keys(MODES).map((m) => `
    <div class="stats-mode-block">
      <h3 class="stats-mode-heading">${MODES[m].label}${m === mode ? " (current)" : ""}</h3>
      ${statsBodyHTML(getStats(m), MODES[m])}
    </div>
  `).join("");
  openModal(`
    <h2>Statistics</h2>
    ${sections}
    <div class="close-row"><button class="primary" data-close>Close</button></div>
  `);
});

document.getElementById("help-btn").addEventListener("click", () => {
  openModal(`
    <h2>How to play</h2>
    <p>Every day, Hexle shows you a color swatch and its hex code. Your job is to click the exact matching swatch on the grid below. Guessed swatches gray out — you can't pick the same one twice.</p>

    <p><strong>3 puzzles a day.</strong> The first one is today's official puzzle — it's what counts toward your stats and streak, and what you can share. After that, you get 2 free practice puzzles at the same difficulty (🎯 button, top bar) — good for more reps, but they don't affect your stats.</p>

    <p><strong>Easy vs Hard.</strong> These are two separate daily puzzles with two different colors — not just a setting. <strong>Easy</strong> gives you 5 guesses with full hints (below). <strong>Hard</strong> also gives you 5 guesses, but none of the hints — just the grid. Switch anytime with the Easy/Hard buttons up top; your progress in each is kept separately.</p>

    <p><strong>The board.</strong> You're not looking at the whole 480-color palette — just the quarter of it that actually contains today's color, so there's less to search through.</p>

    <p><strong>Direction.</strong> Each guess shows an arrow pointing toward today's color on the grid — <strong>↑</strong> means it's above your guess, <strong>↘</strong> means down-and-right, and so on.</p>

    <p><strong>% close.</strong> This is the straight-line distance between your guess and today's color across all three color channels at once, not a plain average — one channel being way off hurts more than that same error spread thin across all three.</p>

    <p><strong>Squares away.</strong> The color grid has a fixed layout. This counts how many rings out the correct swatch is from the one you picked: <strong>1</strong> means it's one of the 8 swatches touching yours, <strong>2</strong> means the next ring out, and so on. ✕ is the swatch you guessed:</p>
    ${squaresAwayDiagramHTML()}
    <p class="banner-sub">Found a bug, or have feedback? <a href="https://github.com/clamb9289/Hexle/issues/new" target="_blank" rel="noopener">Let me know on GitHub</a>.</p>
    <div class="close-row"><button class="primary" data-close>Got it</button></div>
  `);
});

document.getElementById("settings-btn").addEventListener("click", () => {
  openModal(`
    <h2>Settings</h2>
    <div class="settings-row">
      <span>Get 3 fresh colors today, both modes (wipes all stats)</span>
      <button class="primary danger" id="hard-reset-btn">Hard Reset</button>
    </div>
    <div class="close-row"><button class="primary" data-close>Close</button></div>
  `);
  modal.querySelector("#hard-reset-btn").addEventListener("click", () => {
    if (!confirm("This wipes ALL stats (played, streak, distribution) for BOTH modes and gives you 3 fresh colors to try today. This can't be undone. Continue?")) return;
    // a large random jump, not a small increment -- see targets.js for why
    // a small step would just walk today's colors into tomorrow's real ones
    const newJump = 1000 + Math.floor(Math.random() * 1000000);
    Object.keys(MODES).forEach((m) => {
      localStorage.removeItem(LS_KEYS.stats(m));
      const fresh = freshDayState();
      fresh.jump = newJump;
      saveDayState(m, dateKey, fresh);
    });
    closeModal();
    location.reload();
  });
});

// ---------- mode switcher ----------
const modeButtons = document.querySelectorAll("#mode-switcher [data-mode]");
function syncModeSwitcherUI() {
  modeButtons.forEach((btn) => {
    const m = btn.dataset.mode;
    const isActive = m === mode;
    btn.classList.toggle("active", isActive);
    const st = isActive ? dayState : getDayState(m, dateKey);
    const official = st.attempts[0];
    const badge = official.finished ? (official.won ? " ✅" : " ❌") : "";
    btn.textContent = `${MODES[m].label}${badge}`;
  });
}
modeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.dataset.mode === mode) return;
    setActiveMode(btn.dataset.mode);
    location.reload();
  });
});

// ---------- grid zoom ----------
// The swatch grid is always a fixed 16 columns now (see the comment on
// .swatch-grid in style.css) rather than reflowing at narrow widths, so
// squares shrink instead of the color order getting jumbled. No on-screen
// zoom controls -- mobile zooms with a two-finger pinch (below); desktop
// just scrolls with the wheel and otherwise relies on that same shrink-to-
// fit reflow as the window narrows.
const gridScrollArea = document.querySelector(".grid-scroll-area");
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
let gridZoom = loadJSON(LS_KEYS.gridZoom, 1);

// The grid's columns are `1fr` (see .swatch-grid), which means they just
// re-fill whatever width their container is given -- so "zoom" here isn't
// a CSS transform/zoom property (both of those scale rendering without
// telling the *scroll container* there's more content to pan to, and in
// testing `zoom` on a 1fr grid got silently cancelled out: the columns just
// recomputed to refill the same space). Instead, zooming explicitly widens
// #grid-container in real pixels; the 1fr columns grow to fill that through
// completely normal grid reflow, and .grid-scroll-area's native
// `overflow: auto` then handles panning around the result for free.
function naturalGridWidth() {
  const cs = getComputedStyle(gridScrollArea);
  const paddingX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
  return gridScrollArea.clientWidth - paddingX;
}

function setZoom(z) {
  gridZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
  gridContainer.style.width = gridZoom === 1 ? "" : `${naturalGridWidth() * gridZoom}px`;
  saveJSON(LS_KEYS.gridZoom, gridZoom);
}
window.addEventListener("resize", () => setZoom(gridZoom));

// mobile: two-finger pinch zooms; a single finger still scrolls normally
function touchDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}
let pinchStartDist = null;
let pinchStartZoom = 1;
gridScrollArea.addEventListener("touchstart", (e) => {
  if (e.touches.length === 2) {
    pinchStartDist = touchDistance(e.touches);
    pinchStartZoom = gridZoom;
  }
}, { passive: true });
gridScrollArea.addEventListener("touchmove", (e) => {
  if (e.touches.length === 2 && pinchStartDist) {
    e.preventDefault(); // take over from native page-pinch-zoom while over the grid
    setZoom(pinchStartZoom * (touchDistance(e.touches) / pinchStartDist));
  }
}, { passive: false });
gridScrollArea.addEventListener("touchend", (e) => {
  if (e.touches.length < 2) pinchStartDist = null;
});

// ---------- init ----------
syncModeSwitcherUI();
buildGrid();
setZoom(gridZoom);
renderPrompt();
replayHistory();
renderWelcomeBanner();
updateInstallButtonVisibility(); // covers the iOS case immediately; Chrome/Edge upgrade it later via beforeinstallprompt
gridFooterEl.innerHTML = thanksLinkHTML(); // always-there copy, visible once you scroll past the whole grid
if (curAttempt().finished && !curAttempt().modalShown) {
  // day was completed in a state before modal-shown tracking existed
  curAttempt().modalShown = true;
  saveDayState(mode, dateKey, dayState);
}
