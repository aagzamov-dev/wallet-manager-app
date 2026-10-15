import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { AESEncryptionKey, AESSealedData, aesDecryptAsync, aesEncryptAsync } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { fromByteArray, toByteArray } from 'base64-js';
import { z } from 'zod';
import { dumpDatabase } from '@/data/repository';
import { getDatabase } from '@/data/database';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const BACKUP_KEY = 'mymoney.internal-backup-key.v1';
const BACKUP_PASSWORD_KEY = 'mymoney.backup-password.v1';
const secureStoreOptions: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timestamp = z.string().datetime();
const nullableText = z.string().nullable();

const categorySchema = z.object({
  id: z.string().min(1), name_en: z.string().min(1), name_uz: z.string(),
  description_en: z.string().nullable().optional(), description_uz: z.string().nullable().optional(),
  color: z.string().min(1), use_count: z.number().int().nonnegative(), created_at: timestamp,
});
const expenseSchema = z.object({ id: z.string().min(1), amount: z.number().int().positive(), title: z.string().min(1), note: nullableText, date: z.string().regex(datePattern), category_id: z.string().nullable(), created_at: timestamp, updated_at: timestamp });
const incomeSchema = z.object({ id: z.string().min(1), amount: z.number().int().positive(), title: z.string().min(1), note: nullableText, date: z.string().regex(datePattern), project_id: z.string().nullable(), created_at: timestamp, updated_at: timestamp });
const personSchema = z.object({ id: z.string().min(1), name: z.string().min(1), note: nullableText, created_at: timestamp, updated_at: timestamp });
const transactionSchema = z.object({ id: z.string().min(1), person_id: z.string().min(1), kind: z.enum(['GIVE', 'RETURN']), amount: z.number().int().positive(), note: nullableText, date: z.string().regex(datePattern), created_at: timestamp });
const projectSchema = z.object({ id: z.string().min(1), name: z.string().min(1), borrower: nullableText, note: nullableText, created_at: timestamp, updated_at: timestamp });
const expectedSchema = z.object({ id: z.string().min(1), project_id: z.string().min(1), amount: z.number().int().positive(), due_date: z.string().regex(datePattern), status: z.enum(['UPCOMING', 'OVERDUE', 'PARTIAL', 'RECEIVED']), note: nullableText, parent_id: z.string().nullable(), created_at: timestamp, updated_at: timestamp });

export const backupSchema = z.object({
  format: z.literal('my-money-backup'), schemaVersion: z.literal(1), appVersion: z.string(), exportedAt: timestamp,
  settings: z.object({
    language: z.enum(['en', 'uz']), displayCurrency: z.enum(['UZS', 'USD']), usdRateUzs: z.number().int().positive(),
    openingBalance: z.number().int().safe(), openingDate: z.string().regex(datePattern),
    quickEntryOnUnlock: z.boolean(), lockTimeoutMinutes: z.union([z.literal(0), z.literal(1), z.literal(5), z.literal(15)]),
  }),
  entities: z.object({ categories: z.array(categorySchema), expenses: z.array(expenseSchema), income: z.array(incomeSchema), people: z.array(personSchema), transactions: z.array(transactionSchema), projects: z.array(projectSchema), expectedIncome: z.array(expectedSchema) }),
});
export type BackupDocument = z.infer<typeof backupSchema>;

const encryptedSchema = z.object({
  format: z.literal('my-money-encrypted'), version: z.literal(1),
  kdf: z.object({ name: z.literal('PBKDF2-HMAC-SHA256'), iterations: z.number().int().positive(), salt: z.string() }),
  cipher: z.object({ name: z.literal('AES-256-GCM'), combined: z.string() }),
});

function createDocument(): Promise<BackupDocument> {
  return dumpDatabase().then((dump) => backupSchema.parse({
    format: 'my-money-backup', schemaVersion: 1, appVersion: Constants.expoConfig?.version ?? '1.0.0', exportedAt: new Date().toISOString(),
    settings: {
      language: dump.settings.language, displayCurrency: dump.settings.display_currency, usdRateUzs: dump.settings.usd_rate_uzs,
      openingBalance: dump.settings.opening_balance, openingDate: dump.settings.opening_date,
      quickEntryOnUnlock: Boolean(dump.settings.quick_entry_on_unlock), lockTimeoutMinutes: dump.settings.lock_timeout_minutes,
    },
    entities: { categories: dump.categories, expenses: dump.expenses, income: dump.income, people: dump.people, transactions: dump.transactions, projects: dump.projects, expectedIncome: dump.expectedIncome },
  }));
}

