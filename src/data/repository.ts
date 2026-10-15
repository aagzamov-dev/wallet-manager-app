import * as Crypto from 'expo-crypto';
import { getDatabase, seedCategories } from './database';
import type {
  AppSettings, Category, Dashboard, DisplayCurrency, ExpectedIncome, Expense, Income,
  Language, LoanPerson, LoanProject, LoanTransaction, LoanTransactionKind,
} from '@/domain/types';
import { calculateWallet, today } from '@/domain/money';
import { enumerateDays, type DateRange } from '@/domain/period';
import { splitProjectPayment } from '@/domain/finance';

type SettingsRow = {
  language: Language; display_currency: DisplayCurrency; usd_rate_uzs: number; opening_balance: number;
  opening_date: string; quick_entry_on_unlock: number; lock_timeout_minutes: 0 | 1 | 5 | 15;
  biometric_enabled: number; onboarding_completed: number; last_backup_at: string | null;
  changes_since_backup: number; last_used_category_id: string | null;
};

type CategoryRow = { id: string; name_en: string; name_uz: string; description_en: string | null; description_uz: string | null; color: string; use_count: number; created_at: string };
type ExpenseRow = {
  id: string; amount: number; title: string; note: string | null; date: string; category_id: string | null;
  name_en: string | null; name_uz: string | null; color: string | null; created_at: string;
};
type IncomeRow = { id: string; amount: number; title: string; note: string | null; date: string; project_id: string | null; created_at: string };
type PersonRow = { id: string; name: string; note: string | null; balance: number; created_at: string };
type TransactionRow = { id: string; person_id: string; kind: LoanTransactionKind; amount: number; note: string | null; date: string; created_at: string };
type ProjectRow = { id: string; name: string; borrower: string | null; note: string | null; upcoming: number; overdue: number; created_at: string };
type ExpectedRow = { id: string; project_id: string; amount: number; due_date: string; status: ExpectedIncome['status']; note: string | null; created_at: string };

const now = () => new Date().toISOString();
const id = () => Crypto.randomUUID();

async function changed(): Promise<void> {
  await getDatabase().runAsync('UPDATE app_settings SET changes_since_backup = changes_since_backup + 1 WHERE id = 1');
}

export async function getSettings(): Promise<AppSettings> {
  const row = await getDatabase().getFirstAsync<SettingsRow>('SELECT * FROM app_settings WHERE id = 1');
  if (!row) throw new Error('Settings are unavailable');
  return {
    language: row.language,
    displayCurrency: row.display_currency,
    usdRateUzs: row.usd_rate_uzs,
    openingBalance: row.opening_balance,
    openingDate: row.opening_date,
    quickEntryOnUnlock: Boolean(row.quick_entry_on_unlock),
    lockTimeoutMinutes: row.lock_timeout_minutes,
    biometricEnabled: Boolean(row.biometric_enabled),
    onboardingCompleted: Boolean(row.onboarding_completed),
    lastBackupAt: row.last_backup_at,
    changesSinceBackup: row.changes_since_backup,
    lastUsedCategoryId: row.last_used_category_id,
  };
}

export async function finishOnboarding(openingBalance: number, openingDate: string, biometricEnabled: boolean): Promise<void> {
  await getDatabase().runAsync(
    `UPDATE app_settings SET opening_balance = ?, opening_date = ?, biometric_enabled = ?,
      onboarding_completed = 1, changes_since_backup = 1 WHERE id = 1`,
    openingBalance, openingDate, biometricEnabled ? 1 : 0,
  );
}

export async function updateSettings(patch: Partial<Pick<AppSettings,
  'language' | 'displayCurrency' | 'usdRateUzs' | 'openingBalance' | 'openingDate' |
  'quickEntryOnUnlock' | 'lockTimeoutMinutes' | 'biometricEnabled'>>): Promise<void> {
  const entries: [string, string | number][] = [];
  if (patch.language !== undefined) entries.push(['language', patch.language]);
  if (patch.displayCurrency !== undefined) entries.push(['display_currency', patch.displayCurrency]);
  if (patch.usdRateUzs !== undefined) entries.push(['usd_rate_uzs', patch.usdRateUzs]);
  if (patch.openingBalance !== undefined) entries.push(['opening_balance', patch.openingBalance]);
  if (patch.openingDate !== undefined) entries.push(['opening_date', patch.openingDate]);
  if (patch.quickEntryOnUnlock !== undefined) entries.push(['quick_entry_on_unlock', patch.quickEntryOnUnlock ? 1 : 0]);
  if (patch.lockTimeoutMinutes !== undefined) entries.push(['lock_timeout_minutes', patch.lockTimeoutMinutes]);
  if (patch.biometricEnabled !== undefined) entries.push(['biometric_enabled', patch.biometricEnabled ? 1 : 0]);
  if (!entries.length) return;
  const clause = entries.map(([column]) => `${column} = ?`).join(', ');
  await getDatabase().runAsync(`UPDATE app_settings SET ${clause}, changes_since_backup = changes_since_backup + 1 WHERE id = 1`, entries.map(([, value]) => value));
}

