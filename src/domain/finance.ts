import type { Expense, Income } from './types';

export function groupByDate<T extends Pick<Expense | Income, 'date'>>(records: T[]): { title: string; data: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const record of records) groups.set(record.date, [...(groups.get(record.date) ?? []), record]);
  return [...groups.entries()].map(([title, data]) => ({ title, data }));
}

export function splitProjectPayment(expectedAmount: number, receivedAmount: number): { income: number; remainder: number } {
  if (!Number.isSafeInteger(expectedAmount) || !Number.isSafeInteger(receivedAmount) || expectedAmount <= 0 || receivedAmount <= 0 || receivedAmount > expectedAmount) {
    throw new Error('Invalid payment amount');
  }
  return { income: receivedAmount, remainder: expectedAmount - receivedAmount };
}
