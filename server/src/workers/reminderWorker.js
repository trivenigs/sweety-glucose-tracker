const { Worker } = require('bullmq');
const db = require('../config/db');
const { connection, scheduleReminder } = require('../queues/reminders');

async function processReminders() {
  const { rows } = await db.query(`SELECT u.id,u.email,COUNT(r.id)::int AS readings_today
    FROM users u LEFT JOIN readings r ON r.user_id=u.id AND r.reading_date=CURRENT_DATE
    WHERE u.role='patient' GROUP BY u.id HAVING COUNT(r.id)<4 ORDER BY u.id`);
  for (const user of rows) console.log(`Reminder: ${user.email} has ${user.readings_today}/4 readings today.`);
  return { usersNeedingReminder: rows.length };
}

const worker = new Worker('daily-reading-reminders', processReminders, { connection });
worker.on('completed', (job, result) => console.log(`Reminder job ${job.id} finished: ${result.usersNeedingReminder} patient(s) need reminders.`));
worker.on('failed', (job, error) => console.error(`Reminder job ${job?.id} failed:`, error));

scheduleReminder().catch((error) => { console.error('Could not schedule daily reminder:', error); process.exitCode = 1; });
async function shutdown() { await worker.close(); await db.pool.end(); await connection.quit(); process.exit(0); }
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