export async function listCategories(): Promise<Category[]> {
  const rows = await getDatabase().getAllAsync<CategoryRow>(
    `SELECT * FROM categories ORDER BY
      CASE WHEN id = (SELECT last_used_category_id FROM app_settings WHERE id = 1) THEN 0 ELSE 1 END,
      use_count DESC, created_at ASC`,
  );
  return rows.map((row) => ({ id: row.id, nameEn: row.name_en, nameUz: row.name_uz, descriptionEn: row.description_en, descriptionUz: row.description_uz, color: row.color, useCount: row.use_count, createdAt: row.created_at }));
}

export type CategoryInput = { nameEn: string; nameUz?: string; descriptionEn?: string; descriptionUz?: string };

export async function createCategory(input: CategoryInput): Promise<void> {
  await getDatabase().runAsync(
    'INSERT INTO categories (id, name_en, name_uz, color, created_at, description_en, description_uz) VALUES (?, ?, ?, ?, ?, ?, ?)',
    id(), input.nameEn.trim(), input.nameUz?.trim() ?? '', '#AEB9C7', now(), input.descriptionEn?.trim() || null, input.descriptionUz?.trim() || null,
  );
  await changed();
}

export async function updateCategory(categoryId: string, input: CategoryInput): Promise<void> {
  await getDatabase().runAsync(
    'UPDATE categories SET name_en = ?, name_uz = ?, description_en = ?, description_uz = ? WHERE id = ?',
    input.nameEn.trim(), input.nameUz?.trim() ?? '', input.descriptionEn?.trim() || null, input.descriptionUz?.trim() || null, categoryId,
  );
  await changed();
}

export async function deleteCategory(categoryId: string): Promise<void> {
  const db = getDatabase();
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync('UPDATE expenses SET category_id = NULL WHERE category_id = ?', categoryId);
    await tx.runAsync('DELETE FROM categories WHERE id = ?', categoryId);
    await tx.runAsync('UPDATE app_settings SET changes_since_backup = changes_since_backup + 1 WHERE id = 1');
  });
}