function validateRelationships(document: BackupDocument): void {
  const categories = new Set(document.entities.categories.map((item) => item.id));
  const people = new Set(document.entities.people.map((item) => item.id));
  const projects = new Set(document.entities.projects.map((item) => item.id));
  const expected = new Set(document.entities.expectedIncome.map((item) => item.id));
  if (document.entities.expenses.some((item) => item.category_id && !categories.has(item.category_id))) throw new Error('An expense references a missing category.');
  if (document.entities.transactions.some((item) => !people.has(item.person_id))) throw new Error('A loan transaction references a missing person.');
  if (document.entities.income.some((item) => item.project_id && !projects.has(item.project_id))) throw new Error('Income references a missing project.');
  if (document.entities.expectedIncome.some((item) => !projects.has(item.project_id) || (item.parent_id && !expected.has(item.parent_id)))) throw new Error('An expected payment has a broken relationship.');
}

async function passwordKey(password: string, salt: Uint8Array, iterations: number): Promise<AESEncryptionKey> {
  const bytes = await pbkdf2Async(sha256, password, salt, { c: iterations, dkLen: 32, asyncTick: 8 });
  return AESEncryptionKey.import(bytes);
}

export async function hasSavedBackupPassword(): Promise<boolean> {
  return Boolean(await SecureStore.getItemAsync(BACKUP_PASSWORD_KEY, secureStoreOptions));
}

export async function getSavedBackupPassword(): Promise<string | null> {
  return SecureStore.getItemAsync(BACKUP_PASSWORD_KEY, secureStoreOptions);
}

export async function saveBackupPassword(password: string): Promise<void> {
  if (password.length < 8) throw new Error('Use a backup password with at least 8 characters.');
  await SecureStore.setItemAsync(BACKUP_PASSWORD_KEY, password, secureStoreOptions);
}

export async function encryptBackup(document: BackupDocument, password: string): Promise<string> {
  if (password.length < 8) throw new Error('Use a backup password with at least 8 characters.');
  const salt = await Crypto.getRandomBytesAsync(16); const iterations = 310_000;
  const key = await passwordKey(password, salt, iterations);
  const sealed = await aesEncryptAsync(textEncoder.encode(JSON.stringify(document)), key, { nonce: { length: 12 }, tagLength: 16 });
  return JSON.stringify({ format: 'my-money-encrypted', version: 1, kdf: { name: 'PBKDF2-HMAC-SHA256', iterations, salt: fromByteArray(salt) }, cipher: { name: 'AES-256-GCM', combined: await sealed.combined('base64') } });
}

export async function decryptBackup(contents: string, password: string): Promise<BackupDocument> {
  const wrapper = encryptedSchema.parse(JSON.parse(contents));
  try {
    const key = await passwordKey(password, toByteArray(wrapper.kdf.salt), wrapper.kdf.iterations);
    const sealed = AESSealedData.fromCombined(wrapper.cipher.combined, { ivLength: 12, tagLength: 16 });
    const bytes = await aesDecryptAsync(sealed, key);
    const document = backupSchema.parse(JSON.parse(textDecoder.decode(bytes)));
    validateRelationships(document); return document;
  } catch { throw new Error('Wrong password or damaged backup. Your current data was not changed.'); }
}

function writeCacheFile(name: string, contents: string): File {
  const file = new File(Paths.cache, name); file.create({ overwrite: true, intermediates: true }); file.write(contents); return file;
}

export async function exportPlainBackup(): Promise<void> {
  const document = await createDocument();
  const file = writeCacheFile(`wallet-manager-${document.exportedAt.slice(0, 10)}.json`, JSON.stringify(document, null, 2));
  if (!(await Sharing.isAvailableAsync())) throw new Error('File sharing is not available on this device.');
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Save Wallet Manager backup' });
}

export async function exportEncryptedBackup(password: string): Promise<void> {
  const document = await createDocument(); const contents = await encryptBackup(document, password);
  const file = writeCacheFile(`wallet-manager-${document.exportedAt.slice(0, 10)}.mymoney`, contents);
  if (!(await Sharing.isAvailableAsync())) throw new Error('File sharing is not available on this device.');
  await Sharing.shareAsync(file.uri, { mimeType: 'application/octet-stream', dialogTitle: 'Choose Google Drive to save your encrypted backup' });
}

export async function pickBackup(): Promise<{ contents: string; encrypted: boolean } | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'application/octet-stream', 'text/plain'], copyToCacheDirectory: true, multiple: false });
  if (result.canceled) return null;
  const contents = await new File(result.assets[0].uri).text();
  const raw = JSON.parse(contents) as { format?: unknown };
  return { contents, encrypted: raw.format === 'my-money-encrypted' };
}

