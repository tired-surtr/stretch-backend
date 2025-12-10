const express = require("express");
const pool = require("../db");

const router = express.Router();

// POST /api/sessions - create a new session
router.post("/", async (req, res) => {
  const {
    title,
    description,
    session_date,
    start_time,
    duration_minutes,
    capacity,
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO sessions
        (title, description, session_date, start_time, duration_minutes, capacity)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        title,
        description,
        session_date,
        start_time,
        duration_minutes,
        capacity,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating session:", err);
    res.status(500).json({ message: "Failed to create session" });
  }
});

// GET /api/sessions - list all sessions
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         id,
         title,
         description,
         session_date,
         start_time,
         duration_minutes,
         capacity,
         created_at
       FROM sessions
       ORDER BY session_date, start_time`
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching sessions:", err);
    res.status(500).json({ message: "Failed to fetch sessions" });
  }
});

// GET /api/sessions/:id - get one session with booked seats
router.get("/:id", async (req, res) => {
  const sessionId = req.params.id;

  try {
    const sessionResult = await pool.query(
      `SELECT
         id,
         title,
         description,
         session_date,
         start_time,
         duration_minutes,
         capacity,
         created_at
       FROM sessions
       WHERE id = $1`,
      [sessionId]
    );

    if (sessionResult.rowCount === 0) {
      return res.status(404).json({ message: "Session not found" });
    }

    const bookingResult = await pool.query(
      `SELECT seat_number
       FROM bookings
       WHERE session_id = $1
         AND status IN ('PENDING', 'CONFIRMED')
       ORDER BY seat_number`,
      [sessionId]
    );

    const bookedSeats = bookingResult.rows.map((row) => row.seat_number);

    const session = sessionResult.rows[0];

    res.json({
      ...session,
      bookedSeats,
    });
  } catch (err) {
    console.error("Error fetching session:", err);
    res.status(500).json({ message: "Failed to fetch session" });
  }
});

module.exports = router;
