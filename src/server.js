require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();

/**
 * CORS configuration
 * - FRONTEND_URL should be set on your host (Render) to: https://stretch-front-end.vercel.app
 *   or to a comma-separated list of allowed origins.
 * - We echo back the Origin only when it is in the allowed list.
 * - credentials: true allows cookies to be sent (if you later set cookies).
 */
const rawFrontend = process.env.FRONTEND_URL || '';
const allowedOrigins = rawFrontend
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// Dynamic origin check: allow if origin is in whitelist, allow no-origin (curl, mobile), block otherwise.
const corsOptions = {
  origin: function (origin, callback) {
    // allow server-to-server requests or tools with no origin
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS: ' + origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
};

app.use(cors(corsOptions));
app.options('/*', cors(corsOptions)); // handle preflight
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';
// Default to 5000 (matches what you've been running)
const PORT = process.env.PORT || 5000;

/** --- helpers --- */
function generateToken(user) {
  // include role for convenience
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: 'Missing auth header' });
  const parts = header.split(' ');
  if (parts.length !== 2) return res.status(401).json({ message: 'Invalid auth header' });
  const token = parts[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

/**
 * isAdmin middleware
 * Requires authMiddleware to run first so req.user exists.
 * Checks user's role in DB and rejects if not ADMIN.
 */
async function isAdmin(req, res, next) {
  try {
    if (!req.user || !req.user.id) return res.status(401).json({ message: 'Missing auth' });
    const r = await db.query('SELECT role FROM users WHERE id=$1', [req.user.id]);
    const role = (r.rows[0]?.role || 'USER').toString().toUpperCase();
    if (role !== 'ADMIN') return res.status(403).json({ message: 'Admin access required' });
    return next();
  } catch (err) {
    console.error('isAdmin check error', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/** --- auth --- */

// register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'email and password required' });

    const exists = await db.query('SELECT id FROM users WHERE email=$1', [email]);
    if (exists.rows.length) return res.status(400).json({ message: 'Email already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, created_at, role',
      [name || null, email, hashed]
    );
    const user = result.rows[0];
    // return created user (no token) — frontend may call login automatically
    return res.status(201).json({ ok: true, user });
  } catch (err) {
    console.error('register error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// login (returns role)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('LOGIN ATTEMPT:', { email }); // do NOT log the password
    if (!email || !password) return res.status(400).json({ message: 'email and password required' });

    // include role in the query
    const r = await db.query('SELECT id, name, email, password_hash, role FROM users WHERE email=$1', [email]);
    if (!r.rows.length) {
      console.log('LOGIN: user not found for email', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = r.rows[0];
    console.log('LOGIN: user row found, id=', user.id, 'role=', user.role);

    const ok = await bcrypt.compare(password, user.password_hash);
    console.log('LOGIN: bcrypt compare result for', email, '=', ok);

    if (!ok) {
      console.log('LOGIN FAILED FOR EMAIL:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user);
    console.log('LOGIN SUCCESS:', { id: user.id, email: user.email, role: user.role });

    // return token + minimal user object including role
    return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role || 'USER' } });
  } catch (err) {
    console.error('login error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/** --- sessions --- */

// list sessions
app.get('/api/sessions', async (req, res) => {
  try {
    const r = await db.query('SELECT id, title, description, session_date, start_time, duration_minutes, capacity FROM sessions ORDER BY session_date, start_time');
    return res.json(r.rows);
  } catch (err) {
    console.error('fetch sessions', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// create session (ADMIN only)
app.post('/api/sessions', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { title, description, session_date, start_time, duration_minutes, capacity } = req.body;
    if (!title || !session_date || !start_time || !capacity) {
      return res.status(400).json({ message: 'title, session_date, start_time and capacity are required' });
    }

    const r = await db.query(
      `INSERT INTO sessions (title, description, session_date, start_time, duration_minutes, capacity)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, title, description, session_date, start_time, duration_minutes, capacity`,
      [title, description || null, session_date, start_time, duration_minutes || 60, capacity]
    );

    return res.status(201).json(r.rows[0]);
  } catch (err) {
    console.error('create session error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// session by id + compute booked seats
app.get('/api/sessions/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const s = await db.query('SELECT id, title, description, session_date, start_time, duration_minutes, capacity FROM sessions WHERE id=$1', [id]);
    if (!s.rows.length) return res.status(404).json({ message: 'Session not found' });

    const session = s.rows[0];
    const bs = await db.query('SELECT seat_number FROM bookings WHERE session_id=$1', [id]);
    const bookedSeats = bs.rows.map(r => r.seat_number);
    return res.json({ ...session, bookedSeats });
  } catch (err) {
    console.error('fetch session by id', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/** --- bookings (protected) --- */

// create booking
app.post('/api/bookings', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { session_id, seat_number } = req.body;
    if (!session_id || !seat_number) return res.status(400).json({ message: 'session_id and seat_number required' });

    const exists = await db.query('SELECT id FROM bookings WHERE session_id=$1 AND seat_number=$2', [session_id, seat_number]);
    if (exists.rows.length) {
      return res.status(409).json({ status: 'FAILED', message: 'Seat already booked' });
    }

    const insert = await db.query(
      'INSERT INTO bookings (user_id, session_id, seat_number, status) VALUES ($1,$2,$3,$4) RETURNING id, user_id, session_id, seat_number, status, created_at',
      [userId, session_id, seat_number, 'CONFIRMED']
    );

    return res.json({ status: 'CONFIRMED', booking: insert.rows[0] });
  } catch (err) {
    console.error('create booking', err);
    return res.status(500).json({ status: 'FAILED', message: 'Server error' });
  }
});

// get bookings for current user
app.get('/api/bookings', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const r = await db.query(
      `SELECT b.id, b.session_id, b.seat_number, b.status, b.created_at,
              json_build_object('id', s.id, 'title', s.title, 'session_date', s.session_date::text, 'start_time', s.start_time::text) as session
       FROM bookings b
       JOIN sessions s ON s.id = b.session_id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC`,
      [userId]
    );
    return res.json(r.rows);
  } catch (err) {
    console.error('fetch user bookings', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/** --- start --- */
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
