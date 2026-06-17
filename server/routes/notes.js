const express = require("express");
const router = express.Router();
const db = require("../db");

// GET /api/notes?month=YYYY-MM
router.get("/", (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const notes = db
    .prepare(
      "SELECT * FROM notes WHERE strftime('%Y-%m', created_at) = ? ORDER BY created_at DESC",
    )
    .all(month);
  res.json(notes);
});

// POST /api/notes
router.post("/", (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim())
    return res.status(400).json({ error: "content required" });

  const info = db
    .prepare("INSERT INTO notes (content) VALUES (?)")
    .run(content.trim());
  const note = db
    .prepare("SELECT * FROM notes WHERE id = ?")
    .get(info.lastInsertRowid);
  res.status(201).json(note);
});

module.exports = router;
