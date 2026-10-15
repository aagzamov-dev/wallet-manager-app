import type { SQLiteDatabase } from 'expo-sqlite';

let database: SQLiteDatabase | null = null;

export function setDatabase(db: SQLiteDatabase): void {
  database = db;
}

export function getDatabase(): SQLiteDatabase {
  if (!database) throw new Error('Database is not ready');
  return database;
}

export const seedCategories = [
  ['category-food', 'Food', 'Oziq-ovqat', '#F5C76B'],
  ['category-transport', 'Transport', 'Transport', '#6EA8FE'],
  ['category-shopping', 'Shopping', 'Xaridlar', '#B59BFF'],
  ['category-bills', 'Bills', 'To‘lovlar', '#FF9F6E'],
  ['category-health', 'Health', 'Salomatlik', '#4FD1A1'],
  ['category-other', 'Other', 'Boshqa', '#AEB9C7'],
] as const;

export async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;

  if (version < 1) await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.execAsync(`
      CREATE TABLE app_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1), language TEXT NOT NULL DEFAULT 'en',
        display_currency TEXT NOT NULL DEFAULT 'UZS', usd_rate_uzs INTEGER NOT NULL DEFAULT 12500,
        opening_balance INTEGER NOT NULL DEFAULT 0, opening_date TEXT NOT NULL DEFAULT '',
        quick_entry_on_unlock INTEGER NOT NULL DEFAULT 1, lock_timeout_minutes INTEGER NOT NULL DEFAULT 1,
        biometric_enabled INTEGER NOT NULL DEFAULT 0, onboarding_completed INTEGER NOT NULL DEFAULT 0,
        last_backup_at TEXT, changes_since_backup INTEGER NOT NULL DEFAULT 0, last_used_category_id TEXT
      );
      CREATE TABLE categories (
        id TEXT PRIMARY KEY, name_en TEXT NOT NULL, name_uz TEXT NOT NULL, color TEXT NOT NULL,
        use_count INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
      );
      CREATE TABLE loan_projects (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, borrower TEXT, note TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE income (
        id TEXT PRIMARY KEY, amount INTEGER NOT NULL CHECK(amount > 0), title TEXT NOT NULL, note TEXT,
        date TEXT NOT NULL, project_id TEXT REFERENCES loan_projects(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE expenses (
        id TEXT PRIMARY KEY, amount INTEGER NOT NULL CHECK(amount > 0), title TEXT NOT NULL, note TEXT,
        date TEXT NOT NULL, category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE loan_people (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, note TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE loan_transactions (
        id TEXT PRIMARY KEY, person_id TEXT NOT NULL REFERENCES loan_people(id) ON DELETE CASCADE,
        kind TEXT NOT NULL CHECK(kind IN ('GIVE','RETURN')), amount INTEGER NOT NULL CHECK(amount > 0),
        note TEXT, date TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE TABLE expected_income (
        id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES loan_projects(id) ON DELETE CASCADE,
        amount INTEGER NOT NULL CHECK(amount > 0), due_date TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('UPCOMING','OVERDUE','PARTIAL','RECEIVED')),
        note TEXT, parent_id TEXT REFERENCES expected_income(id) ON DELETE SET NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE INDEX idx_expenses_date ON expenses(date DESC);
      CREATE INDEX idx_expenses_category ON expenses(category_id);
      CREATE INDEX idx_income_date ON income(date DESC);
      CREATE INDEX idx_income_project ON income(project_id);
      CREATE INDEX idx_loan_transactions_person_date ON loan_transactions(person_id, date DESC);
      CREATE INDEX idx_expected_project_status_date ON expected_income(project_id, status, due_date);
    `);
    await tx.runAsync(`INSERT INTO app_settings (id) VALUES (1)`);
    const now = new Date().toISOString();
    for (const [id, nameEn, nameUz, color] of seedCategories) {
      await tx.runAsync(
        'INSERT INTO categories (id, name_en, name_uz, color, created_at) VALUES (?, ?, ?, ?, ?)',
        id, nameEn, nameUz, color, now,
      );
    }
    await tx.execAsync('PRAGMA user_version = 1;');
  });

  if (version < 2) await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.execAsync(`
      ALTER TABLE categories ADD COLUMN description_en TEXT;
      ALTER TABLE categories ADD COLUMN description_uz TEXT;
      PRAGMA user_version = 2;
    `);
  });
}
