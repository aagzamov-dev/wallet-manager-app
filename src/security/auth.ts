import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { fromByteArray, toByteArray } from 'base64-js';

const PIN_KEY = 'mymoney.pin.v1';
const ATTEMPTS_KEY = 'mymoney.pin.attempts.v1';
const options: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
const encoder = new TextEncoder();

type LegacyPinRecord = { salt: string; verifier: string; iterations: number; digits?: 4 | 6 };
type AttemptRecord = { failures: number; blockedUntil: number };
type PinRecord = {
  version: 2;
  algorithm: 'SHA-256';
  salt: string;
  verifier: string;
  digits: 4 | 6;
  failures: number;
  blockedUntil: number;
};

let pinRecordCache: PinRecord | LegacyPinRecord | null | undefined;
let pinRecordRequest: Promise<PinRecord | LegacyPinRecord | null> | null = null;
let legacyAttemptsCache: AttemptRecord | null | undefined;
let legacyAttemptsRequest: Promise<AttemptRecord | null> | null = null;

function isPinRecord(record: PinRecord | LegacyPinRecord): record is PinRecord {
  return 'version' in record && record.version === 2;
}

function parsePinRecord(raw: string): PinRecord | LegacyPinRecord {
  const record = JSON.parse(raw) as Partial<PinRecord & LegacyPinRecord>;
  if (record.version === 2 && record.algorithm === 'SHA-256' && (record.digits === 4 || record.digits === 6) && typeof record.salt === 'string' && typeof record.verifier === 'string') {
    return {
      version: 2,
      algorithm: 'SHA-256',
      salt: record.salt,
      verifier: record.verifier,
      digits: record.digits,
      failures: Number.isSafeInteger(record.failures) ? Math.max(0, record.failures ?? 0) : 0,
      blockedUntil: Number.isFinite(record.blockedUntil) ? Math.max(0, record.blockedUntil ?? 0) : 0,
    };
  }
  if (typeof record.salt === 'string' && typeof record.verifier === 'string' && Number.isSafeInteger(record.iterations) && (record.iterations ?? 0) > 0) {
    return {
      salt: record.salt,
      verifier: record.verifier,
      iterations: record.iterations!,
      digits: record.digits === 4 ? 4 : 6,
    };
  }
  throw new Error('The saved PIN record is invalid.');
}

async function readPinRecord(): Promise<PinRecord | LegacyPinRecord | null> {
  if (pinRecordCache !== undefined) return pinRecordCache;
  if (pinRecordRequest) return pinRecordRequest;
  pinRecordRequest = SecureStore.getItemAsync(PIN_KEY, options)
    .then((raw) => {
      const record = raw ? parsePinRecord(raw) : null;
      pinRecordCache = record;
      return record;
    })
    .finally(() => { pinRecordRequest = null; });
  return pinRecordRequest;
}

async function readLegacyAttempts(): Promise<AttemptRecord | null> {
  if (legacyAttemptsCache !== undefined) return legacyAttemptsCache;
  if (legacyAttemptsRequest) return legacyAttemptsRequest;
  legacyAttemptsRequest = SecureStore.getItemAsync(ATTEMPTS_KEY, options)
    .then((raw) => {
      const record = raw ? JSON.parse(raw) as AttemptRecord : null;
      legacyAttemptsCache = record;
      return record;
    })
    .finally(() => { legacyAttemptsRequest = null; });
  return legacyAttemptsRequest;
}

async function fastVerifier(pin: string, salt: string): Promise<Uint8Array> {
  const input = encoder.encode(`wallet-manager-pin-v2\u0000${salt}\u0000${pin}`);
  const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, input);
  return new Uint8Array(digest);
}

async function legacyVerifier(pin: string, record: LegacyPinRecord): Promise<Uint8Array> {
  return pbkdf2Async(sha256, pin, toByteArray(record.salt), { c: record.iterations, dkLen: 32, asyncTick: 8 });
}

function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}

function nextDelay(failures: number): number {
  return failures < 5 ? 0 : Math.min(300_000, 5_000 * 2 ** (failures - 5));
}

async function createPinRecord(pin: string, failures = 0, blockedUntil = 0): Promise<PinRecord> {
  const salt = fromByteArray(await Crypto.getRandomBytesAsync(16));
  const verifier = fromByteArray(await fastVerifier(pin, salt));
  const digits = pin.length === 6 ? 6 : 4;
  return { version: 2, algorithm: 'SHA-256', salt, verifier, digits, failures, blockedUntil };
}

async function writePinRecord(record: PinRecord): Promise<void> {
  await SecureStore.setItemAsync(PIN_KEY, JSON.stringify(record), options);
  pinRecordCache = record;
}

export async function getPinStatus(): Promise<{ exists: boolean; digits: 4 | 6 }> {
  const record = await readPinRecord();
  return { exists: Boolean(record), digits: record?.digits ?? 4 };
}

export async function hasPin(): Promise<boolean> {
  return (await getPinStatus()).exists;
}

export async function savePin(pin: string): Promise<void> {
  if (!/^\d{4}$/.test(pin)) throw new Error('PIN must contain exactly four digits');
  await writePinRecord(await createPinRecord(pin));
  legacyAttemptsCache = null;
  await SecureStore.deleteItemAsync(ATTEMPTS_KEY, options);
}

export async function getPinDigits(): Promise<4 | 6> {
  return (await getPinStatus()).digits;
}

export async function pinDelaySeconds(): Promise<number> {
  const record = await readPinRecord();
  const blockedUntil = record && isPinRecord(record) ? record.blockedUntil : (await readLegacyAttempts())?.blockedUntil ?? 0;
  return Math.max(0, Math.ceil((blockedUntil - Date.now()) / 1000));
}

export async function verifyPin(pin: string): Promise<boolean> {
  const record = await readPinRecord();
  if (!record) return false;

  const blockedUntil = isPinRecord(record) ? record.blockedUntil : (await readLegacyAttempts())?.blockedUntil ?? 0;
  const delay = Math.max(0, Math.ceil((blockedUntil - Date.now()) / 1000));
  if (delay > 0) throw new Error(`Try again in ${delay} seconds`);

  const candidate = isPinRecord(record) ? await fastVerifier(pin, record.salt) : await legacyVerifier(pin, record);
  const valid = equalBytes(candidate, toByteArray(record.verifier));
  if (valid) {
    if (isPinRecord(record)) {
      if (record.failures > 0 || record.blockedUntil > 0) await writePinRecord({ ...record, failures: 0, blockedUntil: 0 });
    } else {
      await writePinRecord(await createPinRecord(pin));
      legacyAttemptsCache = null;
      await SecureStore.deleteItemAsync(ATTEMPTS_KEY, options);
    }
    return true;
  }

  if (isPinRecord(record)) {
    const failures = record.failures + 1;
    await writePinRecord({ ...record, failures, blockedUntil: Date.now() + nextDelay(failures) });
  } else {
    const attempts = await readLegacyAttempts() ?? { failures: 0, blockedUntil: 0 };
    const failures = attempts.failures + 1;
    const next = { failures, blockedUntil: Date.now() + nextDelay(failures) };
    await SecureStore.setItemAsync(ATTEMPTS_KEY, JSON.stringify(next), options);
    legacyAttemptsCache = next;
  }
  return false;
}

export async function removePin(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(PIN_KEY, options),
    SecureStore.deleteItemAsync(ATTEMPTS_KEY, options),
  ]);
  pinRecordCache = null;
  legacyAttemptsCache = null;
}
