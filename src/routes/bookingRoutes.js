const express = require("express");
const pool = require("../db");

const router = express.Router();

// POST /api/bookings - book a single seat for a session
router.post("/", async (req, res) => {
  const { session_id, seat_number } = req.body;

  if (!session_id || !seat_number) {
    return res.status(400).json({ message: "session_id and seat_number are required" });
  }

  try {
    // Use a transaction
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Optional: lock session row to be extra safe
      const sessionResult = await client.query(
        "SELECT id, capacity FROM sessions WHERE id = $1 FOR UPDATE",
        [session_id]
      );

      if (sessionResult.rowCount === 0) {
        await client.query("ROLLBACK");
        client.release();
        return res.status(404).json({ message: "Session not found" });
      }

      const session = sessionResult.rows[0];

      if (seat_number < 1 || seat_number > session.capacity) {
        await client.query("ROLLBACK");
        client.release();
        return res.status(400).json({ message: "Invalid seat number for this session" });
      }

      // Try to insert booking
      const bookingResult = await client.query(
        `INSERT INTO bookings (session_id, seat_number, status)
         VALUES ($1, $2, 'CONFIRMED')
         RETURNING *`,
        [session_id, seat_number]
      );

      await client.query("COMMIT");
      client.release();

      return res.status(201).json({
        status: "CONFIRMED",
        booking: bookingResult.rows[0],
      });
    } catch (err) {
      await client.query("ROLLBACK");
      client.release();

      // Unique constraint violation => seat already taken
      if (err.code === "23505") {
        return res.status(409).json({
          status: "FAILED",
          message: "Seat already booked",
        });
      }

      console.error("Error creating booking:", err);
      return res.status(500).json({ message: "Failed to create booking" });
    }
  } catch (err) {
    console.error("Error acquiring client:", err);
    return res.status(500).json({ message: "Failed to acquire database connection" });
  }
});

// GET /api/bookings - optional: filter by session_id
router.get("/", async (req, res) => {
  const { session_id } = req.query;

  try {
    let result;
    if (session_id) {
      result = await pool.query(
        `SELECT id, session_id, seat_number, status, created_at, updated_at
         FROM bookings
         WHERE session_id = $1
         ORDER BY seat_number`,
        [session_id]
      );
    } else {
      result = await pool.query(
        `SELECT id, session_id, seat_number, status, created_at, updated_at
         FROM bookings
         ORDER BY created_at DESC`
      );
    }

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching bookings:", err);
    res.status(500).json({ message: "Failed to fetch bookings" });
  }
});

module.exports = router;
