const express = require("express");
const cors = require("cors");
const pool = require("./db");
const sessionRoutes = require("./routes/sessionRoutes");
const bookingRoutes = require("./routes/bookingRoutes");

const app = express();

/**
 * CORS configuration
 * FRONTEND_URL must be set in your environment:
 *   https://stretch-frontend.vercel.app
 * (or multiple origins as comma-separated values)
 */
const rawFrontend = process.env.FRONTEND_URL || "";
const allowedOrigins = rawFrontend
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// dynamic CORS origin handler
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS: " + origin));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json());

// routes
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
