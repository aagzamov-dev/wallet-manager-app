import { calculateWallet, formatMoney, formatMoneyInput, parseMoney } from './money';
import { groupByDate, splitProjectPayment } from './finance';

describe('money', () => {
  test('calculates wallet with opening balance and loan returns', () => {
    expect(calculateWallet(1_000_000, 500_000, 200_000, 300_000, 50_000)).toBe(1_050_000);
  });

  test('supports a negative active loan balance', () => {
    expect(calculateWallet(0, 0, 0, 100_000, 150_000)).toBe(50_000);
  });

  test('parses and formats whole UZS amounts', () => {
    expect(parseMoney('1 250 000 UZS')).toBe(1_250_000);
    expect(formatMoneyInput('1000000')).toBe('1 000 000');
    expect(formatMoney(1_250_000)).toBe('1,250,000 UZS');
    expect(formatMoney(25_000, 'USD', 12_500)).toBe('2 USD');
  });
});

describe('finance helpers', () => {
  test('splits a partial project payment without losing value', () => {
    expect(splitProjectPayment(1_000_000, 400_000)).toEqual({ income: 400_000, remainder: 600_000 });
    expect(splitProjectPayment(1_000_000, 1_000_000)).toEqual({ income: 1_000_000, remainder: 0 });
  });

  test('rejects an overpayment', () => {
    expect(() => splitProjectPayment(100, 101)).toThrow('Invalid payment amount');
  });

  test('groups list records by calendar date', () => {
    const records = [{ date: '2026-10-15', id: '1' }, { date: '2026-10-14', id: '2' }, { date: '2026-10-15', id: '3' }];
    expect(groupByDate(records)).toEqual([
      { title: '2026-10-15', data: [records[0], records[2]] },
      { title: '2026-10-14', data: [records[1]] },
    ]);
  });
});
