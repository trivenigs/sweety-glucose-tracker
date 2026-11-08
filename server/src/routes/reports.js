const express = require('express');
const db = require('../config/db');
const authenticate = require('../middleware/auth');
const cache = require('../services/reportCache');
const router = express.Router();
router.use(authenticate);

function isDoctor(req, res) {
  if (req.user.role !== 'doctor') {
    res.status(403).json({ error: 'This feature is available to doctor accounts.' });
    return false;
  }
  return true;
}

router.get('/patients', async (req, res, next) => {
  if (!isDoctor(req, res)) return;
  try {
    const { rows } = await db.query(`SELECT u.id,u.name,u.email FROM doctor_patients dp JOIN users u ON u.id=dp.patient_id WHERE dp.doctor_id=$1 ORDER BY u.name`, [req.user.id]);
    res.json({ patients: rows });
  } catch (error) { next(error); }
});

router.post('/patients', async (req, res, next) => {
  if (!isDoctor(req, res)) return;
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'Enter the patient email address.' });
    const { rows } = await db.query(`INSERT INTO doctor_patients (doctor_id,patient_id) SELECT $1,id FROM users WHERE email=$2 AND role='patient' ON CONFLICT DO NOTHING RETURNING patient_id`, [req.user.id, email]);
    if (!rows[0]) {
      const existing = await db.query(`SELECT u.id,u.name,u.email FROM doctor_patients dp JOIN users u ON u.id=dp.patient_id WHERE dp.doctor_id=$1 AND u.email=$2`, [req.user.id, email]);
      if (existing.rows[0]) return res.json({ patient: existing.rows[0] });
      return res.status(404).json({ error: 'No patient account found for that email.' });
    }
    const patient = await db.query('SELECT id,name,email FROM users WHERE id=$1', [rows[0].patient_id]);
    res.status(201).json({ patient: patient.rows[0] });
  } catch (error) { next(error); }
});

router.get('/', async (req, res, next) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) return res.status(400).json({ error: 'Please enter a valid date.' });
  let userId = req.user.id;
  try {
    if (req.query.patientId) {
      if (!isDoctor(req, res)) return;
      const allowed = await db.query('SELECT 1 FROM doctor_patients WHERE doctor_id=$1 AND patient_id=$2', [req.user.id, req.query.patientId]);
      if (!allowed.rowCount) return res.status(404).json({ error: 'Patient not found in your assigned list.' });
      userId = Number(req.query.patientId);
    }
    const key = `sweety:reports:${req.user.id}:${userId}:${date}`;
    const cached = await cache.get(key);
    if (cached) return res.json(cached);
    const monthStart = `${date.slice(0, 7)}-01`;
    const trendStart = new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)) - 6)).toISOString().slice(0, 10);
    const prevStart = new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 2, 1)).toISOString().slice(0, 10);
    const prevEnd = monthStart;
    const daily = await db.query('SELECT id,reading_date AS date,slot,value FROM readings WHERE user_id=$1 AND reading_date=$2 ORDER BY slot', [userId, date]);
    const trendReadings = await db.query(`SELECT reading_date AS date,
      ROUND(AVG(value) FILTER (WHERE slot='morning'),1)::float AS morning,
      ROUND(AVG(value) FILTER (WHERE slot='after_breakfast'),1)::float AS after_breakfast,
      ROUND(AVG(value) FILTER (WHERE slot='after_lunch'),1)::float AS after_lunch,
      ROUND(AVG(value) FILTER (WHERE slot='after_dinner'),1)::float AS after_dinner
      FROM readings WHERE user_id=$1 AND reading_date >= $2 AND reading_date <= $3
      GROUP BY reading_date ORDER BY reading_date`, [userId, trendStart, date]);
    const summary = async (start, end, inclusive = false) => {
      const result = await db.query(`SELECT MAX(value)::int AS highest,MIN(value)::int AS lowest,ROUND(AVG(value),1)::float AS average,COUNT(*)::int AS count FROM readings WHERE user_id=$1 AND reading_date >= $2 AND reading_date ${inclusive ? '<=' : '<'} $3`, [userId, start, end]);
      return result.rows[0];
    };
    const result = {
      daily: { start: date, end: date, readings: daily.rows, ...(await summary(date, date, true)) },
      monthToDate: { start: monthStart, end: date, ...(await summary(monthStart, date, true)) },
      previousMonth: { start: prevStart, end: prevEnd, ...(await summary(prevStart, prevEnd)) },
      trendReadings: trendReadings.rows,
    };
    await cache.set(key, result);
    res.json(result);
  } catch (error) { next(error); }
});

module.exports = router;
