import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, EmptyState, ErrorBlock, Fab, Header, ListRow, LoadingBlock } from '@/components/ui';
import { PeriodSelector } from '@/components/controls';
import { deleteIncome, getSettings, listIncome } from '@/data/repository';
import { refreshQueries } from '@/data/query-cache';
import { formatMoney, today } from '@/domain/money';
import { createPeriodSelection, resolvePeriodRange } from '@/domain/period';
import { useI18n } from '@/i18n/provider';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { colors, radius, spacing } from '@/theme/tokens';

export default function IncomeScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [period, setPeriod] = useState(() => createPeriodSelection('month', today()));
  const range = useMemo(() => resolvePeriodRange(period), [period]);
  const settingsQuery = useQuery({ queryKey: ['settings'], queryFn: getSettings });
  const incomeQuery = useQuery({ queryKey: ['income', debouncedSearch, range.startDate, range.endDate], queryFn: () => listIncome(debouncedSearch, range), placeholderData: keepPreviousData });
  const settings = settingsQuery.data; const income = useMemo(() => incomeQuery.data ?? [], [incomeQuery.data]);
  const remove = useMutation({ mutationKey: ['delete-income'], mutationFn: deleteIncome, onSuccess: () => refreshQueries(queryClient, ['income', 'dashboard', 'settings']), onError: () => Alert.alert('Income', 'The income record could not be deleted. The error was saved locally.') });
  const sections = useMemo(() => {
    const grouped = new Map<string, typeof income>();
    for (const item of income) {
      const group = grouped.get(item.date);
      if (group) group.push(item);
      else grouped.set(item.date, [item]);
    }
    return [...grouped.entries()].map(([title, data]) => ({ title, data }));
  }, [income]);
  const money = (amount: number) => formatMoney(amount, settings?.displayCurrency, settings?.usdRateUzs);
  const confirmDelete = (incomeId: string) => Alert.alert('Delete income?', 'This cannot be undone.', [{ text: t('cancel') }, { text: t('delete'), style: 'destructive', onPress: () => remove.mutate(incomeId) }]);

  const periodTotal = useMemo(() => income.reduce((sum, item) => sum + item.amount, 0), [income]);
  return <SafeAreaView edges={['top']} style={styles.page}>
    <View style={styles.top}><Header title={t('income')} action={<Pressable onPress={() => router.push('/settings')}><Text style={styles.action}>{t('settings')}</Text></Pressable>} /><PeriodSelector value={period} onChange={setPeriod} /><TextInput value={search} onChangeText={setSearch} placeholder={t('search')} placeholderTextColor={colors.secondary} style={styles.search} /><View style={styles.summary}><View style={styles.summaryStatus}><Text style={styles.summaryLabel}>{income.length} records</Text>{incomeQuery.isFetching && !incomeQuery.isLoading ? <ActivityIndicator size="small" color={colors.primary} /> : null}</View><Text style={styles.summaryValue}>+{money(periodTotal)}</Text></View></View>
    <SectionList sections={sections} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} initialNumToRender={12} maxToRenderPerBatch={12} windowSize={7} renderSectionHeader={({ section }) => <Text style={styles.section}>{section.title}</Text>} renderItem={({ item }) => <Card style={styles.rowCard}><ListRow title={item.title} subtitle={item.note ?? undefined} value={`+${money(item.amount)}`} color={colors.success} onLongPress={() => confirmDelete(item.id)} /></Card>} ListEmptyComponent={incomeQuery.isLoading ? <LoadingBlock label="Loading income…" /> : incomeQuery.error ? <ErrorBlock message="Income could not be loaded. The error was saved locally." onRetry={() => { void incomeQuery.refetch(); }} /> : <EmptyState title={t('emptyIncome')} />} />
    <Fab label={t('addIncome')} onPress={() => router.push('/income-sheet')} />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background }, top: { paddingTop: spacing.lg, paddingHorizontal: spacing.lg, gap: spacing.md },
  action: { color: colors.primary, minHeight: 48, textAlignVertical: 'center', fontWeight: '700' },
  search: { height: 52, borderRadius: radius.md, backgroundColor: colors.input, borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: spacing.lg, fontSize: 16 },
  summary: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryStatus: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, summaryLabel: { color: colors.secondary, fontSize: 13 }, summaryValue: { color: colors.success, fontSize: 15, fontWeight: '800' },
  list: { padding: spacing.lg, paddingBottom: 112, gap: spacing.sm, flexGrow: 1 }, section: { color: colors.secondary, backgroundColor: colors.background, paddingVertical: spacing.sm, fontSize: 13, fontWeight: '700' }, rowCard: { paddingVertical: 0 },
});
