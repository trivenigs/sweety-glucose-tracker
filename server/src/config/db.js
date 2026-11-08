const { Pool, types } = require('pg');
const { databaseUrl } = require('./env');

// Keep DATE as a 'YYYY-MM-DD' string (avoids timezone shifts)
types.setTypeParser(1082, (v) => v);
// COUNT() returns bigint (a string by default); convert to a number
types.setTypeParser(20, (v) => parseInt(v, 10));

const pool = new Pool({ connectionString: databaseUrl });

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};