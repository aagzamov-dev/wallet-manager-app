import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { PinCodeInput } from '@/components/controls';
import { GhostButton, Screen, uiStyles } from '@/components/ui';
import { getSettings } from '@/data/repository';
import { recordError } from '@/errors/error-log';
import { useI18n } from '@/i18n/provider';
import { useSession } from '@/security/session';
import { colors, spacing } from '@/theme/tokens';

export default function UnlockScreen() {
  const { t } = useI18n();
  const { unlockWithPin, unlockWithBiometrics, deviceAuthenticationAvailable, pinDigits } = useSession();
  const { data: settings, isLoading: settingsLoading } = useQuery({ queryKey: ['settings'], queryFn: getSettings });
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const biometricAttempted = useRef(false);

  const goHome = useCallback(() => router.replace(settings?.quickEntryOnUnlock === false ? '/(tabs)/expenses' : '/(tabs)/expenses?compose=1'), [router, settings?.quickEntryOnUnlock]);
  const deviceUnlock = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      if (await unlockWithBiometrics()) goHome();
    } finally {
      setLoading(false);
    }
  }, [goHome, loading, unlockWithBiometrics]);

  useEffect(() => {
    if (!settingsLoading && settings?.biometricEnabled && deviceAuthenticationAvailable && !biometricAttempted.current) {
      biometricAttempted.current = true;
      void deviceUnlock();
    }
  }, [deviceAuthenticationAvailable, deviceUnlock, settings?.biometricEnabled, settingsLoading]);

  const unlock = async (candidate: string) => {
    if (candidate.length !== pinDigits || loading) return;
    setLoading(true);
    try {
      if (await unlockWithPin(candidate)) goHome();
      else { setPin(''); Alert.alert(t('wrongPin')); }
    } catch (error) {
      void recordError('PIN unlock', error);
      setPin('');
      Alert.alert('Locked', error instanceof Error ? error.message : t('wrongPin'));
    }
    finally { setLoading(false); }
  };
  return <Screen contentStyle={{ justifyContent: 'center' }}>
    <View style={styles.heading}><Text style={uiStyles.title}>{t('unlock')}</Text><Text style={uiStyles.subtitle}>Enter your app PIN. Wallet Manager opens automatically when it is complete.</Text></View>
    <PinCodeInput label="PIN" value={pin} onChangeText={setPin} digits={pinDigits} disabled={loading} onComplete={(value) => void unlock(value)} />
    {loading ? <Text style={styles.checking}>Checking…</Text> : null}
    {settings?.biometricEnabled && deviceAuthenticationAvailable ? <GhostButton label={t('useFingerprint')} onPress={deviceUnlock} /> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  heading: { gap: spacing.sm, alignItems: 'center' },
  checking: { color: colors.secondary, textAlign: 'center' },
});