export function parsePlainBackup(contents: string): BackupDocument {
  const document = backupSchema.parse(JSON.parse(contents)); validateRelationships(document); return document;
}

export function backupSummary(document: BackupDocument): string {
  const entities = document.entities;
  return `Backup: ${document.exportedAt.slice(0, 10)}\n${entities.expenses.length} expenses · ${entities.income.length} income\n${entities.people.length} people · ${entities.projects.length} projects`;
}

async function createSafetySnapshot(): Promise<void> {
  const document = await createDocument();
  let keyRaw = await SecureStore.getItemAsync(BACKUP_KEY);
  if (!keyRaw) { keyRaw = fromByteArray(await Crypto.getRandomBytesAsync(32)); await SecureStore.setItemAsync(BACKUP_KEY, keyRaw, secureStoreOptions); }
  const key = await AESEncryptionKey.import(keyRaw, 'base64');
  const sealed = await aesEncryptAsync(textEncoder.encode(JSON.stringify(document)), key, { nonce: { length: 12 }, tagLength: 16 });
  const directory = new Directory(Paths.document, 'safety-backups'); directory.create({ idempotent: true, intermediates: true });
  const file = new File(directory, `safety-${Date.now()}.bin`); file.create(); file.write(await sealed.combined('base64'));
  const oldFiles = directory.list().filter((item): item is File => item instanceof File).sort((a, b) => (b.modificationTime ?? 0) - (a.modificationTime ?? 0)).slice(3);
  oldFiles.forEach((item) => item.delete());
}

export async function replaceFromBackup(document: BackupDocument): Promise<void> {
  validateRelationships(document); await createSafetySnapshot(); const db = getDatabase(); const e = document.entities;
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.execAsync('DELETE FROM expected_income; DELETE FROM income; DELETE FROM loan_projects; DELETE FROM loan_transactions; DELETE FROM loan_people; DELETE FROM expenses; DELETE FROM categories;');
    for (const item of e.categories) await tx.runAsync(
      'INSERT INTO categories (id, name_en, name_uz, color, use_count, created_at, description_en, description_uz) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      item.id, item.name_en, item.name_uz, item.color, item.use_count, item.created_at, item.description_en ?? null, item.description_uz ?? null,
    );
    for (const item of e.projects) await tx.runAsync('INSERT INTO loan_projects VALUES (?, ?, ?, ?, ?, ?)', item.id, item.name, item.borrower, item.note, item.created_at, item.updated_at);
    for (const item of e.people) await tx.runAsync('INSERT INTO loan_people VALUES (?, ?, ?, ?, ?)', item.id, item.name, item.note, item.created_at, item.updated_at);
    for (const item of e.expenses) await tx.runAsync('INSERT INTO expenses VALUES (?, ?, ?, ?, ?, ?, ?, ?)', item.id, item.amount, item.title, item.note, item.date, item.category_id, item.created_at, item.updated_at);
    for (const item of e.income) await tx.runAsync('INSERT INTO income VALUES (?, ?, ?, ?, ?, ?, ?, ?)', item.id, item.amount, item.title, item.note, item.date, item.project_id, item.created_at, item.updated_at);
    for (const item of e.transactions) await tx.runAsync('INSERT INTO loan_transactions VALUES (?, ?, ?, ?, ?, ?, ?)', item.id, item.person_id, item.kind, item.amount, item.note, item.date, item.created_at);
    for (const item of e.expectedIncome) await tx.runAsync('INSERT INTO expected_income VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)', item.id, item.project_id, item.amount, item.due_date, item.status, item.note, item.created_at, item.updated_at);
    for (const item of e.expectedIncome.filter((value) => value.parent_id)) await tx.runAsync('UPDATE expected_income SET parent_id=? WHERE id=?', item.parent_id, item.id);
    await tx.runAsync(`UPDATE app_settings SET language=?, display_currency=?, usd_rate_uzs=?, opening_balance=?, opening_date=?, quick_entry_on_unlock=?, lock_timeout_minutes=?, last_backup_at=?, changes_since_backup=0, last_used_category_id=NULL WHERE id=1`, document.settings.language, document.settings.displayCurrency, document.settings.usdRateUzs, document.settings.openingBalance, document.settings.openingDate, document.settings.quickEntryOnUnlock ? 1 : 0, document.settings.lockTimeoutMinutes, new Date().toISOString());
  });
}
