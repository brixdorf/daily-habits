const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/notes
router.get('/', (req, res) => {
  const notes = db.prepare('SELECT * FROM notes ORDER BY created_at DESC').all();
  res.json(notes);
});

// POST /api/notes
router.post('/', (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: 'content required' });

  const info = db.prepare('INSERT INTO notes (content) VALUES (?)').run(content.trim());
  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(note);
});

module.exports = router;
