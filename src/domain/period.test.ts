import { createPeriodSelection, resolvePeriodRange, shiftPeriod } from './period';

describe('period ranges', () => {
  test('uses Monday through Sunday for a week', () => {
    expect(resolvePeriodRange(createPeriodSelection('week', '2026-10-15'))).toEqual({ startDate: '2026-10-12', endDate: '2026-10-18' });
  });

  test('handles month boundaries', () => {
    expect(resolvePeriodRange(createPeriodSelection('month', '2026-02-14'))).toEqual({ startDate: '2026-02-01', endDate: '2026-02-28' });
  });

  test('moves a weekly period by seven days', () => {
    expect(shiftPeriod(createPeriodSelection('week', '2026-10-15'), -1).anchor).toBe('2026-10-08');
  });
});
