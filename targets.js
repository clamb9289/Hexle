// Backlog of daily target colors for testing. Cycles in order, one per day.
// Each must exactly match a {name, hex} pair in colors-data.js.
// Replace/expand this list any time — order determines the daily rotation.
const TARGET_BACKLOG = [
  { name: "Shiner", hex: "#733E98" },
  { name: "Kakitsubata Blue", hex: "#4264AD" },
  { name: "Panorama Blue", hex: "#39C0C3" },
  { name: "Magenta Memoir", hex: "#B3569F" },
  { name: "Beachside Drive", hex: "#AADBDE" },
  { name: "Bloodthirsty Warlock", hex: "#EE1F3C" },
  { name: "October Haze", hex: "#F8AD8D" },
  { name: "Ultra Green", hex: "#7ABF43" },
  { name: "Flame Orange", hex: "#F78F21" },
  { name: "Pika Yellow", hex: "#EBE92A" }
];

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

// Easy and Hard get their own daily color, not a shared one -- offsetting
// Hard's index by half the backlog guarantees they're never the same color
// on the same day, while both stay fully deterministic per (date, mode).
function getTodayTarget(date = new Date(), mode = "easy") {
  const n = TARGET_BACKLOG.length;
  const offset = mode === "hard" ? Math.floor(n / 2) : 0;
  const idx = (((daysSinceEpoch(date) + offset) % n) + n) % n;
  return TARGET_BACKLOG[idx];
}
