CREATE TABLE IF NOT EXISTS doctor_patients (
  doctor_id  INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patient_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (doctor_id, patient_id),
  CHECK (doctor_id <> patient_id)
);
