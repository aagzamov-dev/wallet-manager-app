import { fromByteArray } from 'base64-js';

const mockSecureValues = new Map<string, string>();
const mockGetItemAsync = jest.fn(async (key: string) => mockSecureValues.get(key) ?? null);
const mockSetItemAsync = jest.fn(async (key: string, value: string) => { mockSecureValues.set(key, value); });
const mockDeleteItemAsync = jest.fn(async (key: string) => { mockSecureValues.delete(key); });
const mockPbkdf2Async = jest.fn(async () => new Uint8Array(32).fill(9));

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 1,
  getItemAsync: mockGetItemAsync,
  setItemAsync: mockSetItemAsync,
  deleteItemAsync: mockDeleteItemAsync,
}));

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  getRandomBytesAsync: jest.fn(async (length: number) => new Uint8Array(length).fill(7)),
  digest: jest.fn(async (_algorithm: string, source: Uint8Array) => {
    const output = new Uint8Array(32);
    source.forEach((value, index) => { output[index % output.length] = (output[index % output.length] + value + index) % 256; });
    return output.buffer;
  }),
}));

jest.mock('@noble/hashes/pbkdf2.js', () => ({ pbkdf2Async: mockPbkdf2Async }));
jest.mock('@noble/hashes/sha2.js', () => ({ sha256: {} }));

type AuthModule = typeof import('./auth');

function loadAuth(): AuthModule {
  return jest.requireActual<AuthModule>('./auth');
}

describe('PIN security storage', () => {
  beforeEach(() => {
    jest.resetModules();
    mockSecureValues.clear();
    mockGetItemAsync.mockClear();
    mockSetItemAsync.mockClear();
    mockDeleteItemAsync.mockClear();
    mockPbkdf2Async.mockClear();
  });

  test('uses one cached secure read and fast native verification after saving', async () => {
    let auth = loadAuth();
    await auth.savePin('1234');

    const stored = JSON.parse(mockSecureValues.get('mymoney.pin.v1') ?? '{}') as { version?: number; algorithm?: string };
    expect(stored).toMatchObject({ version: 2, algorithm: 'SHA-256' });

    jest.resetModules();
    mockGetItemAsync.mockClear();
    auth = loadAuth();
    const [first, second] = await Promise.all([auth.getPinStatus(), auth.getPinStatus()]);

    expect(first).toEqual({ exists: true, digits: 4 });
    expect(second).toEqual(first);
    expect(mockGetItemAsync).toHaveBeenCalledTimes(1);
    await expect(auth.verifyPin('1234')).resolves.toBe(true);
    expect(mockGetItemAsync).toHaveBeenCalledTimes(1);
    expect(mockPbkdf2Async).not.toHaveBeenCalled();
  });

  test('migrates the previous PBKDF2 PIN after one successful unlock', async () => {
    mockSecureValues.set('mymoney.pin.v1', JSON.stringify({
      salt: fromByteArray(new Uint8Array(16).fill(4)),
      verifier: fromByteArray(new Uint8Array(32).fill(9)),
      iterations: 210_000,
      digits: 6,
    }));

    const auth = loadAuth();
    await expect(auth.verifyPin('123456')).resolves.toBe(true);

    const migrated = JSON.parse(mockSecureValues.get('mymoney.pin.v1') ?? '{}') as { version?: number; failures?: number; digits?: number };
    expect(migrated).toMatchObject({ version: 2, failures: 0, digits: 6 });
    expect(mockPbkdf2Async).toHaveBeenCalledTimes(1);
  });
});
