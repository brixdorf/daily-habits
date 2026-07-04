const express = require("express");
const router = express.Router();
const db = require("../db");

const COLORS = [
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f97316",
  "#14b8a6",
  "#6366f1",
];

function nextColor() {
  const used = db
    .prepare("SELECT color FROM habits")
    .all()
    .map((r) => r.color);
  return (
    COLORS.find((c) => !used.includes(c)) ?? COLORS[used.length % COLORS.length]
  );
}

// GET /api/habits?month=YYYY-MM
router.get("/", (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const habits = db.prepare("SELECT * FROM habits ORDER BY created_at").all();

  const checks = db
    .prepare(
      "SELECT habit_id, date FROM habit_checks WHERE date LIKE ? ORDER BY date",
    )
    .all(`${month}%`);

  const checkMap = {};
  for (const c of checks) {
    if (!checkMap[c.habit_id]) checkMap[c.habit_id] = new Set();
    checkMap[c.habit_id].add(c.date);
  }

  const result = habits.map((h) => ({
    ...h,
    checkedDates: [...(checkMap[h.id] ?? [])],
    achieved: (checkMap[h.id] ?? new Set()).size,
  }));

  res.json(result);
});

// POST /api/habits
router.post("/", (req, res) => {
  const { name, goal } = req.body;
  if (!name || !goal)
    return res.status(400).json({ error: "name and goal required" });

  const color = nextColor();
  const info = db
    .prepare("INSERT INTO habits (name, goal, color) VALUES (?, ?, ?)")
    .run(name.trim(), parseInt(goal, 10), color);
  const habit = db
    .prepare("SELECT * FROM habits WHERE id = ?")
    .get(info.lastInsertRowid);
  res.status(201).json(habit);
});

// POST /api/habits/:id/toggle
router.post("/:id/toggle", (req, res) => {
  const habitId = parseInt(req.params.id, 10);
  const { date } = req.body;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: "date must be YYYY-MM-DD" });
  }

  const existing = db
    .prepare("SELECT id FROM habit_checks WHERE habit_id = ? AND date = ?")
    .get(habitId, date);
  if (existing) {
    db.prepare("DELETE FROM habit_checks WHERE id = ?").run(existing.id);
    res.json({ checked: false });
  } else {
    db.prepare("INSERT INTO habit_checks (habit_id, date) VALUES (?, ?)").run(
      habitId,
      date,
    );
    res.json({ checked: true });
  }
});

// DELETE /api/habits/:id
router.delete("/:id", (req, res) => {
  const habitId = parseInt(req.params.id, 10);
  const habit = db.prepare("SELECT id FROM habits WHERE id = ?").get(habitId);
  if (!habit) return res.status(404).json({ error: "habit not found" });
  db.prepare("DELETE FROM habits WHERE id = ?").run(habitId);
  res.json({ deleted: true });
});

module.exports = router;
