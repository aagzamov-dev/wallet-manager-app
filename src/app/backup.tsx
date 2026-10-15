import { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  backupSummary,
  decryptBackup,
  exportEncryptedBackup,
  exportPlainBackup,
  hasSavedBackupPassword,
  parsePlainBackup,
  pickBackup,
  replaceFromBackup,
  saveBackupPassword,
  type BackupDocument,
} from '@/backup/backup';
import { Card, ErrorBlock, Field, GhostButton, Header, LoadingBlock, LoadingOverlay, PrimaryButton, Screen, uiStyles } from '@/components/ui';
import { refreshQueries } from '@/data/query-cache';
import { markBackedUp } from '@/data/repository';
import { recordError } from '@/errors/error-log';
import { useI18n } from '@/i18n/provider';
import { colors, radius, spacing } from '@/theme/tokens';

type PasswordAction = { type: 'configure' | 'change' } | { type: 'import'; contents: string };

export default function BackupScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const passwordQuery = useQuery({ queryKey: ['backup-password'], queryFn: hasSavedBackupPassword, staleTime: Infinity });
  const passwordConfigured = passwordQuery.data ?? false;
  const [passwordAction, setPasswordAction] = useState<PasswordAction | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  const closePassword = () => {
    setPasswordAction(null);
    setPassword('');
    setConfirmPassword('');
  };

  const confirmBackupSaved = (drive: boolean) => Alert.alert(
    drive ? 'Saved to Google Drive?' : 'Backup file saved?',
    drive ? 'Check that the new .mymoney file appears in Drive before confirming.' : 'Check that the backup file appears in the location you selected before confirming.',
    [
      { text: 'Not yet', style: 'cancel' },
      {
        text: 'Yes, saved',
        onPress: async () => {
          try {
            await markBackedUp();
            refreshQueries(queryClient, ['settings']);
          } catch (error) {
            void recordError('Update backup reminder', error);
            Alert.alert('Backup', 'The backup reminder could not be updated. Your exported file was not changed.');
          }
        },
      },
    ],
  );

  const confirmRestore = (document: BackupDocument) => Alert.alert(
    'Replace all local data?',
    `${backupSummary(document)}\n\nA private safety snapshot will be kept on this phone.`,
    [
      { text: t('cancel') },
      {
        text: 'Replace all',
        style: 'destructive',
        onPress: async () => {
          setRestoring(true);
          try {
            await replaceFromBackup(document);
            await queryClient.invalidateQueries();
            Alert.alert('Restore complete');
          } catch (error) {
            void recordError('Restore backup', error);
            Alert.alert('Restore failed', error instanceof Error ? error.message : 'Current data was not changed.');
          } finally {
            setRestoring(false);
          }
        },
      },
    ],
  );

  const saveToDrive = async () => {
    if (busyLabel || restoring) return;
    try {
      if (!passwordConfigured) {
        setPasswordAction({ type: 'configure' });
        return;
      }
      setBusyLabel('Preparing encrypted backup…');
      await exportEncryptedBackup();
      confirmBackupSaved(true);
    } catch (error) {
      void recordError('Export encrypted backup', error);
      Alert.alert('Backup failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusyLabel(null);
    }
  };

  const exportJson = async () => {
    if (busyLabel || restoring) return;
    setBusyLabel('Preparing JSON backup…');
    try {
      await exportPlainBackup();
      confirmBackupSaved(false);
    } catch (error) {
      void recordError('Export JSON backup', error);
      Alert.alert('Export failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusyLabel(null);
    }
  };

  const beginImport = async () => {
    if (busyLabel || restoring) return;
    try {
      const picked = await pickBackup();
      if (!picked) return;
      if (picked.encrypted) setPasswordAction({ type: 'import', contents: picked.contents });
      else confirmRestore(parsePlainBackup(picked.contents));
    } catch (error) {
      void recordError('Open backup', error);
      Alert.alert('Invalid backup', error instanceof Error ? error.message : 'The file could not be read.');
    }
  };

  const submitPassword = async () => {
    if (!passwordAction || busyLabel || restoring) return;
    setBusyLabel(passwordAction.type === 'import' ? 'Checking encrypted backup…' : 'Securing backup password…');
    try {
      if (passwordAction.type === 'import') {
        confirmRestore(await decryptBackup(passwordAction.contents, password));
      } else {
        if (password !== confirmPassword) throw new Error('Password confirmation does not match.');
        await saveBackupPassword(password);
        queryClient.setQueryData(['backup-password'], true);
        Alert.alert('Backup password saved', 'Your password is stored securely on this phone. Tap “Save encrypted backup” when you want to choose Google Drive.');
      }
      closePassword();
    } catch (error) {
      void recordError(passwordAction.type === 'import' ? 'Decrypt backup' : 'Save backup password', error);
      Alert.alert('Backup', error instanceof Error ? error.message : 'The operation failed.');
    } finally {
      setBusyLabel(null);
    }
  };

  const changeBackupPassword = () => Alert.alert(
    'Change backup password?',
    'New backups will use the new password. Existing backups still require the password used when they were created.',
    [{ text: t('cancel') }, { text: t('continue'), onPress: () => setPasswordAction({ type: 'change' }) }],
  );

  return <>
    <Screen>
      <Header title={t('backups')} action={<Pressable hitSlop={12} onPress={() => router.back()}><Text style={styles.action}>{t('done')}</Text></Pressable>} />
      <Card>
        <Text style={uiStyles.subtitle}>{t('backupDriveHelp')}</Text>
        {passwordQuery.isLoading ? <LoadingBlock label="Checking backup security…" /> : passwordQuery.error ? <ErrorBlock message="Backup security could not be loaded." onRetry={() => { void passwordQuery.refetch(); }} /> : <>
          <Text style={styles.status}>{passwordConfigured ? t('backupPasswordReady') : t('backupPasswordHelp')}</Text>
          <PrimaryButton label={passwordConfigured ? 'Save encrypted backup' : t('setupBackupPassword')} onPress={() => { void saveToDrive(); }} loading={Boolean(busyLabel)} />
          {passwordConfigured ? <GhostButton label={t('changeBackupPassword')} onPress={changeBackupPassword} disabled={Boolean(busyLabel)} /> : null}
        </>}
      </Card>
      <Card>
        <Text style={uiStyles.sectionTitle}>Restore or portable export</Text>
        <GhostButton label={t('importBackup')} onPress={() => { void beginImport(); }} disabled={Boolean(busyLabel) || restoring} />
        <GhostButton label={t('exportJson')} onPress={() => { void exportJson(); }} disabled={Boolean(busyLabel) || restoring} />
      </Card>
      {busyLabel ? <Text accessibilityLiveRegion="polite" style={styles.progress}>{busyLabel}</Text> : null}
    </Screen>
    <Modal visible={Boolean(passwordAction)} transparent animationType="fade" onRequestClose={closePassword}>
      <View style={styles.modalBackdrop}><View style={styles.modal}>
        <Text style={uiStyles.sectionTitle}>{passwordAction?.type === 'import' ? 'Enter backup password' : passwordAction?.type === 'change' ? t('changeBackupPassword') : 'Create backup password'}</Text>
        <Text style={uiStyles.subtitle}>Use one memorable password with at least 8 characters. You will need it after reinstalling the app, and it cannot be recovered.</Text>
        <Field autoFocus secureTextEntry label="Password" value={password} onChangeText={setPassword} editable={!busyLabel} />
        {passwordAction?.type !== 'import' ? <Field secureTextEntry label={t('confirmBackupPassword')} value={confirmPassword} onChangeText={setConfirmPassword} editable={!busyLabel} /> : null}
        <PrimaryButton label={t('continue')} onPress={() => { void submitPassword(); }} loading={Boolean(busyLabel)} />
        <GhostButton label={t('cancel')} onPress={closePassword} disabled={Boolean(busyLabel)} />
      </View></View>
    </Modal>
    <LoadingOverlay visible={restoring} label="Restoring backup…" />
  </>;
}

const styles = StyleSheet.create({
  action: { color: colors.primary, minHeight: 48, textAlignVertical: 'center', fontWeight: '700' },
  status: { color: colors.text, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  progress: { color: colors.secondary, fontSize: 14, textAlign: 'center' },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.overlay },
  modal: { backgroundColor: colors.elevated, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.lg },
});
