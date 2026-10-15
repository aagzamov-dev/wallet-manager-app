import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, ErrorBlock, GhostButton, Header, ListRow, LoadingBlock, PrimaryButton, Screen, Segmented, uiStyles } from '@/components/ui';
import { MoneyField, PinCodeInput } from '@/components/controls';
import { refreshQueries } from '@/data/query-cache';
import { getSettings, updateSettings } from '@/data/repository';
import type { DisplayCurrency, Language } from '@/domain/types';
import { recordError } from '@/errors/error-log';
import { useI18n } from '@/i18n/provider';
import { useSession } from '@/security/session';
import { verifyPin } from '@/security/auth';
import { colors, radius, spacing } from '@/theme/tokens';

const launchedAt = Date.now();
export default function SettingsScreen() {
  const { t } = useI18n(); const router = useRouter(); const queryClient = useQueryClient(); const { deviceAuthenticationAvailable, pinDigits, createPin, lock } = useSession();
  const { data: settings, isLoading: settingsLoading, error: settingsError, refetch: refetchSettings } = useQuery({ queryKey: ['settings'], queryFn: getSettings });
  const [opening, setOpening] = useState(''); const [rate, setRate] = useState('');
  const [changePin, setChangePin] = useState(false); const [pinStep, setPinStep] = useState<'current' | 'new' | 'confirm'>('current'); const [currentPin, setCurrentPin] = useState(''); const [newPin, setNewPin] = useState(''); const [confirmPin, setConfirmPin] = useState(''); const [pinChanging, setPinChanging] = useState(false);
  const update = useMutation({ mutationKey: ['settings-update'], mutationFn: updateSettings, onSuccess: () => refreshQueries(queryClient, ['settings', 'dashboard']), onError: (error) => Alert.alert('Settings', error instanceof Error ? error.message : 'The setting could not be saved.') });
  const backupDue = useMemo(() => {
    if (!settings) return false;
    const reference = settings.lastBackupAt ?? `${settings.openingDate}T00:00:00.000Z`;
    const old = launchedAt - new Date(reference).getTime() >= 7 * 86_400_000;
    return settings.changesSinceBackup >= 25 || (settings.changesSinceBackup > 0 && old);
  }, [settings]);
  if (settingsLoading) return <Screen><LoadingBlock label="Loading settings…" /></Screen>;
  if (settingsError || !settings) return <Screen><ErrorBlock message="Settings could not be loaded. The error was saved in the local error log." onRetry={() => { void refetchSettings(); }} /></Screen>;

  const saveOpening = () => {
    const value = Number(opening.replace(/[^0-9-]/g, '')); if (!Number.isSafeInteger(value)) return Alert.alert('Opening balance', 'Enter a valid whole UZS amount.');
    Alert.alert('Recalculate wallet?', 'Changing the opening balance recalculates all dashboard totals.', [{ text: t('cancel') }, { text: t('continue'), onPress: () => { update.mutate({ openingBalance: value }); setOpening(''); } }]);
  };
  const closePinChange = () => { setChangePin(false); setPinStep('current'); setCurrentPin(''); setNewPin(''); setConfirmPin(''); };
  const completePinStep = async (candidate: string) => {
    if (pinChanging) return;
    if (pinStep === 'current') {
      setPinChanging(true);
      try {
        if (!(await verifyPin(candidate))) { setCurrentPin(''); Alert.alert(t('wrongPin')); return; }
        setCurrentPin(candidate); setNewPin(''); setPinStep('new');
      } catch (error) {
        void recordError('Verify current PIN', error); setCurrentPin(''); Alert.alert('PIN', error instanceof Error ? error.message : 'Could not verify the PIN.');
      } finally { setPinChanging(false); }
      return;
    }
    if (pinStep === 'new') { setNewPin(candidate); setConfirmPin(''); setPinStep('confirm'); return; }
    if (candidate !== newPin) { setConfirmPin(''); Alert.alert('PIN', 'PIN confirmation does not match. Try again.'); return; }
    setPinChanging(true);
    try {
      await createPin(candidate); closePinChange(); Alert.alert('PIN changed');
    } catch (error) { void recordError('Change PIN', error); setConfirmPin(''); Alert.alert('PIN', error instanceof Error ? error.message : 'Could not change PIN.'); }
    finally { setPinChanging(false); }
  };

  return <>
    <Screen>
      <Header title={t('settings')} action={<Pressable onPress={() => router.back()}><Text style={styles.action}>Done</Text></Pressable>} />
      {backupDue ? <Card style={styles.reminder}><Text style={styles.reminderText}>{t('backupReminder')}</Text></Card> : null}
      <Text style={uiStyles.sectionTitle}>{t('language')}</Text><Segmented<Language> value={settings.language} onChange={(language) => update.mutate({ language })} options={[{ value: 'en', label: 'English' }, { value: 'uz', label: 'O‘zbekcha' }]} />
      <Text style={uiStyles.sectionTitle}>{t('currency')}</Text><Segmented<DisplayCurrency> value={settings.displayCurrency} onChange={(displayCurrency) => update.mutate({ displayCurrency })} options={[{ value: 'UZS', label: 'UZS' }, { value: 'USD', label: 'USD' }]} />
      {settings.displayCurrency === 'USD' ? <View style={styles.inline}><View style={{ flex: 1 }}><MoneyField label={t('usdRate')} value={rate} onChangeText={setRate} placeholder={String(settings.usdRateUzs)} /></View><GhostButton label={t('saveExpense').split(' ')[0]} onPress={() => { const value = Number(rate.replace(/\s/g, '')); if (Number.isSafeInteger(value) && value > 0) update.mutate({ usdRateUzs: value }); }} /></View> : null}
      <Text style={uiStyles.sectionTitle}>Wallet</Text><Card><Text style={uiStyles.label}>{t('openingBalance')}</Text><Text style={uiStyles.amount}>{settings.openingBalance.toLocaleString('en-US')} UZS</Text><MoneyField label="New opening balance" value={opening} onChangeText={setOpening} allowNegative placeholder={String(settings.openingBalance)} /><PrimaryButton label="Update opening balance" onPress={saveOpening} disabled={!opening} /></Card>
      <Text style={uiStyles.sectionTitle}>Quick entry</Text><Card><View style={styles.switchRow}><Text style={styles.switchText}>{t('quickAfterUnlock')}</Text><Switch value={settings.quickEntryOnUnlock} onValueChange={(quickEntryOnUnlock) => update.mutate({ quickEntryOnUnlock })} trackColor={{ false: colors.border, true: colors.primary }} /></View></Card>
      <Text style={uiStyles.sectionTitle}>{t('categories')}</Text><Card><ListRow title={t('categories')} subtitle="English required · Uzbek optional" onPress={() => router.push('/categories')} /></Card>
      <Text style={uiStyles.sectionTitle}>{t('security')}</Text><Card>{deviceAuthenticationAvailable ? <View style={styles.switchRow}><View style={styles.switchText}><Text style={styles.switchTitle}>{t('useBiometrics')}</Text><Text style={styles.switchHelp}>{t('phoneUnlockHelp')}</Text></View><Switch value={settings.biometricEnabled} onValueChange={(biometricEnabled) => update.mutate({ biometricEnabled })} trackColor={{ false: colors.border, true: colors.primary }} /></View> : null}<Text style={uiStyles.label}>{t('lockTimeout')}</Text><Segmented value={String(settings.lockTimeoutMinutes)} onChange={(value) => update.mutate({ lockTimeoutMinutes: Number(value) as 0 | 1 | 5 | 15 })} options={[{ value: '0', label: 'Now' }, { value: '1', label: '1m' }, { value: '5', label: '5m' }, { value: '15', label: '15m' }]} /><GhostButton label={t('changePin')} onPress={() => { closePinChange(); setChangePin(true); }} /><GhostButton label="Lock now" onPress={lock} /></Card>
      <Text style={uiStyles.sectionTitle}>{t('backups')}</Text><Card><ListRow title={t('backups')} subtitle="Encrypted Drive backup, JSON export, and restore" onPress={() => router.push('/backup')} /></Card>
      <Text style={uiStyles.sectionTitle}>Diagnostics</Text><Card><ListRow title="Error log" subtitle="View locally saved app errors" onPress={() => router.push('/error-log')} /></Card>
      <Text style={uiStyles.sectionTitle}>{t('appInfo')}</Text><Card><Text style={uiStyles.subtitle}>Wallet Manager {Constants.expoConfig?.version ?? '1.4.0'} · Offline financial data</Text><Text style={uiStyles.subtitle}>No account, analytics, backend, or financial-data sync. Internet is used only to receive app updates.</Text></Card>
    </Screen>
    <Modal visible={changePin} transparent animationType="fade" onRequestClose={closePinChange}><View style={styles.modalBackdrop}><View style={styles.modal}><Text style={uiStyles.sectionTitle}>{t('changePin')}</Text>{pinStep === 'current' ? <PinCodeInput key="current" digits={pinDigits} label="Enter current PIN" value={currentPin} onChangeText={setCurrentPin} disabled={pinChanging} onComplete={(value) => { void completePinStep(value); }} /> : null}{pinStep === 'new' ? <PinCodeInput key="new" label="Enter new PIN" value={newPin} onChangeText={setNewPin} disabled={pinChanging} onComplete={(value) => { void completePinStep(value); }} /> : null}{pinStep === 'confirm' ? <PinCodeInput key="confirm" label="Confirm new PIN" value={confirmPin} onChangeText={setConfirmPin} disabled={pinChanging} onComplete={(value) => { void completePinStep(value); }} /> : null}{pinChanging ? <Text style={styles.checking}>Checking…</Text> : null}<GhostButton label={t('cancel')} onPress={closePinChange} disabled={pinChanging} /></View></View></Modal>
  </>;
}

const styles = StyleSheet.create({
  action: { color: colors.primary, minHeight: 48, textAlignVertical: 'center', fontWeight: '700' }, reminder: { backgroundColor: '#3A3222', borderColor: colors.warning }, reminderText: { color: colors.warning, lineHeight: 20 },
  inline: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }, switchRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }, switchText: { flex: 1, gap: spacing.xs }, switchTitle: { color: colors.text, fontSize: 16 }, switchHelp: { color: colors.secondary, fontSize: 12, lineHeight: 17 },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.overlay }, modal: { backgroundColor: colors.elevated, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.lg },
  checking: { color: colors.secondary, textAlign: 'center' },
});
