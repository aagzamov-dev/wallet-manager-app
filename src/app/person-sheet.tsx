import { Alert, Text } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Field, PrimaryButton, Screen, uiStyles } from '@/components/ui';
import { createPerson } from '@/data/repository';
import { refreshQueries } from '@/data/query-cache';
import { useI18n } from '@/i18n/provider';

type Form = { name: string; note: string };
export default function PersonSheet() {
  const { t } = useI18n(); const router = useRouter(); const queryClient = useQueryClient();
  const { control, handleSubmit } = useForm<Form>({ defaultValues: { name: '', note: '' } });
  const mutation = useMutation({ mutationKey: ['create-loan-person'], mutationFn: (values: Form) => createPerson(values.name, values.note) });
  const submit = handleSubmit(async (values) => { if (!values.name.trim()) return Alert.alert(t('name'), 'Name is required.'); try { const personId = await mutation.mutateAsync(values); refreshQueries(queryClient, ['people', 'settings']); router.dismissTo(`/person/${personId}`); } catch (error) { Alert.alert('Loan', error instanceof Error ? error.message : 'The person could not be saved.'); } });
  return <Screen><Text style={uiStyles.title}>New person loan</Text><Controller control={control} name="name" render={({ field: { value, onChange } }) => <Field autoFocus label={t('name')} value={value} onChangeText={onChange} />} /><Controller control={control} name="note" render={({ field: { value, onChange } }) => <Field label={t('note')} value={value} onChangeText={onChange} multiline />} /><PrimaryButton label={t('add')} onPress={submit} loading={mutation.isPending} /></Screen>;
}
