const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const db = require('../config/database');

// POST /api/sessions — start a new interview session
router.post('/', async (req, res) => {
  const schema = Joi.object({
    candidate_name: Joi.string().min(2).max(100).optional(),
    experience_level: Joi.string().valid('fresher', 'mid', 'senior').required()
  });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const token = uuidv4();
    const result = await db.query(
      `INSERT INTO sessions (session_token, candidate_name, experience_level, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, session_token, candidate_name, experience_level, status, total_questions, answered_count, correct_count, started_at`,
      [token, value.candidate_name || null, value.experience_level,
       req.ip, req.headers['user-agent']]
    );
    res.status(201).json({ success: true, session: result.rows[0] });
  } catch (err) {
    console.error('Create session error:', err.message);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// GET /api/sessions/:token — get session details
router.get('/:token', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.*, 
        (SELECT COUNT(*) FROM questions q WHERE q.session_id = s.id) as questions_generated
       FROM sessions s WHERE s.session_token = $1`,
      [req.params.token]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Session not found' });
    res.json({ success: true, session: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// PATCH /api/sessions/:token/complete — mark session complete
router.patch('/:token/complete', async (req, res) => {
  try {
    const sessionRes = await db.query(
      `SELECT id, correct_count, total_questions FROM sessions WHERE session_token = $1`,
      [req.params.token]
    );
    if (!sessionRes.rows.length) return res.status(404).json({ error: 'Session not found' });

    const { id, correct_count, total_questions } = sessionRes.rows[0];
    const score = parseFloat(((correct_count / total_questions) * 100).toFixed(2));

    const result = await db.query(
      `UPDATE sessions SET status='completed', completed_at=NOW(), score_percentage=$1
       WHERE id=$2
       RETURNING id, session_token, candidate_name, experience_level, correct_count, total_questions, score_percentage, completed_at`,
      [score, id]
    );
    res.json({ success: true, session: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to complete session' });
  }
});

// GET /api/sessions/:token/history — full session with questions & answers
router.get('/:token/history', async (req, res) => {
  try {
    const sessionRes = await db.query(
      `SELECT * FROM sessions WHERE session_token = $1`, [req.params.token]
    );
    if (!sessionRes.rows.length) return res.status(404).json({ error: 'Session not found' });
    const session = sessionRes.rows[0];

    const questionsRes = await db.query(
      `SELECT q.*, a.chosen_answer, a.is_correct, a.time_taken_ms
       FROM questions q
       LEFT JOIN answers a ON a.question_id = q.id
       WHERE q.session_id = $1
       ORDER BY q.question_number ASC`,
      [session.id]
    );

    res.json({ success: true, session, questions: questionsRes.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

module.exports = router;
