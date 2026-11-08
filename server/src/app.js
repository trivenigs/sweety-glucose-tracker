const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { clientOrigin, nodeEnv } = require('./config/env');

const app = express();
app.use(helmet());
app.use(cors({ origin: clientOrigin }));
app.use(express.json({ limit: '20kb' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 }), require('./routes/auth'));
app.use('/api/readings', require('./routes/readings'));
app.use('/api/reports', require('./routes/reports'));
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use((_req, res) => res.status(404).json({ error: 'Not found.' }));
app.use((error, _req, res, _next) => {
  if (nodeEnv !== 'test') console.error(error);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});
module.exports = app;
