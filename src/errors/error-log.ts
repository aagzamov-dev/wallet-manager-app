import * as Crypto from 'expo-crypto';
import { File, Paths } from 'expo-file-system';

export type ErrorLogEntry = {
  id: string;
  occurredAt: string;
  area: string;
  message: string;
  details: string | null;
};

const errorLogFile = new File(Paths.document, 'wallet-manager-errors.json');
const maximumEntries = 100;
let writeQueue: Promise<void> = Promise.resolve();

function cleanText(value: string): string {
  return value
    .replace(/password\s*[:=]\s*\S+/gi, 'password=[hidden]')
    .replace(/pin\s*[:=]\s*\d+/gi, 'PIN=[hidden]')
    .slice(0, 2_000);
}

function describeError(error: unknown): { message: string; details: string | null } {
  if (error instanceof Error) {
    return {
      message: cleanText(error.message || error.name),
      details: error.stack ? cleanText(error.stack.split('\n').slice(0, 8).join('\n')) : null,
    };
  }
  return { message: cleanText(String(error)), details: null };
}

export async function readErrorLog(): Promise<ErrorLogEntry[]> {
  if (!errorLogFile.exists) return [];
  try {
    const parsed: unknown = JSON.parse(await errorLogFile.text());
    return Array.isArray(parsed) ? parsed.filter(isErrorLogEntry).slice(0, maximumEntries) : [];
  } catch {
    return [];
  }
}

function isErrorLogEntry(value: unknown): value is ErrorLogEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<ErrorLogEntry>;
  return typeof entry.id === 'string' && typeof entry.occurredAt === 'string'
    && typeof entry.area === 'string' && typeof entry.message === 'string';
}

export function recordError(area: string, error: unknown): Promise<void> {
  const description = describeError(error);
  const entry: ErrorLogEntry = {
    id: Crypto.randomUUID(),
    occurredAt: new Date().toISOString(),
    area: cleanText(area),
    message: description.message,
    details: description.details,
  };

  console.error(`[${entry.area}]`, error);
  writeQueue = writeQueue.catch(() => undefined).then(async () => {
    const entries = await readErrorLog();
    if (!errorLogFile.exists) errorLogFile.create({ intermediates: true });
    errorLogFile.write(JSON.stringify([entry, ...entries].slice(0, maximumEntries)));
  }).catch((writeError: unknown) => {
    console.error('[Error log] Failed to save error', writeError);
  });
  return writeQueue;
}

export async function clearErrorLog(): Promise<void> {
  await writeQueue.catch(() => undefined);
  if (errorLogFile.exists) errorLogFile.delete();
}
