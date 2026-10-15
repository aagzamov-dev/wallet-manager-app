import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { fromByteArray, toByteArray } from 'base64-js';

const PIN_KEY = 'mymoney.pin.v1';
const ATTEMPTS_KEY = 'mymoney.pin.attempts.v1';
const options: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

type PinRecord = { salt: string; verifier: string; iterations: number; digits?: 4 | 6 };
type AttemptRecord = { failures: number; blockedUntil: number };

async function derive(pin: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  return pbkdf2Async(sha256, pin, salt, { c: iterations, dkLen: 32, asyncTick: 8 });
}

function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}

export async function hasPin(): Promise<boolean> {
  return Boolean(await SecureStore.getItemAsync(PIN_KEY, options));
}

export async function savePin(pin: string): Promise<void> {
  if (!/^\d{4}$/.test(pin)) throw new Error('PIN must contain exactly four digits');
  const salt = await Crypto.getRandomBytesAsync(16);
  const iterations = 210_000;
  const verifier = await derive(pin, salt, iterations);
  const record: PinRecord = { salt: fromByteArray(salt), verifier: fromByteArray(verifier), iterations, digits: 4 };
  await SecureStore.setItemAsync(PIN_KEY, JSON.stringify(record), options);
  await SecureStore.deleteItemAsync(ATTEMPTS_KEY, options);
}

export async function getPinDigits(): Promise<4 | 6> {
  const raw = await SecureStore.getItemAsync(PIN_KEY, options);
  if (!raw) return 4;
  return (JSON.parse(raw) as PinRecord).digits ?? 6;
}

export async function pinDelaySeconds(): Promise<number> {
  const raw = await SecureStore.getItemAsync(ATTEMPTS_KEY, options);
  if (!raw) return 0;
  const record = JSON.parse(raw) as AttemptRecord;
  return Math.max(0, Math.ceil((record.blockedUntil - Date.now()) / 1000));
}

export async function verifyPin(pin: string): Promise<boolean> {
  const delay = await pinDelaySeconds();
  if (delay > 0) throw new Error(`Try again in ${delay} seconds`);
  const raw = await SecureStore.getItemAsync(PIN_KEY, options);
  if (!raw) return false;
  const record = JSON.parse(raw) as PinRecord;
  const candidate = await derive(pin, toByteArray(record.salt), record.iterations);
  const valid = equalBytes(candidate, toByteArray(record.verifier));
  if (valid) {
    await SecureStore.deleteItemAsync(ATTEMPTS_KEY, options);
    return true;
  }
  const attemptsRaw = await SecureStore.getItemAsync(ATTEMPTS_KEY, options);
  const attempts = attemptsRaw ? (JSON.parse(attemptsRaw) as AttemptRecord) : { failures: 0, blockedUntil: 0 };
  const failures = attempts.failures + 1;
  const delayMs = failures < 5 ? 0 : Math.min(300_000, 5_000 * 2 ** (failures - 5));
  await SecureStore.setItemAsync(ATTEMPTS_KEY, JSON.stringify({ failures, blockedUntil: Date.now() + delayMs }), options);
  return false;
}

export async function removePin(): Promise<void> {
  await SecureStore.deleteItemAsync(PIN_KEY, options);
  await SecureStore.deleteItemAsync(ATTEMPTS_KEY, options);
}
