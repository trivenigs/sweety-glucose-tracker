const Redis = require('ioredis');
const { redisUrl } = require('./env');
const redis = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1, retryStrategy: (attempt) => Math.min(attempt * 200, 2000) });
module.exports = redis;
