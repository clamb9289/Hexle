// Every day, each mode gets 3 deterministic target colors: attempt 0 is the
// "official" puzzle (feeds stats/streak, is what gets shared), attempts 1-2
// are free practice puzzles (same difficulty, don't touch stats). All 3 are
// pure functions of the date -- nothing is randomized at click-time -- so
// every player sees the same 3 colors on the same day, and "Reset today's
// puzzle" replaying an attempt always reproduces the exact same target.
//
// PALETTE_SEED fixes a single deterministic shuffle of the full 480-color
// palette (colors-data.js), generated once below via a seeded PRNG rather
// than hand-picked. Do not change this seed once real players are using the
// site -- it would silently reshuffle every past and future daily puzzle.
const PALETTE_SEED = 402984781;

// mulberry32 -- small, fast, deterministic PRNG. Same seed always produces
// the same sequence, which is the whole point: this shuffle must come out
// identically for every player, every session, forever.
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle(array, seed) {
  const rand = mulberry32(seed);
  const result = array.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// The full palette, fixed shuffle order -- this is the shared pool every
// mode/attempt stream below draws its daily color from.
const PALETTE_ORDER = seededShuffle(COLORS, PALETTE_SEED);

// day-number since a fixed epoch, used to deterministically pick today's target
function daysSinceEpoch(date) {
  const epoch = Date.UTC(2026, 0, 1); // 2026-01-01
  const d = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((d - epoch) / 86400000);
}

function getTodayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// 6 independent streams (easy x3, hard x3) share one 480-color pool, each
// advancing by 1 index per real day from its own fixed starting offset.
// Offsets are spaced 80 apart (480 / 6), which guarantees all 6 streams
// land on different colors on any given day -- including easy vs hard's
// official colors, continuing the "offset by half the pool" trick this file
// used at 10 colors, just generalized to 6 evenly-spaced streams at 480.
// Each stream only repeats a color it's already shown once every ~480 days
// (about 16 months), which is what makes repeats "extremely unlikely" --
// not because colors are picked freshly, but because the cycle is long.
const STREAM_OFFSETS = {
  easy: [0, 80, 160],
  hard: [240, 320, 400]
};

// After a stream's ~480-day lap completes, nudge its mapping by a fixed
// non-trivial amount so the next lap pairs up different day/color
// combinations rather than repeating the exact same sequence forever.
const CYCLE_SHIFT_STEP = 151;

// jump lets "Hard Reset" hand out genuinely fresh colors today without
// waiting for tomorrow -- see app.js. It must be large/effectively random,
// not a small increment: adding +1 would just walk today's colors into
// TOMORROW's real official pick, spoiling it and making tomorrow feel like
// a repeat. A large jump lands far enough away in the cycle to avoid that.
function attemptTarget(date, mode, attemptIndex, jump = 0) {
  const n = PALETTE_ORDER.length;
  const day = daysSinceEpoch(date);
  const offset = STREAM_OFFSETS[mode][attemptIndex];
  const raw = day + offset + jump;
  const cycle = Math.floor(raw / n);
  const cycleShift = ((cycle * CYCLE_SHIFT_STEP) % n + n) % n;
  const idx = (((raw % n) + n) % n + cycleShift) % n;
  return PALETTE_ORDER[idx];
}
