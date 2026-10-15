import * as LocalAuthentication from 'expo-local-authentication';
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { getSettings } from '@/data/repository';
import { recordError } from '@/errors/error-log';
import { getPinDigits, hasPin, savePin, verifyPin } from './auth';

export type SessionStatus = 'loading' | 'setup' | 'locked' | 'unlocked' | 'error';
type SessionValue = {
  status: SessionStatus;
  initializationError: string | null;
  deviceAuthenticationAvailable: boolean;
  pinDigits: 4 | 6;
  createPin: (pin: string) => Promise<void>;
  unlockWithPin: (pin: string) => Promise<boolean>;
  unlockWithBiometrics: () => Promise<boolean>;
  completeSetup: () => void;
  resetForRecovery: () => void;
  lock: () => void;
  retryInitialization: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [deviceAuthenticationAvailable, setDeviceAuthenticationAvailable] = useState(false);
  const [pinDigits, setPinDigits] = useState<4 | 6>(4);
  const backgroundAt = useRef<number | null>(null);

  const initialize = useCallback(async () => {
    setStatus('loading');
    setInitializationError(null);
    try {
      const [settings, pinExists, authenticationLevel, digits] = await Promise.all([
        getSettings(), hasPin(), LocalAuthentication.getEnrolledLevelAsync(), getPinDigits(),
      ]);
      setDeviceAuthenticationAvailable(authenticationLevel !== LocalAuthentication.SecurityLevel.NONE);
      setPinDigits(digits);
      setStatus(settings.onboardingCompleted && pinExists ? 'locked' : 'setup');
    } catch (error) {
      await recordError('App startup', error);
      setInitializationError(error instanceof Error ? error.message : 'The app could not finish loading.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { void initialize(); }, 0);
    return () => clearTimeout(timer);
  }, [initialize]);

  useEffect(() => {
    const onStateChange = async (next: AppStateStatus) => {
      if (next === 'background' || next === 'inactive') backgroundAt.current = Date.now();
      if (next === 'active' && backgroundAt.current && status === 'unlocked') {
        try {
          const settings = await getSettings();
          const elapsed = Date.now() - backgroundAt.current;
          if (settings.lockTimeoutMinutes === 0 || elapsed >= settings.lockTimeoutMinutes * 60_000) setStatus('locked');
        } catch (error) {
          void recordError('Background lock', error);
        } finally {
          backgroundAt.current = null;
        }
      }
    };
    const subscription = AppState.addEventListener('change', onStateChange);
    return () => subscription.remove();
  }, [status]);

  const createPin = useCallback(async (pin: string) => { await savePin(pin); setPinDigits(4); }, []);
  const unlockWithPin = useCallback(async (pin: string) => {
    const valid = await verifyPin(pin);
    if (valid) setStatus('unlocked');
    return valid;
  }, []);
  const unlockWithBiometrics = useCallback(async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Wallet Manager', promptSubtitle: 'Use fingerprint, face, or your Android screen lock',
        cancelLabel: 'Use app PIN', disableDeviceFallback: false, biometricsSecurityLevel: 'strong',
      });
      if (result.success) setStatus('unlocked');
      return result.success;
    } catch (error) {
      await recordError('Device unlock', error);
      return false;
    }
  }, []);

  return (
    <SessionContext.Provider value={{
      status, initializationError, deviceAuthenticationAvailable, pinDigits, createPin, unlockWithPin, unlockWithBiometrics,
      completeSetup: () => setStatus('unlocked'), resetForRecovery: () => setStatus('setup'), lock: () => setStatus('locked'),
      retryInitialization: initialize,
    }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('SessionProvider is missing');
  return value;
}
