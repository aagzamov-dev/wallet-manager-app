import type { DisplayCurrency } from './types';

export function parseMoney(value: string): number | null {
  const digits = value.replace(/[^0-9]/g, '');
  if (!digits) return null;
  const amount = Number(digits);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

export function formatMoneyInput(value: string, allowNegative = false): string {
  const negative = allowNegative && value.trimStart().startsWith('-');
  const digits = value.replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '');
  if (!digits) return negative ? '-' : '';
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return negative ? `-${grouped}` : grouped;
}

export function formatMoney(
  amountUzs: number,
  currency: DisplayCurrency = 'UZS',
  usdRateUzs = 12_500,
): string {
  if (currency === 'USD') {
    const usd = usdRateUzs > 0 ? amountUzs / usdRateUzs : 0;
    return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(usd)} USD`;
  }
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amountUzs)} UZS`;
}

export function today(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function calculateWallet(
  openingBalance: number,
  income: number,
  expenses: number,
  loanGiven: number,
  loanReturned: number,
): number {
  return openingBalance + income - expenses - (loanGiven - loanReturned);
}
