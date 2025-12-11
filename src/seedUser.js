// stretch-backend/src/seedUser.js
require('dotenv').config();
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const email = 'test@example.com';
    const name = 'Test User';
    const password = 'password123'; // change if you want

    // check existing
    const exists = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (exists.rows.length) {
      console.log('User already exists:', email);
      await pool.end();
      return;
    }

    const hash = await bcrypt.hash(password, 10);
    const r = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1,$2,$3) RETURNING id, email',
      [name, email, hash]
    );
    console.log('Created test user:', r.rows[0]);
  } catch (err) {
    console.error('Seed error', err);
  } finally {
    await pool.end();
  }
})();
