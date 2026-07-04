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

// DELETE /api/notes/:id
router.delete("/:id", (req, res) => {
  const noteId = parseInt(req.params.id, 10);
  const note = db.prepare("SELECT id FROM notes WHERE id = ?").get(noteId);
  if (!note) return res.status(404).json({ error: "note not found" });
  db.prepare("DELETE FROM notes WHERE id = ?").run(noteId);
  res.json({ deleted: true });
});

module.exports = router;
