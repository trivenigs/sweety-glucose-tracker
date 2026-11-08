const redis = require('../config/redis');
const { nodeEnv } = require('../config/env');
redis.on('error', (error) => { if (nodeEnv !== 'test') console.warn('Redis unavailable; report cache will be skipped:', error.message); });

async function get(key) {
  try {
    if (redis.status === 'wait') await redis.connect();
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  } catch { return null; }
}
async function set(key, value) {
  try {
    if (redis.status === 'wait') await redis.connect();
    await redis.set(key, JSON.stringify(value), 'EX', 300);
  } catch { /* reports remain available without Redis */ }
}
async function clearUser(userId) {
  try {
    if (redis.status === 'wait') await redis.connect();
    const keys = await redis.keys(`sweety:reports:*:${userId}:*`);
    if (keys.length) await redis.del(...keys);
  } catch { /* cache expires naturally if Redis is unavailable */ }
}
module.exports = { get, set, clearUser, redis };
