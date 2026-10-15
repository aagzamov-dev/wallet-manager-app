import { Alert, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { PrimaryButton, Screen, uiStyles } from '@/components/ui';
import { MoneyField } from '@/components/controls';
import { receiveExpectedIncome } from '@/data/repository';
import { formatMoneyInput, parseMoney } from '@/domain/money';
import { useI18n } from '@/i18n/provider';

type Form = { amount: string };
export default function PaymentSheet() {
  const { expectedId = '', amount = '' } = useLocalSearchParams<{ expectedId: string; amount: string; projectId: string }>(); const { t } = useI18n(); const router = useRouter(); const queryClient = useQueryClient();
  const { control, handleSubmit } = useForm<Form>({ defaultValues: { amount: formatMoneyInput(amount) } });
  const mutation = useMutation({ mutationFn: (received: number) => receiveExpectedIncome(expectedId, received) });
  const submit = handleSubmit(async (values) => { const received = parseMoney(values.amount); const maximum = Number(amount); if (!received || received > maximum) return Alert.alert(t('paymentAmount'), `Enter an amount from 1 to ${maximum}.`); await mutation.mutateAsync(received); await queryClient.invalidateQueries(); await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); router.back(); });
  return <Screen><Text style={uiStyles.title}>{t('recordPayment')}</Text><Text style={uiStyles.subtitle}>A partial amount creates income now and a new remainder automatically.</Text><Controller control={control} name="amount" render={({ field: { value, onChange } }) => <MoneyField autoFocus label={`${t('paymentAmount')} (UZS)`} value={value} onChangeText={onChange} />} /><PrimaryButton label={t('recordPayment')} tone="success" onPress={submit} loading={mutation.isPending} /></Screen>;
}
