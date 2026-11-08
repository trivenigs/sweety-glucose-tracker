const { Queue } = require('bullmq');
const redis = require('../config/redis');
const { reminderCron } = require('../config/env');

const connection = redis.duplicate({ maxRetriesPerRequest: null });
const reminderQueue = new Queue('daily-reading-reminders', { connection });

async function scheduleReminder() {
  await reminderQueue.add('check-incomplete-days', {}, { repeat: { pattern: reminderCron }, removeOnComplete: 20, removeOnFail: 100 });
  console.log(`Daily reminder check scheduled: ${reminderCron} (UTC)`);
}

module.exports = { connection, reminderQueue, scheduleReminder };
