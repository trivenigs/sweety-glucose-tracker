const express = require('express');
const db = require('../config/db');
const authenticate = require('../middleware/auth');
const { SLOTS, SLOT_LABELS, validateReading } = require('../utils/validation');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const values = [req.user.id];
    let where = 'user_id=$1';
    if (req.query.date) { values.push(req.query.date); where += ` AND reading_date=$${values.length}`; }
    const count = await db.query(`SELECT COUNT(*) FROM readings WHERE ${where}`, values);
    const { rows } = await db.query(`SELECT id, reading_date AS date, slot, value FROM readings WHERE ${where} ORDER BY reading_date DESC, slot LIMIT $${values.length + 1} OFFSET $${values.length + 2}`, [...values, limit, (page - 1) * limit]);
    res.json({ readings: rows, pagination: { page, limit, total: Number(count.rows[0].count), pages: Math.ceil(Number(count.rows[0].count) / limit) } });
  } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  const message = validateReading(req.body);
  if (message) return res.status(400).json({ error: message });
  try {
    const count = await db.query('SELECT COUNT(*) FROM readings WHERE user_id=$1 AND reading_date=$2', [req.user.id, req.body.date]);
    if (Number(count.rows[0].count) >= 4) return res.status(409).json({ error: 'You can add only 4 readings per day.' });
    const { rows } = await db.query('INSERT INTO readings (user_id,reading_date,slot,value) VALUES ($1,$2,$3,$4) RETURNING id,reading_date AS date,slot,value', [req.user.id, req.body.date, req.body.slot, Number(req.body.value)]);
    await require('../services/reportCache').clearUser(req.user.id);
    res.status(201).json({ reading: rows[0] });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: `You already have a ${SLOT_LABELS[req.body.slot]} reading for this date.` });
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  const message = validateReading(req.body);
  if (message) return res.status(400).json({ error: message });
  try {
    const { rows } = await db.query('UPDATE readings SET reading_date=$1,slot=$2,value=$3 WHERE id=$4 AND user_id=$5 RETURNING id,reading_date AS date,slot,value', [req.body.date, req.body.slot, Number(req.body.value), req.params.id, req.user.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Reading not found.' });
    await require('../services/reportCache').clearUser(req.user.id);
    res.json({ reading: rows[0] });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: `You already have a ${SLOT_LABELS[req.body.slot]} reading for this date.` });
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { rowCount } = await db.query('DELETE FROM readings WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    if (!rowCount) return res.status(404).json({ error: 'Reading not found.' });
    await require('../services/reportCache').clearUser(req.user.id);
    res.status(204).end();
  } catch (error) { next(error); }
});

module.exports = router;
