require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security & Middleware ───────────────────────────────────────────────────
app.use(helmet());
app.use(morgan('combined'));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// CORS
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait before trying again.' }
});

// Stricter limiter for AI generation
const generateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Question generation rate limit reached. Please wait 1 minute.' }
});

app.use('/api', limiter);

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/questions', generateLimiter, require('./routes/questions'));
app.use('/api/answers', require('./routes/answers'));
app.use('/api/leaderboard', require('./routes/leaderboard'));

// Health check — also verifies RDS connection
app.get('/health', async (req, res) => {
  try {
    const { query } = require('./config/database');
    const result = await query('SELECT NOW() as time, version() as pg_version');
    res.json({
      status: 'healthy',
      server: 'DevOps Interviewer API',
      database: 'connected',
      db_time: result.rows[0].time,
      pg_version: result.rows[0].pg_version.split(' ')[0],
      environment: process.env.NODE_ENV,
      uptime: Math.floor(process.uptime()) + 's'
    });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', database: 'disconnected', error: err.message });
  }
});

// API info
app.get('/api', (req, res) => {
  res.json({
    name: 'DevOps Interviewer API',
    version: '1.0.0',
    endpoints: {
      sessions: {
        'POST /api/sessions': 'Create a new interview session',
        'GET /api/sessions/:token': 'Get session details',
        'PATCH /api/sessions/:token/complete': 'Mark session as completed',
        'GET /api/sessions/:token/history': 'Get full session history'
      },
      questions: {
        'POST /api/questions/generate': 'Generate next question via Gemini AI',
        'GET /api/questions/session/:token': 'Get all questions for a session'
      },
      answers: {
        'POST /api/answers': 'Submit answer and get feedback'
      },
      leaderboard: {
        'GET /api/leaderboard': 'Get top scores (optional ?level=fresher|mid|senior)',
        'GET /api/leaderboard/stats': 'Get aggregate statistics'
      }
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error', message: process.env.NODE_ENV === 'development' ? err.message : undefined });
});

// ─── Start Server ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 DevOps Interviewer API running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV}`);
  console.log(`🗄️  RDS Host: ${process.env.DB_HOST}`);
  console.log(`🤖 Gemini Model: ${process.env.GEMINI_MODEL || 'gemini-1.5-flash'}`);
  console.log(`\n📖 API Docs: http://localhost:${PORT}/api`);
  console.log(`❤️  Health:   http://localhost:${PORT}/health\n`);
});

module.exports = app;
