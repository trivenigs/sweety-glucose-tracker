require('dotenv').config();

const required = ['DATABASE_URL', 'JWT_SECRET', 'CLIENT_ORIGIN'];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing required env var: ${key}`);
}

module.exports = {
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl:
    process.env.NODE_ENV === 'test' ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS) || 10,
  clientOrigin: process.env.CLIENT_ORIGIN,
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  reminderCron: process.env.REMINDER_CRON || '0 9 * * *',
};
