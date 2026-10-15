import { useEffect, useMemo, useState } from 'react';
import { Alert, InteractionManager, Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { backupSummary, decryptBackup, exportEncryptedBackup, exportPlainBackup, getSavedBackupPassword, hasSavedBackupPassword, parsePlainBackup, pickBackup, prepareSavedBackupPassword, replaceFromBackup, saveBackupPassword, type BackupDocument } from '@/backup/backup';
import { Card, ErrorBlock, Field, GhostButton, Header, ListRow, LoadingBlock, LoadingOverlay, PrimaryButton, Screen, Segmented, uiStyles } from '@/components/ui';
import { MoneyField, PinCodeInput } from '@/components/controls';
import { getSettings, markBackedUp, updateSettings } from '@/data/repository';
import type { DisplayCurrency, Language } from '@/domain/types';
import { recordError } from '@/errors/error-log';
import { useI18n } from '@/i18n/provider';
import { useSession } from '@/security/session';
import { verifyPin } from '@/security/auth';
import { colors, radius, spacing } from '@/theme/tokens';

type PasswordAction = { type: 'configure' | 'change' } | { type: 'import'; contents: string };
const launchedAt = Date.now();
export default function SettingsScreen() {
  const { t } = useI18n(); const router = useRouter(); const queryClient = useQueryClient(); const { deviceAuthenticationAvailable, pinDigits, createPin, lock } = useSession();
  const { data: settings, isLoading: settingsLoading, error: settingsError, refetch: refetchSettings } = useQuery({ queryKey: ['settings'], queryFn: getSettings });
  const backupPasswordQuery = useQuery({ queryKey: ['backup-password'], queryFn: hasSavedBackupPassword, staleTime: Infinity });
  const backupPasswordConfigured = backupPasswordQuery.data ?? false;
  const [opening, setOpening] = useState(''); const [rate, setRate] = useState(''); const [passwordAction, setPasswordAction] = useState<PasswordAction | null>(null); const [password, setPassword] = useState(''); const [confirmPassword, setConfirmPassword] = useState(''); const [savingBackup, setSavingBackup] = useState(false); const [restoring, setRestoring] = useState(false);
  const [changePin, setChangePin] = useState(false); const [pinStep, setPinStep] = useState<'current' | 'new' | 'confirm'>('current'); const [currentPin, setCurrentPin] = useState(''); const [newPin, setNewPin] = useState(''); const [confirmPin, setConfirmPin] = useState(''); const [pinChanging, setPinChanging] = useState(false);
  useEffect(() => {
    if (!backupPasswordConfigured) return undefined;
    const task = InteractionManager.runAfterInteractions(() => {
      void prepareSavedBackupPassword().catch((error: unknown) => { void recordError('Prepare backup security', error); });
    });
    return () => task.cancel();
  }, [backupPasswordConfigured]);
  const update = useMutation({ mutationKey: ['settings-update'], mutationFn: updateSettings, onSuccess: async () => queryClient.invalidateQueries(), onError: (error) => Alert.alert('Settings', error instanceof Error ? error.message : 'The setting could not be saved.') });
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
  const beginImport = async () => {
    try {
      const picked = await pickBackup(); if (!picked) return;
      if (!picked.encrypted) return confirmRestore(parsePlainBackup(picked.contents));
      setPasswordAction({ type: 'import', contents: picked.contents });
    }
    catch (error) { void recordError('Open backup', error); Alert.alert('Invalid backup', error instanceof Error ? error.message : 'The file could not be read.'); }
  };
  const confirmRestore = (document: BackupDocument) => Alert.alert('Replace all local data?', `${backupSummary(document)}\n\nA private safety snapshot will be kept on this phone.`, [{ text: t('cancel') }, { text: 'Replace all', style: 'destructive', onPress: async () => { setRestoring(true); try { await replaceFromBackup(document); await queryClient.invalidateQueries(); Alert.alert('Restore complete'); } catch (error) { void recordError('Restore backup', error); Alert.alert('Restore failed', error instanceof Error ? error.message : 'Current data was not changed.'); } finally { setRestoring(false); } } }]);
  const confirmBackupSaved = (drive: boolean) => Alert.alert(drive ? 'Saved to Google Drive?' : 'Backup file saved?', drive ? 'Check that the new .mymoney file appears in Drive before confirming.' : 'Check that the backup file appears in the location you selected before confirming.', [{ text: 'Not yet', style: 'cancel' }, { text: 'Yes, saved', onPress: async () => { try { await markBackedUp(); await queryClient.invalidateQueries({ queryKey: ['settings'] }); } catch (error) { void recordError('Update backup reminder', error); Alert.alert('Backup', 'The backup reminder could not be updated. Your exported file was not changed.'); } } }]);
  const saveToDrive = async () => {
    setSavingBackup(true);
    try {
      const savedPassword = await getSavedBackupPassword();
      if (!savedPassword) { setPasswordAction({ type: 'configure' }); return; }
      await exportEncryptedBackup(savedPassword); confirmBackupSaved(true);
    }
    catch (error) { void recordError('Export encrypted backup', error); Alert.alert('Backup failed', error instanceof Error ? error.message : 'Please try again.'); }
    finally { setSavingBackup(false); }
  };
  const submitPassword = async () => {
    if (!passwordAction) return;
    setSavingBackup(true);
    try {
      if (passwordAction.type === 'import') confirmRestore(await decryptBackup(passwordAction.contents, password));
      else {
        if (password !== confirmPassword) throw new Error('Password confirmation does not match.');
        await saveBackupPassword(password);
        void queryClient.invalidateQueries({ queryKey: ['backup-password'] });
        Alert.alert('Backup password saved', 'Your password is stored securely on this phone. Tap “Save encrypted backup” when you want to choose Google Drive.');
      }
      setPasswordAction(null); setPassword(''); setConfirmPassword('');
    }
    catch (error) { void recordError(passwordAction.type === 'import' ? 'Decrypt backup' : 'Save backup password', error); Alert.alert('Backup', error instanceof Error ? error.message : 'The operation failed.'); }
    finally { setSavingBackup(false); }
  };
  const changeBackupPassword = () => Alert.alert('Change backup password?', 'New backups will use the new password. Existing backups still require the password used when they were created.', [{ text: t('cancel') }, { text: t('continue'), onPress: () => setPasswordAction({ type: 'change' }) }]);
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
      <Text style={uiStyles.sectionTitle}>{t('backups')}</Text><Card><Text style={uiStyles.subtitle}>{t('backupDriveHelp')}</Text>{backupPasswordQuery.isLoading ? <LoadingBlock label="Checking backup security…" /> : backupPasswordQuery.error ? <ErrorBlock message="Backup security could not be loaded." onRetry={() => { void backupPasswordQuery.refetch(); }} /> : <><Text style={styles.backupStatus}>{backupPasswordConfigured ? t('backupPasswordReady') : t('backupPasswordHelp')}</Text><PrimaryButton label={backupPasswordConfigured ? 'Save encrypted backup' : t('setupBackupPassword')} onPress={saveToDrive} loading={savingBackup} />{backupPasswordConfigured ? <GhostButton label={t('changeBackupPassword')} onPress={changeBackupPassword} /> : null}</>}<GhostButton label={t('importBackup')} onPress={beginImport} disabled={savingBackup || restoring} /><GhostButton label={t('exportJson')} disabled={savingBackup} onPress={async () => { setSavingBackup(true); try { await exportPlainBackup(); confirmBackupSaved(false); } catch (error) { void recordError('Export JSON backup', error); Alert.alert('Export failed', error instanceof Error ? error.message : 'Please try again.'); } finally { setSavingBackup(false); } }} /></Card>
      <Text style={uiStyles.sectionTitle}>Diagnostics</Text><Card><ListRow title="Error log" subtitle="View locally saved app errors" onPress={() => router.push('/error-log')} /></Card>
      <Text style={uiStyles.sectionTitle}>{t('appInfo')}</Text><Card><Text style={uiStyles.subtitle}>Wallet Manager {Constants.expoConfig?.version ?? '1.2.0'} · Offline financial data</Text><Text style={uiStyles.subtitle}>No account, analytics, backend, or financial-data sync. Internet is used only to receive app updates.</Text></Card>
    </Screen>
    <Modal visible={Boolean(passwordAction)} transparent animationType="fade" onRequestClose={() => setPasswordAction(null)}><View style={styles.modalBackdrop}><View style={styles.modal}><Text style={uiStyles.sectionTitle}>{passwordAction?.type === 'import' ? 'Enter backup password' : passwordAction?.type === 'change' ? t('changeBackupPassword') : 'Create backup password'}</Text><Text style={uiStyles.subtitle}>Use one memorable password with at least 8 characters. You will need it to restore after reinstalling the app, and it cannot be recovered.</Text><Field autoFocus secureTextEntry label="Password" value={password} onChangeText={setPassword} />{passwordAction?.type !== 'import' ? <Field secureTextEntry label={t('confirmBackupPassword')} value={confirmPassword} onChangeText={setConfirmPassword} /> : null}<PrimaryButton label={t('continue')} onPress={submitPassword} loading={savingBackup} /><GhostButton label={t('cancel')} onPress={() => { setPasswordAction(null); setPassword(''); setConfirmPassword(''); }} /></View></View></Modal>
    <Modal visible={changePin} transparent animationType="fade" onRequestClose={closePinChange}><View style={styles.modalBackdrop}><View style={styles.modal}><Text style={uiStyles.sectionTitle}>{t('changePin')}</Text>{pinStep === 'current' ? <PinCodeInput key="current" digits={pinDigits} label="Enter current PIN" value={currentPin} onChangeText={setCurrentPin} disabled={pinChanging} onComplete={(value) => { void completePinStep(value); }} /> : null}{pinStep === 'new' ? <PinCodeInput key="new" label="Enter new PIN" value={newPin} onChangeText={setNewPin} disabled={pinChanging} onComplete={(value) => { void completePinStep(value); }} /> : null}{pinStep === 'confirm' ? <PinCodeInput key="confirm" label="Confirm new PIN" value={confirmPin} onChangeText={setConfirmPin} disabled={pinChanging} onComplete={(value) => { void completePinStep(value); }} /> : null}{pinChanging ? <Text style={styles.checking}>Checking…</Text> : null}<GhostButton label={t('cancel')} onPress={closePinChange} disabled={pinChanging} /></View></View></Modal>
    <LoadingOverlay visible={restoring} label="Restoring backup…" />
  </>;
}

const styles = StyleSheet.create({
  action: { color: colors.primary, minHeight: 48, textAlignVertical: 'center', fontWeight: '700' }, reminder: { backgroundColor: '#3A3222', borderColor: colors.warning }, reminderText: { color: colors.warning, lineHeight: 20 }, backupStatus: { color: colors.text, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  inline: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }, switchRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }, switchText: { flex: 1, gap: spacing.xs }, switchTitle: { color: colors.text, fontSize: 16 }, switchHelp: { color: colors.secondary, fontSize: 12, lineHeight: 17 },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.overlay }, modal: { backgroundColor: colors.elevated, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.lg },
  checking: { color: colors.secondary, textAlign: 'center' },
});
