const express = require('express');
const router = express.Router();
const Joi = require('joi');
const db = require('../config/database');

// POST /api/answers — submit an answer
router.post('/', async (req, res) => {
  const schema = Joi.object({
    session_token: Joi.string().uuid().required(),
    question_id: Joi.string().uuid().required(),
    chosen_answer: Joi.string().valid('A', 'B', 'C').required(),
    time_taken_ms: Joi.number().integer().min(0).optional()
  });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    // Verify session
    const sessionRes = await db.query(
      `SELECT id, status FROM sessions WHERE session_token = $1`,
      [value.session_token]
    );
    if (!sessionRes.rows.length) return res.status(404).json({ error: 'Session not found' });
    const session = sessionRes.rows[0];
    if (session.status === 'completed') return res.status(400).json({ error: 'Session already completed' });

    // Check answer already submitted
    const existingRes = await db.query(
      `SELECT id FROM answers WHERE session_id = $1 AND question_id = $2`,
      [session.id, value.question_id]
    );
    if (existingRes.rows.length) return res.status(409).json({ error: 'Answer already submitted for this question' });

    // Get correct answer from DB (server-side verification)
    const qRes = await db.query(
      `SELECT correct_answer, explanation, wrong_note, option_a, option_b, option_c, topic
       FROM questions WHERE id = $1 AND session_id = $2`,
      [value.question_id, session.id]
    );
    if (!qRes.rows.length) return res.status(404).json({ error: 'Question not found' });
    const q = qRes.rows[0];

    const isCorrect = value.chosen_answer === q.correct_answer;

    // Save answer
    await db.query(
      `INSERT INTO answers (session_id, question_id, chosen_answer, is_correct, time_taken_ms)
       VALUES ($1,$2,$3,$4,$5)`,
      [session.id, value.question_id, value.chosen_answer, isCorrect, value.time_taken_ms || null]
    );

    // Update session counts
    await db.query(
      `UPDATE sessions SET 
        answered_count = answered_count + 1,
        correct_count = correct_count + $1,
        updated_at = NOW()
       WHERE id = $2`,
      [isCorrect ? 1 : 0, session.id]
    );

    // Return feedback with correct answer revealed
    const options = { A: q.option_a, B: q.option_b, C: q.option_c };
    res.json({
      success: true,
      feedback: {
        is_correct: isCorrect,
        correct_answer: q.correct_answer,
        correct_text: options[q.correct_answer],
        chosen_answer: value.chosen_answer,
        explanation: q.explanation,
        wrong_note: q.wrong_note,
        topic: q.topic
      }
    });
  } catch (err) {
    console.error('Submit answer error:', err.message);
    res.status(500).json({ error: 'Failed to submit answer' });
  }
});

module.exports = router;
