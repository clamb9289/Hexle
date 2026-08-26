// ---------- constants ----------
const MAX_RGB_DIST = Math.sqrt(3 * 255 * 255);

const LS_KEYS = {
  activeMode: "hexle_active_mode",
  dayState: (mode, dateKey) => `hexle_day_${mode}_${dateKey}`,
  stats: (mode) => `hexle_stats_${mode}`,
  targetOverride: (mode) => `hexle_target_override_${mode}`,
  gridZoom: "hexle_grid_zoom"
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

function channelHint(guessVal, targetVal) {
  const diff = targetVal - guessVal;
  if (diff === 0) return { dir: "ok", symbol: "✓", abs: 0, magnitude: "exact" };
  const abs = Math.abs(diff);
  // how big a nudge this channel needs -- drives both the shown number and
  // how visually loud the hint is (a 3-off channel should barely register,
  // a 120-off channel should jump out)
  const magnitude = abs > 70 ? "far" : abs > 20 ? "mid" : "near";
  return { dir: diff > 0 ? "up" : "down", symbol: diff > 0 ? "▲" : "▼", abs, magnitude };
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
  hard: { maxAttempts: 3, hints: false, label: "Hard" }
};
const DEFAULT_MODE = "easy";

function getActiveMode() {
  const m = loadJSON(LS_KEYS.activeMode, DEFAULT_MODE);
  return MODES[m] ? m : DEFAULT_MODE;
}
function setActiveMode(m) {
  saveJSON(LS_KEYS.activeMode, m);
}

// ---------- day state ----------
function getDayState(mode, dateKey, maxAttempts) {
  const fallback = { guesses: [], finished: false, won: false, modalShown: false, maxAttempts };
  return loadJSON(LS_KEYS.dayState(mode, dateKey), fallback);
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
function recordResult(mode, dayState, dateKey, targetHex) {
  const stats = getStats(mode);
  // Deduped by date *and* target, not date alone -- a genuine replay of the
  // same puzzle (e.g. via "Reset today's puzzle", which restores the real
  // un-overridden target) still correctly skips double-counting, but a
  // different recycled test color is a different puzzle and should count.
  // Keying on date alone used to mean every recycled puzzle after the first
  // one each day silently never updated stats at all.
  const resultKey = `${dateKey}:${targetHex}`;
  if (stats.lastCompletedKey === resultKey) return stats; // already recorded this exact puzzle
  // snapshot so a manual "reset today" (settings) can cleanly undo this recording
  dayState.statsSnapshotBefore = JSON.parse(JSON.stringify(stats));
  stats.played += 1;
  if (dayState.won) {
    stats.wins += 1;
    stats.currentStreak += 1;
    stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
    const key = String(dayState.guesses.length);
    stats.distribution[key] = (stats.distribution[key] || 0) + 1;
  } else {
    stats.currentStreak = 0;
    stats.distribution["lose"] = (stats.distribution["lose"] || 0) + 1;
  }
  stats.lastCompletedKey = resultKey;
  saveStats(mode, stats);
  return stats;
}

// ---------- game state ----------
const mode = getActiveMode();
const modeConfig = MODES[mode];
const today = new Date();
const dateKey = getTodayKey(today);
// testing: "Refresh today's color" can override this mode's real
// (deterministic) target with a random one, so you can play through many
// colors without waiting for the day to change. Cleared by the normal
// "Reset today's puzzle".
const targetOverride = loadJSON(LS_KEYS.targetOverride(mode), null);
const target = targetOverride || getTodayTarget(today, mode);
const targetRgb = hexToRgb(target.hex);
let dayState = getDayState(mode, dateKey, modeConfig.maxAttempts);
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

  COLORS.forEach((c) => {
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
  const guessedHexes = new Set(dayState.guesses.map((g) => g.hex));
  const outOfGuesses = dayState.finished && !dayState.won;
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
  if (gridEl) gridEl.classList.toggle("disabled", dayState.finished);
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
function launchConfetti() {
  document.querySelector(".confetti-canvas")?.remove();

  const canvas = document.createElement("canvas");
  canvas.className = "confetti-canvas";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  // reuse the day's own palette so the confetti matches the game's colors
  const palette = COLORS.map((c) => c.hex);
  const PIECE_COUNT = 160;
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

  const duration = 3200;
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

function renderPrompt() {
  promptLabelEl.textContent = `${targetOverride ? "Test color (testing mode)" : "Today's color"} — ${modeConfig.label}`;
  promptSwatchEl.style.backgroundColor = target.hex;
  promptHexEl.textContent = target.hex;
  const remaining = dayState.maxAttempts - dayState.guesses.length;
  if (dayState.finished) {
    attemptsRemainingEl.textContent = dayState.won
      ? `${winSuperlative(dayState.guesses.length)} Solved in ${dayState.guesses.length} guess${dayState.guesses.length === 1 ? "" : "es"}!`
      : "Out of guesses";
  } else {
    const modeNote = dayHintsOn() ? "" : " · no hints";
    attemptsRemainingEl.textContent = `${remaining} guess${remaining === 1 ? "" : "es"} left${modeNote}`;
  }

  if (dayState.finished && dayState.modalShown) {
    // a finished game (win or loss) from an earlier session (or
    // already-dismissed this session) — show the name plainly, no animation
    revealTargetName(false);
  } else if (!dayState.finished) {
    targetNameRevealEl.textContent = "";
    targetNameRevealEl.classList.remove("visible");
  }
  // the remaining case — just-finished, modal not yet dismissed — is left
  // alone here; closeModal() triggers the animated reveal once they close it
}

// Shared between the "most recent guess" card and every history row, so any
// hint/closeness upgrade shows up consistently in both places.
function buildChannelHintsEl(hints) {
  const hintsRow = document.createElement("div");
  hintsRow.className = "history-hints";
  ["R", "G", "B"].forEach((label, i) => {
    const h = hints[i];
    const arrowClass = h.dir === "ok" ? "arrow-ok" : h.dir === "up" ? "arrow-up" : "arrow-down";
    const magClass = h.dir === "ok" ? "" : ` mag-${h.magnitude}`;
    const valueText = h.dir === "ok" ? "" : h.abs;
    const span = document.createElement("span");
    span.className = `${arrowClass}${magClass}`;
    span.textContent = `${label}${h.symbol}${valueText}`;
    hintsRow.appendChild(span);
  });
  return hintsRow;
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

// Closeness + squares-away + channel hints, all as one compact inline row,
// so a guess's full feedback fits on a single line in the history row.
function appendFeedback(parent, feedback) {
  parent.appendChild(buildMiniCloseness(feedback.closeness));
  const awayBadge = document.createElement("span");
  awayBadge.className = "squares-away-badge";
  awayBadge.textContent = feedback.squaresAway === 0 ? "🎯" : `${feedback.squaresAway} away`;
  parent.appendChild(awayBadge);
  // one atomic flex child -- when .history-info runs out of room it wraps
  // as a whole group onto its own line, not scattered per-channel
  parent.appendChild(buildChannelHintsEl(feedback.hints));
}

// One place that decides whether a guess gets any feedback at all -- Hard
// mode returns null, and every render site below treats null as "show
// nothing but the swatch/name/hex".
function computeGuessFeedback(guessHex) {
  if (!dayHintsOn()) return null;
  const guessRgb = hexToRgb(guessHex);
  const hints = [
    channelHint(guessRgb.r, targetRgb.r),
    channelHint(guessRgb.g, targetRgb.g),
    channelHint(guessRgb.b, targetRgb.b)
  ];
  const dist = rgbDistance(guessRgb, targetRgb);
  const closeness = Math.round((1 - dist / MAX_RGB_DIST) * 100);
  return { hints, closeness, squaresAway: squaresAway(guessHex, target.hex) };
}

function prependHistory(guessColor, feedback) {
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

  historyEl.insertBefore(row, historyEl.firstChild);
}

function onGuess(color) {
  if (dayState.finished) return;
  if (dayState.guesses.some((g) => g.hex === color.hex)) return;

  const feedback = computeGuessFeedback(color.hex);
  const won = color.hex.toUpperCase() === target.hex.toUpperCase();

  dayState.guesses.push({ hex: color.hex, name: color.name, won });

  if (won) {
    dayState.finished = true;
    dayState.won = true;
    pendingReveal = true;
  } else if (dayState.guesses.length >= dayState.maxAttempts) {
    dayState.finished = true;
    dayState.won = false;
    pendingReveal = true;
  }
  saveDayState(mode, dateKey, dayState);

  prependHistory(color, feedback);
  renderPrompt();
  applyUsedState();
  if (dayState.finished) syncModeSwitcherUI(); // ✅/❌ badge shows immediately, no reload needed

  if (dayState.finished) {
    const stats = recordResult(mode, dayState, dateKey, target.hex);
    if (!dayState.modalShown) {
      dayState.modalShown = true;
      saveDayState(mode, dateKey, dayState);
      if (dayState.won) launchConfetti();
      showResultModal(stats);
    }
  }
}

// ---------- replay past guesses on load ----------
function replayHistory() {
  for (const g of dayState.guesses) {
    const feedback = computeGuessFeedback(g.hex);
    const colorObj = { hex: g.hex, name: g.name };
    prependHistory(colorObj, feedback);
  }
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
// to decide whether the "try Hard mode" nudge makes sense to show.
function otherModeToday() {
  const otherMode = mode === "easy" ? "hard" : "easy";
  const otherState = getDayState(otherMode, dateKey, MODES[otherMode].maxAttempts);
  return { mode: otherMode, label: MODES[otherMode].label, finished: otherState.finished };
}

function showResultModal(stats) {
  const banner = dayState.won
    ? `<p class="win-superlative">${winSuperlative(dayState.guesses.length)}</p>
       <p class="win-banner">You got it in ${dayState.guesses.length} guess${dayState.guesses.length === 1 ? "" : "es"}! 🎉</p>`
    : `<p class="lose-banner">Out of guesses!</p>`;
  const revealLine = dayState.won
    ? ""
    : `<p>Today's color was <strong>${target.name}</strong> — <code>${target.hex}</code></p>`;

  // nudge a winning Easy player toward Hard mode, unless they've already
  // played Hard today too
  let modeCTA = "";
  if (mode === "easy" && dayState.won) {
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
    ${modeCTA}
    ${statsBodyHTML(stats)}
    <div class="close-row"><button class="primary" data-close>Close</button></div>
  `);
  modal.querySelector("#try-hard-btn")?.addEventListener("click", () => {
    setActiveMode("hard");
    location.reload();
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

    <p><strong>Easy vs Hard.</strong> These are two separate daily puzzles with two different colors — not just a setting. <strong>Easy</strong> gives you 5 guesses with full hints (below). <strong>Hard</strong> gives you 3 guesses and none of them — just the grid. Switch anytime with the Easy/Hard buttons up top; your progress in each is kept separately.</p>

    <p><strong>Channels.</strong> A hex color like <code>#3D7DC0</code> is really three numbers glued together — Red, Green, and Blue, each 0–255. Every guess compares your swatch's R, G, and B against today's color, one channel at a time:</p>
    <ul>
      <li><strong>▲</strong> — that channel needs to go <strong>up</strong> (your guess's value is lower than today's).</li>
      <li><strong>▼</strong> — that channel needs to go <strong>down</strong>.</li>
      <li><strong>✓</strong> — that channel is an exact match.</li>
    </ul>
    <p>The number next to the arrow is exactly how far off that channel is — <code>R▲23</code> means Red needs +23 to match. Faint text is a small gap; bold, glowing text is a big one.</p>

    <p><strong>% close.</strong> This is the straight-line distance between your guess and today's color across all three channels at once, not a plain average — one channel being way off hurts more than that same error spread thin across all three.</p>

    <p><strong>Squares away.</strong> The color grid has a fixed layout. This counts how many rings out the correct swatch is from the one you picked: <strong>1</strong> means it's one of the 8 swatches touching yours, <strong>2</strong> means the next ring out, and so on. ✕ is the swatch you guessed:</p>
    ${squaresAwayDiagramHTML()}
    <div class="close-row"><button class="primary" data-close>Got it</button></div>
  `);
});

document.getElementById("settings-btn").addEventListener("click", () => {
  openModal(`
    <h2>Settings</h2>
    <div class="settings-row">
      <span>Reset today's ${modeConfig.label} puzzle</span>
      <button class="primary" id="reset-today-btn">Reset</button>
    </div>
    <div class="settings-row">
      <span>Testing: hard reset (wipes all stats too)</span>
      <button class="primary danger" id="hard-reset-btn">Hard Reset</button>
    </div>
    <div class="close-row"><button class="primary" data-close>Close</button></div>
  `);
  modal.querySelector("#reset-today-btn").addEventListener("click", () => {
    // undo today's recorded result, if any, so re-playing today doesn't skew stats
    if (dayState.finished && dayState.statsSnapshotBefore) {
      saveStats(mode, dayState.statsSnapshotBefore);
    }
    localStorage.removeItem(LS_KEYS.dayState(mode, dateKey));
    localStorage.removeItem(LS_KEYS.targetOverride(mode));
    closeModal();
    location.reload();
  });
  modal.querySelector("#hard-reset-btn").addEventListener("click", () => {
    if (!confirm("This wipes ALL stats (played, streak, distribution) and today's puzzles for BOTH modes. This can't be undone. Continue?")) return;
    Object.keys(MODES).forEach((m) => {
      localStorage.removeItem(LS_KEYS.stats(m));
      localStorage.removeItem(LS_KEYS.dayState(m, dateKey));
      localStorage.removeItem(LS_KEYS.targetOverride(m));
    });
    closeModal();
    location.reload();
  });
});

// ---------- refresh today's color (testing) ----------
document.getElementById("recycle-target-btn").addEventListener("click", () => {
  // swaps in a fresh test color for BOTH modes -- deliberately does NOT
  // touch stats. Only Hard Reset should ever remove a recorded result;
  // this is just "give me new colors to try," not an undo.
  Object.keys(MODES).forEach((m) => {
    const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    saveJSON(LS_KEYS.targetOverride(m), { name: randomColor.name, hex: randomColor.hex });
    localStorage.removeItem(LS_KEYS.dayState(m, dateKey));
  });
  location.reload();
});

// ---------- mode switcher ----------
const modeButtons = document.querySelectorAll("#mode-switcher [data-mode]");
function syncModeSwitcherUI() {
  modeButtons.forEach((btn) => {
    const m = btn.dataset.mode;
    const isActive = m === mode;
    btn.classList.toggle("active", isActive);
    const st = isActive ? dayState : getDayState(m, dateKey, MODES[m].maxAttempts);
    const badge = st.finished ? (st.won ? " ✅" : " ❌") : "";
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
if (dayState.finished && !dayState.modalShown) {
  // day was completed in a state before modal-shown tracking existed
  dayState.modalShown = true;
  saveDayState(mode, dateKey, dayState);
}
