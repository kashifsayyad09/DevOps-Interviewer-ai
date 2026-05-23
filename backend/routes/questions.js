const express = require('express');
const router = express.Router();
const Joi = require('joi');
const db = require('../config/database');
const { generateQuestion } = require('../services/geminiService');

// POST /api/questions/generate — generate next question via Gemini
router.post('/generate', async (req, res) => {
  const schema = Joi.object({
    session_token: Joi.string().uuid().required(),
    question_number: Joi.number().integer().min(1).max(7).required()
  });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    // Fetch session
    const sessionRes = await db.query(
      `SELECT id, experience_level, status FROM sessions WHERE session_token = $1`,
      [value.session_token]
    );
    if (!sessionRes.rows.length) return res.status(404).json({ error: 'Session not found' });
    const session = sessionRes.rows[0];
    if (session.status === 'completed') return res.status(400).json({ error: 'Session already completed' });

    // Get previous topics to avoid repetition
    const topicsRes = await db.query(
      `SELECT topic FROM questions WHERE session_id = $1 ORDER BY question_number ASC`,
      [session.id]
    );
    const previousTopics = topicsRes.rows.map(r => r.topic);

    // Generate via Gemini
    const q = await generateQuestion(session.experience_level, value.question_number, previousTopics);

    // Save question to RDS
    const saved = await db.query(
      `INSERT INTO questions 
        (session_id, question_number, topic, question_text, option_a, option_b, option_c, correct_answer, explanation, wrong_note, experience_level)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING id, question_number, topic, question_text, option_a, option_b, option_c, correct_answer, explanation, wrong_note`,
      [session.id, value.question_number, q.topic, q.question,
       q.options.A, q.options.B, q.options.C,
       q.correct, q.explanation, q.wrong_note, session.experience_level]
    );

    const row = saved.rows[0];
    res.json({
      success: true,
      question: {
        id: row.id,
        number: row.question_number,
        topic: row.topic,
        question: row.question_text,
        options: { A: row.option_a, B: row.option_b, C: row.option_c },
        // correct_answer intentionally NOT sent to frontend
      }
    });
  } catch (err) {
    console.error('Generate question error:', err.message);
    if (err.response?.status === 400) return res.status(400).json({ error: 'Invalid Gemini API key' });
    if (err.response?.status === 429) return res.status(429).json({ error: 'Gemini rate limit exceeded. Try again shortly.' });
    res.status(500).json({ error: 'Failed to generate question' });
  }
});

// GET /api/questions/session/:token — all questions for a session
router.get('/session/:token', async (req, res) => {
  try {
    const sessionRes = await db.query(
      `SELECT id FROM sessions WHERE session_token = $1`, [req.params.token]
    );
    if (!sessionRes.rows.length) return res.status(404).json({ error: 'Session not found' });

    const result = await db.query(
      `SELECT id, question_number, topic, question_text, option_a, option_b, option_c
       FROM questions WHERE session_id = $1 ORDER BY question_number ASC`,
      [sessionRes.rows[0].id]
    );
    res.json({ success: true, questions: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

module.exports = router;
