require('dotenv').config();
const { query, pool } = require('../config/database');

const migrate = async () => {
  console.log('🚀 Running database migrations on AWS RDS...');
  try {
    // Users / Sessions table
    await query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_token VARCHAR(255) UNIQUE NOT NULL,
        candidate_name VARCHAR(255),
        experience_level VARCHAR(20) NOT NULL CHECK (experience_level IN ('fresher', 'mid', 'senior')),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
        total_questions INTEGER DEFAULT 7,
        answered_count INTEGER DEFAULT 0,
        correct_count INTEGER DEFAULT 0,
        score_percentage DECIMAL(5,2) DEFAULT 0,
        started_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Created: sessions table');

    // Questions table — stores generated questions
    await query(`
      CREATE TABLE IF NOT EXISTS questions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
        question_number INTEGER NOT NULL,
        topic VARCHAR(255) NOT NULL,
        question_text TEXT NOT NULL,
        option_a TEXT NOT NULL,
        option_b TEXT NOT NULL,
        option_c TEXT NOT NULL,
        correct_answer CHAR(1) NOT NULL CHECK (correct_answer IN ('A','B','C')),
        explanation TEXT,
        wrong_note TEXT,
        experience_level VARCHAR(20) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Created: questions table');

    // Answers table — stores user answers
    await query(`
      CREATE TABLE IF NOT EXISTS answers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
        question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
        chosen_answer CHAR(1) NOT NULL CHECK (chosen_answer IN ('A','B','C')),
        is_correct BOOLEAN NOT NULL,
        time_taken_ms INTEGER,
        answered_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Created: answers table');

    // Leaderboard view
    await query(`
      CREATE OR REPLACE VIEW leaderboard AS
      SELECT
        s.id,
        s.candidate_name,
        s.experience_level,
        s.correct_count,
        s.total_questions,
        s.score_percentage,
        s.completed_at,
        RANK() OVER (
          PARTITION BY s.experience_level
          ORDER BY s.score_percentage DESC, s.completed_at ASC
        ) AS rank
      FROM sessions s
      WHERE s.status = 'completed'
        AND s.candidate_name IS NOT NULL
      ORDER BY s.experience_level, s.score_percentage DESC;
    `);
    console.log('✅ Created: leaderboard view');

    // Indexes for performance
    await query(`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_sessions_level ON sessions(experience_level);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_questions_session ON questions(session_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_answers_session ON answers(session_id);`);
    console.log('✅ Created: indexes');

    // Updated_at trigger
    await query(`
      CREATE OR REPLACE FUNCTION update_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
      $$ LANGUAGE plpgsql;
    `);
    await query(`
      DROP TRIGGER IF EXISTS sessions_updated_at ON sessions;
      CREATE TRIGGER sessions_updated_at
        BEFORE UPDATE ON sessions
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    `);
    console.log('✅ Created: triggers');

    console.log('\n🎉 All migrations completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

migrate();
