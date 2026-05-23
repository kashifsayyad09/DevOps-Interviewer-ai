const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/leaderboard — top scores per level
router.get('/', async (req, res) => {
  const level = req.query.level; // optional filter
  try {
    let queryText = `
      SELECT candidate_name, experience_level, correct_count, total_questions,
             score_percentage, completed_at, rank
      FROM leaderboard
    `;
    const params = [];
    if (level && ['fresher','mid','senior'].includes(level)) {
      queryText += ` WHERE experience_level = $1`;
      params.push(level);
    }
    queryText += ` ORDER BY experience_level, rank LIMIT 30`;

    const result = await db.query(queryText, params);
    res.json({ success: true, leaderboard: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// GET /api/leaderboard/stats — aggregate stats
router.get('/stats', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'completed') AS total_completed,
        COUNT(*) FILTER (WHERE status = 'active') AS total_active,
        ROUND(AVG(score_percentage) FILTER (WHERE status = 'completed'), 1) AS avg_score,
        COUNT(*) FILTER (WHERE status = 'completed' AND experience_level = 'fresher') AS fresher_count,
        COUNT(*) FILTER (WHERE status = 'completed' AND experience_level = 'mid') AS mid_count,
        COUNT(*) FILTER (WHERE status = 'completed' AND experience_level = 'senior') AS senior_count,
        ROUND(AVG(score_percentage) FILTER (WHERE status = 'completed' AND experience_level = 'fresher'), 1) AS fresher_avg,
        ROUND(AVG(score_percentage) FILTER (WHERE status = 'completed' AND experience_level = 'mid'), 1) AS mid_avg,
        ROUND(AVG(score_percentage) FILTER (WHERE status = 'completed' AND experience_level = 'senior'), 1) AS senior_avg
      FROM sessions
    `);
    res.json({ success: true, stats: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
