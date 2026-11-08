const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { bcryptRounds, jwtSecret, jwtExpiresIn } = require('../config/env');
const authenticate = require('../middleware/auth');

const router = express.Router();
function tokenFor(user) {
  return jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role || 'patient' }, jwtSecret, { expiresIn: jwtExpiresIn });
}

router.post('/register', async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!name) return res.status(400).json({ error: 'Please enter your name.' });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    const hash = await bcrypt.hash(password, bcryptRounds);
    const { rows } = await db.query('INSERT INTO users (name, email, password_hash) VALUES ($1,$2,$3) RETURNING id,name,email,role', [name, email, hash]);
    const user = rows[0];
    res.status(201).json({ user, token: tokenFor(user) });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'An account with this email already exists.' });
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const { rows } = await db.query('SELECT id,name,email,password_hash,role FROM users WHERE email=$1', [email]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(String(req.body.password || ''), user.password_hash))) return res.status(401).json({ error: 'Email or password is incorrect.' });
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, token: tokenFor(user) });
  } catch (error) { next(error); }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT id,name,email,role FROM users WHERE id=$1', [req.user.id]);
    if (!rows[0]) return res.status(401).json({ error: 'Please log in to continue.' });
    res.json({ user: rows[0] });
  } catch (error) { next(error); }
});

module.exports = router;
