// stretch-backend/src/seedAdmin.js
require('dotenv').config();
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const email = 'admin@example.com';
    const name = 'Admin User';
    const password = 'adminpass123'; // change if you want

    // check existing
    const exists = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (exists.rows.length) {
      // ensure role is ADMIN
      await pool.query('UPDATE users SET role = $1 WHERE email=$2', ['ADMIN', email]);
      console.log('Admin already exists; ensured role=ADMIN for', email);
      await pool.end();
      return;
    }

    const hash = await bcrypt.hash(password, 10);
    const r = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id, email, role',
      [name, email, hash, 'ADMIN']
    );
    console.log('Created admin user:', r.rows[0], 'password:', password);
  } catch (err) {
    console.error('Seed admin error', err);
  } finally {
    await pool.end();
  }
})();
