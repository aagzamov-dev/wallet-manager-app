import { Alert, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Field, PrimaryButton, Screen, uiStyles } from '@/components/ui';
import { MoneyField } from '@/components/controls';
import { createLoanTransaction } from '@/data/repository';
import { refreshQueries } from '@/data/query-cache';
import { parseMoney, today } from '@/domain/money';
import type { LoanTransactionKind } from '@/domain/types';
import { useI18n } from '@/i18n/provider';

type Form = { amount: string; note: string; date: string };
export default function LoanTransactionSheet() {
  const { personId = '', kind = 'GIVE' } = useLocalSearchParams<{ personId: string; kind: LoanTransactionKind }>(); const { t } = useI18n(); const router = useRouter(); const queryClient = useQueryClient();
  const { control, handleSubmit } = useForm<Form>({ defaultValues: { amount: '', note: '', date: today() } });
  const mutation = useMutation({ mutationKey: ['create-loan-transaction'], mutationFn: ({ amount, note, date }: { amount: number; note: string; date: string }) => createLoanTransaction(personId, kind, amount, date, note) });
  const submit = handleSubmit(async (values) => { const amount = parseMoney(values.amount); if (!amount) return Alert.alert(t('amount'), 'Enter an amount greater than zero.'); try { await mutation.mutateAsync({ ...values, amount }); refreshQueries(queryClient, ['people', 'person-transactions', 'dashboard', 'settings']); router.back(); } catch (error) { Alert.alert('Loan', error instanceof Error ? error.message : 'The loan transaction could not be saved.'); } });
  return <Screen><Text style={uiStyles.title}>{kind === 'GIVE' ? t('give') : t('returned')}</Text><Controller control={control} name="amount" render={({ field: { value, onChange } }) => <MoneyField autoFocus label={`${t('amount')} (UZS)`} value={value} onChangeText={onChange} />} /><Controller control={control} name="note" render={({ field: { value, onChange } }) => <Field label={t('note')} value={value} onChangeText={onChange} multiline />} /><Controller control={control} name="date" render={({ field: { value, onChange } }) => <Field label={t('date')} value={value} onChangeText={onChange} maxLength={10} />} /><PrimaryButton label={kind === 'GIVE' ? t('give') : t('returned')} tone={kind === 'GIVE' ? 'primary' : 'success'} onPress={submit} loading={mutation.isPending} /></Screen>;
}
