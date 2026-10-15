import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, EmptyState, Fab, Header, ListRow } from '@/components/ui';
import { PeriodSelector } from '@/components/controls';
import { deleteExpense, getSettings, listCategories, listExpenses } from '@/data/repository';
import { formatMoney, today } from '@/domain/money';
import { createPeriodSelection, resolvePeriodRange } from '@/domain/period';
import { useI18n } from '@/i18n/provider';
import { colors, radius, spacing } from '@/theme/tokens';

export default function ExpensesScreen() {
  const { t, language } = useI18n();
  const router = useRouter();
  const params = useLocalSearchParams<{ compose?: string; saved?: string }>();
  const opened = useRef(false);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [period, setPeriod] = useState(() => createPeriodSelection('week', today()));
  const range = useMemo(() => resolvePeriodRange(period), [period]);
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: getSettings });
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: listCategories });
  const { data: expenses = [] } = useQuery({ queryKey: ['expenses', search, categoryId, range.startDate, range.endDate], queryFn: () => listExpenses(search, categoryId || undefined, range) });
  const remove = useMutation({ mutationFn: deleteExpense, onSuccess: async () => queryClient.invalidateQueries() });

  useEffect(() => {
    if (params.compose === '1' && !opened.current) { opened.current = true; router.push('/expense-sheet'); }
  }, [params.compose, router]);
  useEffect(() => {
    if (!params.saved) return;
    const timer = setTimeout(() => router.setParams({ saved: '' }), 5_000);
    return () => clearTimeout(timer);
  }, [params.saved, router]);

  const sections = useMemo(() => {
    const grouped = new Map<string, typeof expenses>();
    for (const expense of expenses) grouped.set(expense.date, [...(grouped.get(expense.date) ?? []), expense]);
    return [...grouped.entries()].map(([title, data]) => ({ title, data }));
  }, [expenses]);
  const money = (value: number) => formatMoney(value, settings?.displayCurrency, settings?.usdRateUzs);
  const confirmDelete = (expenseId: string) => Alert.alert('Delete expense?', 'This cannot be undone.', [{ text: t('cancel') }, { text: t('delete'), style: 'destructive', onPress: () => remove.mutate(expenseId) }]);

  const periodTotal = expenses.reduce((sum, item) => sum + item.amount, 0);

  return <SafeAreaView edges={['top']} style={styles.page}>
    <View style={styles.top}>
      <Header title={t('expenses')} action={<Pressable hitSlop={12} onPress={() => router.push('/settings')}><Text style={styles.action}>{t('settings')}</Text></Pressable>} />
      <PeriodSelector value={period} onChange={setPeriod} />
      <TextInput value={search} onChangeText={setSearch} placeholder={t('search')} placeholderTextColor={colors.secondary} style={styles.search} />
      <ScrollView horizontal contentContainerStyle={styles.chips} showsHorizontalScrollIndicator={false}>
        <Pressable onPress={() => setCategoryId('')} style={[styles.chip, !categoryId && styles.chipSelected]}><View style={[styles.dot, { backgroundColor: colors.secondary }]} /><Text style={styles.chipText}>{t('all')}</Text></Pressable>
        {categories.map((category) => <Pressable key={category.id} onPress={() => setCategoryId(category.id)} style={[styles.chip, categoryId === category.id && styles.chipSelected]}><View style={[styles.dot, { backgroundColor: category.color }]} /><Text style={styles.chipText}>{language === 'uz' && category.nameUz.trim() ? category.nameUz : category.nameEn}</Text></Pressable>)}
        <Pressable onPress={() => router.push('/categories')} style={styles.chip}><View style={[styles.dot, { backgroundColor: colors.primary }]} /><Text style={styles.chipText}>{t('edit')}</Text></Pressable>
      </ScrollView>
      <View style={styles.summary}><Text style={styles.summaryLabel}>{expenses.length} records</Text><Text style={styles.summaryValue}>−{money(periodTotal)}</Text></View>
    </View>
    <SectionList sections={sections} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} stickySectionHeadersEnabled
      renderSectionHeader={({ section }) => <Text style={styles.section}>{section.title}</Text>}
      renderItem={({ item }) => <Card style={styles.rowCard}><ListRow title={item.title} subtitle={language === 'uz' ? item.categoryNameUz || item.categoryNameEn || undefined : item.categoryNameEn ?? undefined} value={`−${money(item.amount)}`} color={item.categoryColor ?? colors.secondary} onLongPress={() => confirmDelete(item.id)} /></Card>}
      ListEmptyComponent={<EmptyState title={t('emptyExpenses')} />} />
    {params.saved ? <View style={styles.snackbar}><Text style={styles.snackbarText}>{t('saved')}</Text><Pressable onPress={() => { remove.mutate(params.saved ?? ''); router.setParams({ saved: '' }); }}><Text style={styles.undo}>{t('undo')}</Text></Pressable></View> : null}
    <Fab label={t('quickExpense')} onPress={() => router.push('/expense-sheet')} />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  top: { paddingTop: spacing.lg, paddingHorizontal: spacing.lg, gap: spacing.md },
  action: { color: colors.primary, minHeight: 48, textAlignVertical: 'center', fontWeight: '700' },
  search: { height: 52, borderRadius: radius.md, backgroundColor: colors.input, borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: spacing.lg, fontSize: 16 },
  chips: { gap: spacing.sm, paddingRight: spacing.lg },
  chip: { height: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md },
  chipSelected: { backgroundColor: colors.elevated, borderColor: colors.primary },
  chipText: { color: colors.text, fontWeight: '600' },
  dot: { width: 9, height: 9, borderRadius: 5 },
  summary: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryLabel: { color: colors.secondary, fontSize: 13 }, summaryValue: { color: colors.danger, fontSize: 15, fontWeight: '800' },
  list: { padding: spacing.lg, paddingBottom: 112, gap: spacing.sm, flexGrow: 1 },
  section: { color: colors.secondary, backgroundColor: colors.background, paddingVertical: spacing.sm, fontSize: 13, fontWeight: '700' },
  rowCard: { paddingVertical: 0 },
  snackbar: { position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: 82, height: 52, backgroundColor: colors.elevated, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, elevation: 6 },
  snackbarText: { color: colors.text }, undo: { color: colors.primary, fontWeight: '800', padding: spacing.md },
});
