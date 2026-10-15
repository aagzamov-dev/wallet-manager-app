import { Alert, Text } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Field, PrimaryButton, Screen, uiStyles } from '@/components/ui';
import { createProject } from '@/data/repository';
import { useI18n } from '@/i18n/provider';

type Form = { name: string; borrower: string; note: string };
export default function ProjectSheet() {
  const { t } = useI18n(); const router = useRouter(); const queryClient = useQueryClient();
  const { control, handleSubmit } = useForm<Form>({ defaultValues: { name: '', borrower: '', note: '' } });
  const mutation = useMutation({ mutationKey: ['create-loan-project'], mutationFn: (values: Form) => createProject(values.name, values.borrower, values.note) });
  const submit = handleSubmit(async (values) => { if (!values.name.trim()) return Alert.alert(t('name'), 'Name is required.'); try { const projectId = await mutation.mutateAsync(values); await queryClient.invalidateQueries(); router.dismissTo(`/project/${projectId}`); } catch (error) { Alert.alert('Loan project', error instanceof Error ? error.message : 'The project could not be saved.'); } });
  return <Screen><Text style={uiStyles.title}>New project loan</Text><Controller control={control} name="name" render={({ field: { value, onChange } }) => <Field autoFocus label={t('name')} value={value} onChangeText={onChange} />} /><Controller control={control} name="borrower" render={({ field: { value, onChange } }) => <Field label={t('borrower')} value={value} onChangeText={onChange} />} /><Controller control={control} name="note" render={({ field: { value, onChange } }) => <Field label={t('note')} value={value} onChangeText={onChange} multiline />} /><PrimaryButton label={t('add')} onPress={submit} loading={mutation.isPending} /></Screen>;
}
