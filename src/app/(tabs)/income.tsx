import { useMemo, useState } from 'react';
import { Alert, Pressable, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, EmptyState, Fab, Header, ListRow } from '@/components/ui';
import { PeriodSelector } from '@/components/controls';
import { deleteIncome, getSettings, listIncome } from '@/data/repository';
import { formatMoney, today } from '@/domain/money';
import { createPeriodSelection, resolvePeriodRange } from '@/domain/period';
import { useI18n } from '@/i18n/provider';
import { colors, radius, spacing } from '@/theme/tokens';

export default function IncomeScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState(() => createPeriodSelection('month', today()));
  const range = useMemo(() => resolvePeriodRange(period), [period]);
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: getSettings });
  const { data: income = [] } = useQuery({ queryKey: ['income', search, range.startDate, range.endDate], queryFn: () => listIncome(search, range) });
  const remove = useMutation({ mutationFn: deleteIncome, onSuccess: async () => queryClient.invalidateQueries() });
  const grouped = new Map<string, typeof income>();
  income.forEach((item) => grouped.set(item.date, [...(grouped.get(item.date) ?? []), item]));
  const sections = [...grouped.entries()].map(([title, data]) => ({ title, data }));
  const money = (amount: number) => formatMoney(amount, settings?.displayCurrency, settings?.usdRateUzs);
  const confirmDelete = (incomeId: string) => Alert.alert('Delete income?', 'This cannot be undone.', [{ text: t('cancel') }, { text: t('delete'), style: 'destructive', onPress: () => remove.mutate(incomeId) }]);

  const periodTotal = income.reduce((sum, item) => sum + item.amount, 0);
  return <SafeAreaView edges={['top']} style={styles.page}>
    <View style={styles.top}><Header title={t('income')} action={<Pressable onPress={() => router.push('/settings')}><Text style={styles.action}>{t('settings')}</Text></Pressable>} /><PeriodSelector value={period} onChange={setPeriod} /><TextInput value={search} onChangeText={setSearch} placeholder={t('search')} placeholderTextColor={colors.secondary} style={styles.search} /><View style={styles.summary}><Text style={styles.summaryLabel}>{income.length} records</Text><Text style={styles.summaryValue}>+{money(periodTotal)}</Text></View></View>
    <SectionList sections={sections} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} renderSectionHeader={({ section }) => <Text style={styles.section}>{section.title}</Text>} renderItem={({ item }) => <Card style={styles.rowCard}><ListRow title={item.title} subtitle={item.note ?? undefined} value={`+${money(item.amount)}`} color={colors.success} onLongPress={() => confirmDelete(item.id)} /></Card>} ListEmptyComponent={<EmptyState title={t('emptyIncome')} />} />
    <Fab label={t('addIncome')} onPress={() => router.push('/income-sheet')} />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background }, top: { paddingTop: spacing.lg, paddingHorizontal: spacing.lg, gap: spacing.md },
  action: { color: colors.primary, minHeight: 48, textAlignVertical: 'center', fontWeight: '700' },
  search: { height: 52, borderRadius: radius.md, backgroundColor: colors.input, borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: spacing.lg, fontSize: 16 },
  summary: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryLabel: { color: colors.secondary, fontSize: 13 }, summaryValue: { color: colors.success, fontSize: 15, fontWeight: '800' },
  list: { padding: spacing.lg, paddingBottom: 112, gap: spacing.sm, flexGrow: 1 }, section: { color: colors.secondary, backgroundColor: colors.background, paddingVertical: spacing.sm, fontSize: 13, fontWeight: '700' }, rowCard: { paddingVertical: 0 },
});
