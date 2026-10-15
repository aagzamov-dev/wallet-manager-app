import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Field, PrimaryButton, uiStyles } from '@/components/ui';
import { MoneyField } from '@/components/controls';
import { createIncome } from '@/data/repository';
import { refreshQueries } from '@/data/query-cache';
import { parseMoney, today } from '@/domain/money';
import { recordError } from '@/errors/error-log';
import { useI18n } from '@/i18n/provider';
import { colors, spacing } from '@/theme/tokens';

const schema = z.object({ amount: z.string().min(1), title: z.string().trim().min(1), note: z.string(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });
type FormValues = z.infer<typeof schema>;

export default function IncomeSheet() {
  const { t } = useI18n(); const router = useRouter(); const queryClient = useQueryClient();
  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { amount: '', title: '', note: '', date: today() } });
  const mutation = useMutation({ mutationKey: ['create-income'], mutationFn: createIncome });
  const submit = handleSubmit(async (values) => {
    const amount = parseMoney(values.amount); if (!amount) return Alert.alert(t('amount'), 'Enter an amount greater than zero.');
    try { await mutation.mutateAsync({ ...values, amount }); refreshQueries(queryClient, ['income', 'dashboard', 'settings']); void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); router.back(); }
    catch (error) { void recordError('Save income', error); Alert.alert('Could not save', error instanceof Error ? error.message : 'Please try again.'); }
  });
  return <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
    <Text style={uiStyles.title}>{t('addIncome')}</Text>
    <Controller control={control} name="amount" render={({ field: { value, onChange } }) => <MoneyField autoFocus label={`${t('amount')} (UZS)`} value={value} onChangeText={onChange} placeholder="0" error={errors.amount?.message} />} />
    <Controller control={control} name="title" render={({ field: { value, onChange } }) => <Field label={t('title')} value={value} onChangeText={onChange} error={errors.title?.message} />} />
    <Controller control={control} name="note" render={({ field: { value, onChange } }) => <Field label={t('note')} value={value} onChangeText={onChange} multiline placeholder="Optional" />} />
    <Controller control={control} name="date" render={({ field: { value, onChange } }) => <Field label={t('date')} value={value} onChangeText={onChange} maxLength={10} error={errors.date?.message} />} />
  </ScrollView><View style={styles.footer}><PrimaryButton label={t('addIncome')} onPress={submit} loading={mutation.isPending} /></View></KeyboardAvoidingView>;
}

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: colors.elevated }, content: { padding: spacing.lg, paddingBottom: 100, gap: spacing.lg }, footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.lg, backgroundColor: colors.elevated, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border } });
