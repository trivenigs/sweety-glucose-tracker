const SLOTS = ['morning', 'after_breakfast', 'after_lunch', 'after_dinner'];
const SLOT_LABELS = {
  morning: 'Morning (fasting)',
  after_breakfast: 'After breakfast',
  after_lunch: 'After lunch',
  after_dinner: 'After dinner',
};

function validateReading(body) {
  const { date, slot, value } = body || {};
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) return 'Please enter a valid date.';
  if (date > new Date().toISOString().slice(0, 10)) return 'Date cannot be in the future.';
  if (!SLOTS.includes(slot)) return 'Please choose a valid time slot.';
  if (value === '' || value === undefined || value === null) return 'Please enter a glucose value.';
  if (!Number.isInteger(Number(value)) || Number(value) < 40 || Number(value) > 600) return 'Value must be between 40 and 600 mg/dl.';
  return null;
}

module.exports = { SLOTS, SLOT_LABELS, validateReading };
