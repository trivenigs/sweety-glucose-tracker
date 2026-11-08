require('../config/env');
const bcrypt = require('bcrypt');
const db = require('../config/db');
const { bcryptRounds } = require('../config/env');

async function seed() {
  const password = await bcrypt.hash('SweetyDemo123!', bcryptRounds);
  const user = await db.query(`INSERT INTO users (name,email,password_hash) VALUES ('Sweety Demo','demo@sweety.local',$1)
    ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name RETURNING id`, [password]);
  const today = new Date().toISOString().slice(0, 10);
  const samples = [['morning', 108], ['after_breakfast', 142], ['after_lunch', 126], ['after_dinner', 119]];
  for (const [slot, value] of samples) await db.query(`INSERT INTO readings (user_id,reading_date,slot,value) VALUES ($1,$2,$3,$4)
    ON CONFLICT (user_id,reading_date,slot) DO UPDATE SET value=EXCLUDED.value`, [user.rows[0].id, today, slot, value]);
  const doctorPassword = await bcrypt.hash('SweetyDoctor123!', bcryptRounds);
  const doctor = await db.query(`INSERT INTO users (name,email,password_hash,role) VALUES ('Dr. Demo','doctor@sweety.local',$1,'doctor')
    ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name,role='doctor' RETURNING id`, [doctorPassword]);
  await db.query('INSERT INTO doctor_patients (doctor_id,patient_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [doctor.rows[0].id, user.rows[0].id]);
  console.log('Seeded patient demo@sweety.local / SweetyDemo123! and doctor doctor@sweety.local / SweetyDoctor123!');
}
seed().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.pool.end());
