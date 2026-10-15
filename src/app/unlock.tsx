import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { PinCodeInput } from '@/components/controls';
import { GhostButton, Screen, uiStyles } from '@/components/ui';
import { getSettings } from '@/data/repository';
import { useI18n } from '@/i18n/provider';
import { useSession } from '@/security/session';
import { colors, spacing } from '@/theme/tokens';

export default function UnlockScreen() {
  const { t } = useI18n();
  const { unlockWithPin, unlockWithBiometrics, deviceAuthenticationAvailable, pinDigits } = useSession();
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: getSettings });
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const goHome = useCallback(() => router.replace(settings?.quickEntryOnUnlock === false ? '/(tabs)/expenses' : '/(tabs)/expenses?compose=1'), [router, settings?.quickEntryOnUnlock]);
  const deviceUnlock = useCallback(async () => { if (await unlockWithBiometrics()) goHome(); }, [goHome, unlockWithBiometrics]);

  useEffect(() => {
    if (settings?.biometricEnabled && deviceAuthenticationAvailable) void deviceUnlock();
  }, [deviceAuthenticationAvailable, deviceUnlock, settings?.biometricEnabled]);

  const unlock = async (candidate: string) => {
    if (candidate.length !== pinDigits || loading) return;
    setLoading(true);
    try {
      if (await unlockWithPin(candidate)) goHome();
      else { setPin(''); Alert.alert(t('wrongPin')); }
    } catch (error) { Alert.alert('Locked', error instanceof Error ? error.message : t('wrongPin')); }
    finally { setLoading(false); }
  };
  return <Screen contentStyle={{ justifyContent: 'center' }}>
    <View style={styles.heading}><Text style={uiStyles.title}>{t('unlock')}</Text><Text style={uiStyles.subtitle}>{pinDigits === 4 ? 'Enter your 4-digit app PIN. It opens automatically.' : 'Enter your existing 6-digit PIN, then change it to four digits in Settings.'}</Text></View>
    <PinCodeInput autoFocus label="PIN" value={pin} onChangeText={setPin} digits={pinDigits} onComplete={(value) => void unlock(value)} />
    {loading ? <Text style={styles.checking}>Checking…</Text> : null}
    {settings?.biometricEnabled && deviceAuthenticationAvailable ? <GhostButton label={t('useFingerprint')} onPress={deviceUnlock} /> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  heading: { gap: spacing.sm, alignItems: 'center' },
  checking: { color: colors.secondary, textAlign: 'center' },
});
