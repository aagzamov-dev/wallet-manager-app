import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Field, PrimaryButton, uiStyles } from '@/components/ui';
import { createExpense, listCategories } from '@/data/repository';
import { formatMoneyInput, parseMoney, today } from '@/domain/money';
import { useI18n } from '@/i18n/provider';
import { colors, radius, spacing } from '@/theme/tokens';

const schema = z.object({ amount: z.string().min(1), categoryId: z.string().min(1), title: z.string(), note: z.string(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });
type FormValues = z.infer<typeof schema>;

export default function ExpenseSheet() {
  const { t, language } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: listCategories });
  const [details, setDetails] = useState(false);
  const { control, handleSubmit, setValue, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { amount: '', categoryId: '', title: '', note: '', date: today() } });
  const selected = useWatch({ control, name: 'categoryId' });
  const mutation = useMutation({ mutationFn: createExpense });

  const submit = handleSubmit(async (values) => {
    const amount = parseMoney(values.amount);
    if (!amount) return Alert.alert(t('amount'), 'Enter an amount greater than zero.');
    try {
      const category = categories.find((item) => item.id === values.categoryId);
      const title = values.title.trim() || (language === 'uz' ? category?.nameUz : category?.nameEn) || '';
      const expenseId = await mutation.mutateAsync({ ...values, title, amount });
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['expenses'] }), queryClient.invalidateQueries({ queryKey: ['dashboard'] }), queryClient.invalidateQueries({ queryKey: ['categories'] }), queryClient.invalidateQueries({ queryKey: ['settings'] })]);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.dismissTo({ pathname: '/(tabs)/expenses', params: { saved: expenseId } });
    } catch (error) { Alert.alert('Could not save', error instanceof Error ? error.message : 'Please try again.'); }
  });

  return <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <Text style={uiStyles.title}>{t('quickExpense')}</Text>
      <Controller control={control} name="amount" render={({ field: { value, onChange } }) => <View style={styles.amountWrap}><TextInput autoFocus value={value} onChangeText={(next) => onChange(formatMoneyInput(next))} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.secondary} selectionColor={colors.primary} style={styles.amountInput} /><Text style={styles.currency}>UZS</Text></View>} />
      <View style={styles.categories}><Text style={uiStyles.label}>{t('category')}</Text><View style={styles.chips}>{categories.map((category) => <Pressable key={category.id} onPress={() => setValue('categoryId', category.id, { shouldValidate: true })} style={[styles.category, selected === category.id && styles.categorySelected]}><View style={[styles.categoryDot, { backgroundColor: category.color }]} /><Text numberOfLines={1} style={styles.categoryText}>{language === 'uz' && category.nameUz.trim() ? category.nameUz : category.nameEn}</Text></Pressable>)}</View>{errors.categoryId ? <Text style={styles.error}>Choose a category.</Text> : null}</View>
      <Pressable onPress={() => setDetails((value) => !value)} style={styles.detailsButton}><Text style={styles.detailsText}>{details ? '−' : '+'} {t('moreDetails')}</Text></Pressable>
      {details ? <View style={styles.details}>
        <Controller control={control} name="title" render={({ field: { value, onChange } }) => <Field label={t('title')} value={value} onChangeText={onChange} placeholder="Optional" />} />
        <Controller control={control} name="note" render={({ field: { value, onChange } }) => <Field label={t('note')} value={value} onChangeText={onChange} multiline placeholder="Optional" />} />
        <Controller control={control} name="date" render={({ field: { value, onChange } }) => <Field label={t('date')} value={value} onChangeText={onChange} maxLength={10} error={errors.date?.message} />} />
      </View> : null}
    </ScrollView>
    <View style={styles.footer}><PrimaryButton label={t('saveExpense')} onPress={submit} loading={mutation.isPending} /></View>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.elevated },
  content: { padding: spacing.lg, paddingBottom: 100, gap: spacing.xl },
  amountWrap: { height: 88, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.input, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.primary, paddingHorizontal: spacing.lg },
  amountInput: { flex: 1, color: colors.text, fontSize: 36, fontWeight: '800' },
  currency: { color: colors.secondary, fontSize: 16, fontWeight: '700' },
  categories: { gap: spacing.md }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  category: { width: '31%', minHeight: 56, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm },
  categorySelected: { borderColor: colors.primary, backgroundColor: '#29415E' }, categoryDot: { width: 9, height: 9, borderRadius: 5 }, categoryText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  error: { color: colors.danger, fontSize: 12 }, detailsButton: { minHeight: 48, justifyContent: 'center' }, detailsText: { color: colors.primary, fontSize: 15, fontWeight: '700' }, details: { gap: spacing.lg },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.lg, backgroundColor: colors.elevated, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
