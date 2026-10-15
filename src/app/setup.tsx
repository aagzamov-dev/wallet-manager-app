import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { MoneyField, PinCodeInput } from '@/components/controls';
import { Field, PrimaryButton, Screen, uiStyles } from '@/components/ui';
import { finishOnboarding } from '@/data/repository';
import { refreshQueries } from '@/data/query-cache';
import { today } from '@/domain/money';
import { recordError } from '@/errors/error-log';
import { useI18n } from '@/i18n/provider';
import { useSession } from '@/security/session';
import { colors } from '@/theme/tokens';

export default function SetupScreen() {
  const { t } = useI18n();
  const { createPin, completeSetup, deviceAuthenticationAvailable } = useSession();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [balance, setBalance] = useState('');
  const [openingDate, setOpeningDate] = useState(today());
  const [biometrics, setBiometrics] = useState(deviceAuthenticationAvailable);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'create' | 'confirm' | 'wallet'>('create');

  const completePinEntry = (candidate: string) => {
    if (step === 'create') {
      setPin(candidate);
      setConfirmation('');
      setStep('confirm');
      return;
    }
    if (candidate !== pin) {
      setConfirmation('');
      Alert.alert('PIN', 'PIN confirmation does not match. Try again.');
      return;
    }
    setStep('wallet');
  };

  const submit = async () => {
    const amount = balance.trim() === '' ? 0 : Number(balance.replace(/[^0-9-]/g, ''));
    if (!/^\d{4}$/.test(pin)) return Alert.alert('PIN', 'Enter exactly four digits.');
    if (pin !== confirmation) return Alert.alert('PIN', 'PIN confirmation does not match.');
    if (!Number.isSafeInteger(amount)) return Alert.alert('Balance', 'Enter a valid whole UZS amount.');
    setLoading(true);
    try {
      await createPin(pin);
      await finishOnboarding(amount, openingDate, biometrics && deviceAuthenticationAvailable);
      refreshQueries(queryClient, ['settings', 'categories']);
      completeSetup();
      router.replace('/(tabs)/expenses?compose=1');
    } catch (error) {
      void recordError('First-time setup', error);
      Alert.alert('Setup failed', error instanceof Error ? error.message : 'Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <View style={uiStyles.gap}>
          <Text style={uiStyles.title}>{t('privacyTitle')}</Text>
          <Text style={uiStyles.subtitle}>{t('privacyBody')}</Text>
        </View>
        {step === 'create' ? <PinCodeInput key="create" label={t('createPin')} value={pin} onChangeText={setPin} onComplete={completePinEntry} /> : null}
        {step === 'confirm' ? <>
          <PinCodeInput key="confirm" label={t('confirmPin')} value={confirmation} onChangeText={setConfirmation} onComplete={completePinEntry} />
          <PrimaryButton label="Start again" tone="danger" onPress={() => { setPin(''); setConfirmation(''); setStep('create'); }} />
        </> : null}
        {step === 'wallet' ? <>
          <MoneyField label={`${t('currentWallet')} (UZS)`} value={balance} onChangeText={setBalance} allowNegative placeholder="0" />
          <Field label={t('date')} value={openingDate} onChangeText={setOpeningDate} placeholder="YYYY-MM-DD" maxLength={10} />
          {deviceAuthenticationAvailable ? <View style={[uiStyles.row, { justifyContent: 'space-between' }]}><View style={{ flex: 1 }}><Text style={{ color: colors.text, fontSize: 16 }}>{t('useBiometrics')}</Text><Text style={uiStyles.subtitle}>{t('phoneUnlockHelp')}</Text></View><Switch value={biometrics} onValueChange={setBiometrics} trackColor={{ true: colors.primary, false: colors.border }} /></View> : null}
          <PrimaryButton label={t('continue')} onPress={submit} loading={loading} />
        </> : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}
