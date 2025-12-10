const express = require("express");
const cors = require("cors");
const pool = require("./db");
const sessionRoutes = require("./routes/sessionRoutes");
const bookingRoutes = require("./routes/bookingRoutes");


const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/sessions", sessionRoutes);
app.use("/api/bookings", bookingRoutes);


// base test route
app.get("/", (req, res) => {
  res.send({ message: "Stretch backend running" });
});

app.get("/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      ok: true,
      now: result.rows[0].now,
    });
  } catch (err) {
    console.error("DB test error:", err);
    res.status(500).json({
      ok: false,
      error: "Database connection failed",
    });
  }
});

module.exports = app;
