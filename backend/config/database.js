const { Pool } = require('pg');

const isProduction = process.env.NODE_ENV === 'production';

const poolConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

// Enable SSL for AWS RDS
if (process.env.DB_SSL === 'true' || isProduction) {
  poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(poolConfig);

pool.on('connect', () => {
  console.log('✅ Connected to AWS RDS PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ RDS Pool error:', err.message);
});

const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log(`📝 Query [${duration}ms]:`, text.slice(0, 80));
    }
    return res;
  } catch (err) {
    console.error('❌ Query error:', err.message);
    throw err;
  }
};

const getClient = () => pool.connect();

module.exports = { query, getClient, pool };
