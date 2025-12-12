# 🚀 Stretch Backend (Node.js + Express + PostgreSQL)

This is the backend API for **Stretch**, a physiotherapy session booking platform. It provides secure authentication, admin-only session management, and user seat bookings with database-level integrity.

The backend is deployed on **Render**, uses **Neon PostgreSQL**, and communicates with the React frontend via RESTful JSON APIs.

---

## 📌 Features

### 🔐 Authentication

* Email + password login
* Password hashing with **bcrypt**
* JWT-based authentication
* Role-based access (`ADMIN`, `USER`)
* Token restored automatically by frontend via localStorage

### 📅 Sessions Management

* Fetch all sessions
* Fetch single session
* Admin-only session creation
* Includes real-time computed `bookedSeats`

### 🎫 Booking System

* Secure seat booking per session
* Double-booking prevented by DB unique constraints
* User booking history with session metadata
* Protected endpoints requiring `Authorization: Bearer <token>`

### 🗄 Database

* PostgreSQL (NeonDB)
* Tables: `users`, `sessions`, `bookings`
* Included schema + sample seed data in `migrations.sql`
* Full database backup in `stretch_backup.sql`

---

## 🏗 Tech Stack

| Layer          | Technology           |
| -------------- | -------------------- |
| Runtime        | Node.js              |
| Framework      | Express.js           |
| Database       | PostgreSQL (Neon)    |
| Authentication | JWT + bcrypt         |
| Hosting        | Render               |
| ORM            | Raw SQL (pg package) |

---

# 📂 Project Structure

```
stretch-backend/
│
├── src/
│   ├── server.js          # Main Express app
│   ├── db.js              # PostgreSQL connection pool
│   ├── routes/            # Route handlers (optional folder)
│
├── migrations.sql         # Schema & seed data
├── stretch_backup.sql     # Database dump for submission
│
├── package.json
├── .env.example
└── README.md
```

---

# ⚙️ Environment Variables

Create a `.env` file from `.env.example`:

```
DATABASE_URL=postgresql://<user>:<password>@<host>/<db>?sslmode=require
JWT_SECRET=your_jwt_secret
FRONTEND_URL=https://stretch-frontend.vercel.app
PORT=5000
```

> 🔒 **Do NOT commit real secrets**.

---

# 🛠 Running Locally

### 1. Install dependencies

```bash
npm install
```

### 2. Create `.env`

```bash
cp .env.example .env
```

### 3. Start development server

```bash
npm run dev
```

The backend runs at:

```
http://localhost:5000
```

---

# 🌐 Deployed API (Production)

Backend URL:

```
https://stretch-backend.onrender.com
```

All API routes start with `/api`.

Example:

```
GET https://stretch-backend.onrender.com/api/sessions
```

---

# 📡 REST API Overview

### 🔑 Authentication

| Method | Endpoint             | Description                       |
| ------ | -------------------- | --------------------------------- |
| POST   | `/api/auth/register` | Register new user                 |
| POST   | `/api/auth/login`    | Login → returns `{ token, user }` |

---

### 📅 Sessions

| Method | Endpoint            | Auth   | Description                       |
| ------ | ------------------- | ------ | --------------------------------- |
| GET    | `/api/sessions`     | Public | List all sessions                 |
| GET    | `/api/sessions/:id` | Public | Session details with booked seats |
| POST   | `/api/sessions`     | Admin  | Create new session                |

---

### 🎫 Bookings

| Method | Endpoint        | Auth | Description     |
| ------ | --------------- | ---- | --------------- |
| POST   | `/api/bookings` | User | Book a seat     |
| GET    | `/api/bookings` | User | Booking history |

---

# 🔒 Security Highlights

* CORS restricted to Vercel frontend
* All modifying routes require JWT authentication
* Admin routes require DB-role check
* Passwords hashed with bcrypt (salt rounds = 10)
* Double-booking prevented by SQL constraint

---

# 🧪 Testing

### Test auth:

```bash
curl -X POST https://stretch-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

### Test sessions:

```bash
curl https://stretch-backend.onrender.com/api/sessions
```

### Test booking:

```bash
curl -X POST https://stretch-backend.onrender.com/api/bookings \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"session_id":1,"seat_number":3}'
```

---

# 🚀 Deployment (Render)

1. Connect GitHub repo → stretch-backend
2. Set environment variables (see `.env.example`)
3. Deploy (Render will run `npm install` and `npm start`)
4. Verify `/api/sessions` returns 200

---

If you'd like, I can also generate a shorter `README_PROD.md` focusing only on env vars and deployment steps.