export type ExpenseInput = { amount: number; categoryId: string; title?: string; note?: string; date: string };
export async function createExpense(input: ExpenseInput): Promise<string> {
  const db = getDatabase();
  const category = await db.getFirstAsync<{ name_en: string }>('SELECT name_en FROM categories WHERE id = ?', input.categoryId);
  if (!category) throw new Error('Choose a valid category');
  const expenseId = id();
  const timestamp = now();
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync(
      `INSERT INTO expenses (id, amount, title, note, date, category_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      expenseId, input.amount, input.title?.trim() || category.name_en, input.note?.trim() || null,
      input.date, input.categoryId, timestamp, timestamp,
    );
    await tx.runAsync('UPDATE categories SET use_count = use_count + 1 WHERE id = ?', input.categoryId);
    await tx.runAsync('UPDATE app_settings SET last_used_category_id = ?, changes_since_backup = changes_since_backup + 1 WHERE id = 1', input.categoryId);
  });
  return expenseId;
}

export async function deleteExpense(expenseId: string): Promise<void> {
  await getDatabase().runAsync('DELETE FROM expenses WHERE id = ?', expenseId);
  await changed();
}

export async function listExpenses(search = '', categoryId?: string, range?: DateRange): Promise<Expense[]> {
  const like = `%${search.trim()}%`;
  const rows = await getDatabase().getAllAsync<ExpenseRow>(
    `SELECT e.*, c.name_en, c.name_uz, c.color FROM expenses e
     LEFT JOIN categories c ON c.id = e.category_id
     WHERE (? = '' OR e.title LIKE ? OR COALESCE(e.note, '') LIKE ?)
       AND (? = '' OR e.category_id = ?)
       AND (? = '' OR e.date BETWEEN ? AND ?)
     ORDER BY e.date DESC, e.created_at DESC`,
    search.trim(), like, like, categoryId ?? '', categoryId ?? '', range?.startDate ?? '', range?.startDate ?? '', range?.endDate ?? '',
  );
  return rows.map((row) => ({
    id: row.id, amount: row.amount, title: row.title, note: row.note, date: row.date,
    categoryId: row.category_id, categoryNameEn: row.name_en, categoryNameUz: row.name_uz,
    categoryColor: row.color, createdAt: row.created_at,
  }));
}

export type IncomeInput = { amount: number; title: string; note?: string; date: string; projectId?: string | null };
export async function createIncome(input: IncomeInput): Promise<string> {
  const incomeId = id();
  const timestamp = now();
  await getDatabase().runAsync(
    `INSERT INTO income (id, amount, title, note, date, project_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    incomeId, input.amount, input.title.trim(), input.note?.trim() || null, input.date,
    input.projectId ?? null, timestamp, timestamp,
  );
  await changed();
  return incomeId;
}

export async function deleteIncome(incomeId: string): Promise<void> {
  await getDatabase().runAsync('DELETE FROM income WHERE id = ?', incomeId);
  await changed();
}

export async function listIncome(search = '', range?: DateRange): Promise<Income[]> {
  const like = `%${search.trim()}%`;
  const rows = await getDatabase().getAllAsync<IncomeRow>(
    `SELECT * FROM income WHERE (? = '' OR title LIKE ? OR COALESCE(note, '') LIKE ?)
       AND (? = '' OR date BETWEEN ? AND ?)
     ORDER BY date DESC, created_at DESC`, search.trim(), like, like, range?.startDate ?? '', range?.startDate ?? '', range?.endDate ?? '',
  );
  return rows.map((row) => ({ id: row.id, amount: row.amount, title: row.title, note: row.note, date: row.date, projectId: row.project_id, createdAt: row.created_at }));
}

export async function listPeople(): Promise<LoanPerson[]> {
  const rows = await getDatabase().getAllAsync<PersonRow>(
    `SELECT p.*, COALESCE(SUM(CASE WHEN t.kind = 'GIVE' THEN t.amount ELSE -t.amount END), 0) balance
     FROM loan_people p LEFT JOIN loan_transactions t ON t.person_id = p.id
     GROUP BY p.id ORDER BY p.name COLLATE NOCASE`,
  );
  return rows.map((row) => ({ id: row.id, name: row.name, note: row.note, balance: row.balance, createdAt: row.created_at }));
}

export async function createPerson(name: string, note?: string): Promise<string> {
  const personId = id(); const timestamp = now();
  await getDatabase().runAsync('INSERT INTO loan_people (id, name, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', personId, name.trim(), note?.trim() || null, timestamp, timestamp);
  await changed(); return personId;
}

export async function deletePerson(personId: string): Promise<void> {
  await getDatabase().runAsync('DELETE FROM loan_people WHERE id = ?', personId); await changed();
}

export async function listPersonTransactions(personId: string): Promise<LoanTransaction[]> {
  const rows = await getDatabase().getAllAsync<TransactionRow>('SELECT * FROM loan_transactions WHERE person_id = ? ORDER BY date DESC, created_at DESC', personId);
  return rows.map((row) => ({ id: row.id, personId: row.person_id, kind: row.kind, amount: row.amount, note: row.note, date: row.date, createdAt: row.created_at }));
}

export async function createLoanTransaction(personId: string, kind: LoanTransactionKind, amount: number, date: string, note?: string): Promise<void> {
  await getDatabase().runAsync(
    'INSERT INTO loan_transactions (id, person_id, kind, amount, note, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    id(), personId, kind, amount, note?.trim() || null, date, now(),
  );
  await changed();
}

export async function listProjects(): Promise<LoanProject[]> {
  const rows = await getDatabase().getAllAsync<ProjectRow>(
    `SELECT p.*,
      COALESCE(SUM(CASE WHEN e.status IN ('UPCOMING','PARTIAL') AND e.due_date >= date('now','localtime') THEN e.amount ELSE 0 END),0) upcoming,
      COALESCE(SUM(CASE WHEN e.status IN ('UPCOMING','PARTIAL','OVERDUE') AND e.due_date < date('now','localtime') THEN e.amount ELSE 0 END),0) overdue
     FROM loan_projects p LEFT JOIN expected_income e ON e.project_id = p.id
     GROUP BY p.id ORDER BY p.created_at DESC`,
  );
  return rows.map((row) => ({ id: row.id, name: row.name, borrower: row.borrower, note: row.note, upcomingAmount: row.upcoming, overdueAmount: row.overdue, createdAt: row.created_at }));
}

export async function createProject(name: string, borrower?: string, note?: string): Promise<string> {
  const projectId = id(); const timestamp = now();
  await getDatabase().runAsync('INSERT INTO loan_projects (id, name, borrower, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', projectId, name.trim(), borrower?.trim() || null, note?.trim() || null, timestamp, timestamp);
  await changed(); return projectId;
}

export async function deleteProject(projectId: string): Promise<void> {
  await getDatabase().runAsync('DELETE FROM loan_projects WHERE id = ?', projectId); await changed();
}

export async function listExpectedIncome(projectId: string): Promise<ExpectedIncome[]> {
  await getDatabase().runAsync(
    `UPDATE expected_income SET status = 'OVERDUE' WHERE project_id = ?
      AND status = 'UPCOMING' AND due_date < date('now','localtime')`, projectId,
  );
  const rows = await getDatabase().getAllAsync<ExpectedRow>('SELECT * FROM expected_income WHERE project_id = ? ORDER BY due_date ASC, created_at ASC', projectId);
  return rows.map((row) => ({ id: row.id, projectId: row.project_id, amount: row.amount, dueDate: row.due_date, status: row.status, note: row.note, createdAt: row.created_at }));
}

export async function createExpectedIncome(projectId: string, amount: number, dueDate: string, note?: string): Promise<void> {
  const timestamp = now();
  await getDatabase().runAsync(
    'INSERT INTO expected_income (id, project_id, amount, due_date, status, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    id(), projectId, amount, dueDate, dueDate < today() ? 'OVERDUE' : 'UPCOMING', note?.trim() || null, timestamp, timestamp,
  );
  await changed();
}

export async function receiveExpectedIncome(expectedId: string, receivedAmount: number): Promise<void> {
  const db = getDatabase();
  await db.withExclusiveTransactionAsync(async (tx) => {
    const item = await tx.getFirstAsync<ExpectedRow & { project_name: string }>(
      `SELECT e.*, p.name project_name FROM expected_income e JOIN loan_projects p ON p.id = e.project_id WHERE e.id = ?`, expectedId,
    );
    if (!item) throw new Error('Expected payment not found');
    const payment = splitProjectPayment(item.amount, receivedAmount);
    const timestamp = now();
    await tx.runAsync(
      `INSERT INTO income (id, amount, title, note, date, project_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      id(), payment.income, item.project_name, item.note, today(), item.project_id, timestamp, timestamp,
    );
    await tx.runAsync("UPDATE expected_income SET status = 'RECEIVED', updated_at = ? WHERE id = ?", timestamp, expectedId);
    if (payment.remainder > 0) {
      await tx.runAsync(
        `INSERT INTO expected_income (id, project_id, amount, due_date, status, note, parent_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id(), item.project_id, payment.remainder, item.due_date, item.due_date < today() ? 'OVERDUE' : 'PARTIAL', item.note, expectedId, timestamp, timestamp,
      );
    }
    await tx.runAsync('UPDATE app_settings SET changes_since_backup = changes_since_backup + 1 WHERE id = 1');
  });
}

export async function getDashboard(range: DateRange): Promise<Dashboard> {
  const db = getDatabase();
  const settings = await getSettings();
  const totals = await db.getFirstAsync<{ income: number; expenses: number; given: number; returned: number; period_income: number; period_expenses: number; upcoming: number; overdue: number }>(`
    SELECT
      (SELECT COALESCE(SUM(amount),0) FROM income) income,
      (SELECT COALESCE(SUM(amount),0) FROM expenses) expenses,
      (SELECT COALESCE(SUM(amount),0) FROM loan_transactions WHERE kind='GIVE') given,
      (SELECT COALESCE(SUM(amount),0) FROM loan_transactions WHERE kind='RETURN') returned,
      (SELECT COALESCE(SUM(amount),0) FROM income WHERE date BETWEEN ? AND ?) period_income,
      (SELECT COALESCE(SUM(amount),0) FROM expenses WHERE date BETWEEN ? AND ?) period_expenses,
      (SELECT COALESCE(SUM(amount),0) FROM expected_income WHERE status IN ('UPCOMING','PARTIAL') AND due_date >= date('now','localtime')) upcoming,
      (SELECT COALESCE(SUM(amount),0) FROM expected_income WHERE status != 'RECEIVED' AND due_date < date('now','localtime')) overdue
  `, range.startDate, range.endDate, range.startDate, range.endDate);
  const safe = totals ?? { income: 0, expenses: 0, given: 0, returned: 0, period_income: 0, period_expenses: 0, upcoming: 0, overdue: 0 };
  const recent = await db.getAllAsync<Dashboard['recent'][number]>(`
    SELECT * FROM (
      SELECT id, 'expense' kind, title, amount, date FROM expenses
      UNION ALL SELECT id, 'income' kind, title, amount, date FROM income
      UNION ALL SELECT t.id, CASE WHEN t.kind='GIVE' THEN 'give' ELSE 'return' END kind, p.name title, t.amount, t.date
        FROM loan_transactions t JOIN loan_people p ON p.id=t.person_id
    ) WHERE date BETWEEN ? AND ?
    ORDER BY date DESC LIMIT 8
  `, range.startDate, range.endDate);
  const daily = await db.getAllAsync<{ date: string; income: number; expenses: number }>(`
    SELECT date,
      COALESCE(SUM(CASE WHEN kind='income' THEN amount ELSE 0 END),0) income,
      COALESCE(SUM(CASE WHEN kind='expense' THEN amount ELSE 0 END),0) expenses
    FROM (
      SELECT date, amount, 'income' kind FROM income WHERE date BETWEEN ? AND ?
      UNION ALL SELECT date, amount, 'expense' kind FROM expenses WHERE date BETWEEN ? AND ?
    ) GROUP BY date ORDER BY date
  `, range.startDate, range.endDate, range.startDate, range.endDate);
  const dailyMap = new Map(daily.map((item) => [item.date, item]));
  const days = enumerateDays(range);
  const chunkSize = days.length <= 14 ? 1 : days.length <= 62 ? 7 : 30;
  const breakdown: Dashboard['breakdown'] = [];
  for (let index = 0; index < days.length; index += chunkSize) {
    const chunk = days.slice(index, index + chunkSize);
    breakdown.push({
      key: chunk[0],
      label: chunkSize === 1 ? chunk[0].slice(8) : chunk[0].slice(5),
      income: chunk.reduce((sum, date) => sum + (dailyMap.get(date)?.income ?? 0), 0),
      expenses: chunk.reduce((sum, date) => sum + (dailyMap.get(date)?.expenses ?? 0), 0),
    });
  }
  return {
    wallet: calculateWallet(settings.openingBalance, safe.income, safe.expenses, safe.given, safe.returned),
    income: safe.period_income, expenses: safe.period_expenses, loansGiven: safe.given, loansReturned: safe.returned,
    upcoming: safe.upcoming, overdue: safe.overdue, recent, breakdown,
  };
}

export type DatabaseDump = {
  settings: SettingsRow;
  categories: CategoryRow[];
  expenses: Record<string, string | number | null>[];
  income: Record<string, string | number | null>[];
  people: Record<string, string | number | null>[];
  transactions: Record<string, string | number | null>[];
  projects: Record<string, string | number | null>[];
  expectedIncome: Record<string, string | number | null>[];
};

export async function dumpDatabase(): Promise<DatabaseDump> {
  const db = getDatabase();
  const settings = await db.getFirstAsync<SettingsRow>('SELECT * FROM app_settings WHERE id=1');
  if (!settings) throw new Error('Settings are unavailable');
  return {
    settings,
    categories: await db.getAllAsync<CategoryRow>('SELECT * FROM categories'),
    expenses: await db.getAllAsync('SELECT * FROM expenses'),
    income: await db.getAllAsync('SELECT * FROM income'),
    people: await db.getAllAsync('SELECT * FROM loan_people'),
    transactions: await db.getAllAsync('SELECT * FROM loan_transactions'),
    projects: await db.getAllAsync('SELECT * FROM loan_projects'),
    expectedIncome: await db.getAllAsync('SELECT * FROM expected_income'),
  };
}

export async function markBackedUp(): Promise<void> {
  await getDatabase().runAsync('UPDATE app_settings SET last_backup_at=?, changes_since_backup=0 WHERE id=1', now());
}

export async function eraseFinancialData(): Promise<void> {
  const db = getDatabase();
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.execAsync('DELETE FROM expected_income; DELETE FROM income; DELETE FROM loan_projects; DELETE FROM loan_transactions; DELETE FROM loan_people; DELETE FROM expenses; DELETE FROM categories;');
    const timestamp = now();
    for (const [categoryId, nameEn, nameUz, color] of seedCategories) {
      await tx.runAsync('INSERT INTO categories (id, name_en, name_uz, color, created_at) VALUES (?, ?, ?, ?, ?)', categoryId, nameEn, nameUz, color, timestamp);
    }
    await tx.runAsync('UPDATE app_settings SET opening_balance=0, opening_date=?, changes_since_backup=0, last_backup_at=NULL, last_used_category_id=NULL WHERE id=1', today());
  });
}
