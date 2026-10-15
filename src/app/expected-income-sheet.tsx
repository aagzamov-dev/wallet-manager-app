import { Alert, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Field, PrimaryButton, Screen, uiStyles } from '@/components/ui';
import { MoneyField } from '@/components/controls';
import { createExpectedIncome } from '@/data/repository';
import { refreshQueries } from '@/data/query-cache';
import { parseMoney, today } from '@/domain/money';
import { useI18n } from '@/i18n/provider';

type Form = { amount: string; dueDate: string; note: string };
export default function ExpectedIncomeSheet() {
  const { projectId = '' } = useLocalSearchParams<{ projectId: string }>(); const { t } = useI18n(); const router = useRouter(); const queryClient = useQueryClient();
  const { control, handleSubmit } = useForm<Form>({ defaultValues: { amount: '', dueDate: today(), note: '' } });
  const mutation = useMutation({ mutationKey: ['create-expected-income'], mutationFn: ({ amount, dueDate, note }: { amount: number; dueDate: string; note: string }) => createExpectedIncome(projectId, amount, dueDate, note) });
  const submit = handleSubmit(async (values) => { const amount = parseMoney(values.amount); if (!amount) return Alert.alert(t('amount'), 'Enter an amount greater than zero.'); try { await mutation.mutateAsync({ ...values, amount }); refreshQueries(queryClient, ['projects', 'expected-income', 'dashboard', 'settings']); router.back(); } catch (error) { Alert.alert('Expected payment', error instanceof Error ? error.message : 'The expected payment could not be saved.'); } });
  return <Screen><Text style={uiStyles.title}>Expected project payment</Text><Controller control={control} name="amount" render={({ field: { value, onChange } }) => <MoneyField autoFocus label={`${t('amount')} (UZS)`} value={value} onChangeText={onChange} />} /><Controller control={control} name="dueDate" render={({ field: { value, onChange } }) => <Field label={t('dueDate')} value={value} onChangeText={onChange} maxLength={10} />} /><Controller control={control} name="note" render={({ field: { value, onChange } }) => <Field label={t('note')} value={value} onChangeText={onChange} multiline />} /><PrimaryButton label={t('add')} onPress={submit} loading={mutation.isPending} /></Screen>;
}
