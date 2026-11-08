# Sweety – Blood Glucose Tracker

A small MERN-style (React, Express, PostgreSQL) app for recording up to four daily glucose readings and reviewing reports.

## Requirements

- Node.js 20+
- Docker with Docker Compose, or a local PostgreSQL database

## Setup

### Run the full stack with Docker

From the repository root, copy `.env.example` to `.env`, replace `JWT_SECRET`, then run `docker compose up --build`. This starts PostgreSQL, Redis, the API, the React/Vite frontend, and the daily reminder worker. It also seeds the demo patient and doctor. Open http://localhost:5173. Stop with `docker compose down`; persistent PostgreSQL data remains in the `pgdata` volume.

PostgreSQL is published on host port 5433 to avoid conflicts with local PostgreSQL services; containers use the internal `db:5432` address.

The demo patient is `demo@sweety.local` / `SweetyDemo123!`; the demo doctor is `doctor@sweety.local` / `SweetyDoctor123!`. The doctor can view the seeded patient and assign other registered patient accounts by email.

### Run services locally

1. Start PostgreSQL with `docker compose up -d db redis` from the repository root. It creates the `sweety` database and applies `database/database/schema.sql` on first startup.
2. Copy `.env.example` to `server/.env` and set a private `JWT_SECRET`. The default values connect to the included local database.
3. Start the API:

   ```sh
   cd server && npm install && npm run dev
   ```

4. In another terminal, copy `client/.env.example` to `client/.env` if you need to change the API URL, then start the React app:

   ```sh
   cd client && npm install && npm run dev
   ```

Open http://localhost:5173. New users can register from the login screen.

For a local reminder worker, run `cd server && npm run worker`. By default it checks every day at 09:00 UTC; set `REMINDER_CRON` to a BullMQ cron pattern to change the schedule. The current reminder worker writes reminder candidates to its logs; connecting a mail or push provider can be added later.

## Database and seed

For a local PostgreSQL install, create a database and apply `database/database/schema.sql`, then set `DATABASE_URL` in `server/.env`. Set `TEST_DATABASE_URL` to a disposable test database if using tests. To seed, run `cd server && npm run seed`; the demo account is `demo@sweety.local` / `SweetyDemo123!`. The seed is safe to re-run and uses the current date for sample readings.

If upgrading a PostgreSQL database created before doctor assignments were added, apply `database/migrations/001-doctor-patients.sql` once before seeding.

## API

- `POST /api/auth/register` and `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/readings?page=1&limit=20` (maximum limit 100), `POST /api/readings`
- `PUT /api/readings/:id`, `DELETE /api/readings/:id`
- `GET /api/reports?date=YYYY-MM-DD` (daily, month-to-date, previous month)
- `GET /api/reports/patients` and `POST /api/reports/patients` (doctor only; add a patient by email)
- `GET /api/reports?date=YYYY-MM-DD&patientId=ID` (doctor only; assigned patients only)

All reading and report routes require `Authorization: Bearer <token>`. Report responses include daily/monthly aggregates and per-slot readings for the seven-day grouped bar chart. Redis caches reports for five minutes; reading create, update, and delete clear that patient's cached reports. API validation errors return a clear message in `{ "error": "..." }`.

## Tests

`cd server && npm test` runs the API validation tests. `cd client && npm test` runs the React Testing Library reading form test. `TEST_DATABASE_URL` is available for future database integration tests.

## Screenshots

Screenshots of the login page, seeded patient dashboard, journal, and reading form are available in the [`screenshots`](screenshots) folder. This project includes screenshots only; no screen recording is included.

## Notes

- Dates use the user's browser local calendar date and are stored as PostgreSQL `DATE`, avoiding timezone shifts. Future dates are rejected. A reading's date and time slot are unique per user.
- Month-to-date ends on the selected date; the monthly report covers the entire previous calendar month. The grouped bar graph compares each time slot over the seven days ending on the selected date.
- Doctor accounts are provisioned through the seed script or by an administrator; public signup always creates a patient account. Assignment only grants access to reports for explicitly assigned patient accounts.
- Passwords use bcrypt; JWTs identify the user for every data query. More time would go toward report integration tests, accessibility polish, and a hosted deployment with managed secrets and automated database migrations.


