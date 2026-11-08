const { validateReading } = require('../src/utils/validation');

describe('reading validation', () => {
  const today = new Date().toISOString().slice(0, 10);
  const valid = { date: today, slot: 'morning', value: 100 };

  test('accepts a valid reading', () => {
    expect(validateReading(valid)).toBeNull();
  });

  test('requires a value and limits it to a whole number from 40 to 600', () => {
    expect(validateReading({ ...valid, value: '' })).toBe('Please enter a glucose value.');
    expect(validateReading({ ...valid, value: 39 })).toBe('Value must be between 40 and 600 mg/dl.');
    expect(validateReading({ ...valid, value: 600.5 })).toBe('Value must be between 40 and 600 mg/dl.');
    expect(validateReading({ ...valid, value: 600 })).toBeNull();
  });

  test('rejects invalid and future dates and unknown slots', () => {
    expect(validateReading({ ...valid, date: '2026-02-31' })).toBe('Please enter a valid date.');
    expect(validateReading({ ...valid, date: '2999-01-01' })).toBe('Date cannot be in the future.');
    expect(validateReading({ ...valid, slot: 'late_night' })).toBe('Please choose a valid time slot.');
  });
});
