import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Card, ErrorBlock, Header, ListRow, LoadingBlock, Screen, uiStyles } from '@/components/ui';
import { PeriodSelector } from '@/components/controls';
import { getDashboard, getSettings } from '@/data/repository';
import { formatMoney, today } from '@/domain/money';
import { createPeriodSelection, formatPeriodLabel, resolvePeriodRange } from '@/domain/period';
import { useI18n } from '@/i18n/provider';
import { colors, radius, spacing } from '@/theme/tokens';

export default function OverviewScreen() {
  const { t, language } = useI18n();
  const router = useRouter();
  const [period, setPeriod] = useState(() => createPeriodSelection('month', today()));
  const range = useMemo(() => resolvePeriodRange(period), [period]);
  const dashboardQuery = useQuery({ queryKey: ['dashboard', range.startDate, range.endDate], queryFn: () => getDashboard(range) });
  const settingsQuery = useQuery({ queryKey: ['settings'], queryFn: getSettings });
  const data = dashboardQuery.data; const settings = settingsQuery.data;
  const money = (value: number) => formatMoney(value, settings?.displayCurrency, settings?.usdRateUzs);
  const maximum = Math.max(1, ...(data?.breakdown.flatMap((item) => [item.income, item.expenses]) ?? [1]));
  const net = (data?.income ?? 0) - (data?.expenses ?? 0);
  const activeLoans = (data?.loansGiven ?? 0) - (data?.loansReturned ?? 0);

  if (dashboardQuery.isLoading || settingsQuery.isLoading) return <Screen><Header title={t('overview')} /><LoadingBlock label="Loading overview…" /></Screen>;
  if (dashboardQuery.error || settingsQuery.error) return <Screen><Header title={t('overview')} /><ErrorBlock message="The overview could not be loaded. The error was saved locally." onRetry={() => { void dashboardQuery.refetch(); void settingsQuery.refetch(); }} /></Screen>;

  return <Screen>
    <Header title={t('overview')} action={<Pressable accessibilityRole="button" accessibilityLabel={t('settings')} hitSlop={12} onPress={() => router.push('/settings')}><Text style={styles.settingsButton}>{t('settings')}</Text></Pressable>} />
    <LinearGradient colors={['#29476C', colors.elevated]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.wallet}>
      <Text style={uiStyles.label}>{t('walletBalance')}</Text>
      <Text adjustsFontSizeToFit numberOfLines={1} style={styles.walletAmount}>{money(data?.wallet ?? settings?.openingBalance ?? 0)}</Text>
    </LinearGradient>
    <Card style={styles.periodCard}><PeriodSelector value={period} onChange={setPeriod} /></Card>
    <View style={styles.summaryHeading}><Text style={uiStyles.sectionTitle}>{t('periodSummary')}</Text><Text style={styles.periodCaption}>{formatPeriodLabel(period, language === 'uz' ? 'uz-UZ' : 'en-US')}</Text></View>
    <View style={styles.grid}>
      <Card style={styles.stat}><Text style={uiStyles.label}>{t('totalIncome')}</Text><Text style={[styles.statValue, { color: colors.success }]}>{money(data?.income ?? 0)}</Text></Card>
      <Card style={styles.stat}><Text style={uiStyles.label}>{t('totalExpenses')}</Text><Text style={[styles.statValue, { color: colors.danger }]}>{money(data?.expenses ?? 0)}</Text></Card>
      <Card style={styles.stat}><Text style={uiStyles.label}>{t('net')}</Text><Text style={[styles.statValue, { color: net >= 0 ? colors.success : colors.danger }]}>{net >= 0 ? '+' : '−'}{money(Math.abs(net))}</Text></Card>
      <Card style={styles.stat}><Text style={uiStyles.label}>{t('activeLoans')}</Text><Text style={styles.statValue}>{money(activeLoans)}</Text></Card>
    </View>
    <Card style={styles.loanSummary}><View style={styles.loanItem}><Text style={uiStyles.label}>{t('upcoming')}</Text><Text style={[styles.loanValue, { color: colors.warning }]}>{money(data?.upcoming ?? 0)}</Text></View><View style={styles.verticalDivider} /><View style={styles.loanItem}><Text style={uiStyles.label}>{t('overdue')}</Text><Text style={[styles.loanValue, { color: colors.danger }]}>{money(data?.overdue ?? 0)}</Text></View></Card>
    <View style={styles.legend}><Text style={uiStyles.sectionTitle}>Income vs expenses</Text><View style={styles.legendItems}><View style={[styles.legendDot, { backgroundColor: colors.success }]} /><Text style={styles.legendText}>{t('income')}</Text><View style={[styles.legendDot, { backgroundColor: colors.danger }]} /><Text style={styles.legendText}>{t('expenses')}</Text></View></View>
    <Card><View style={styles.chart}>{data?.breakdown.map((item, index) => <View key={item.key} style={styles.month}>
      <View style={styles.bars}><View style={[styles.bar, { height: Math.max(3, item.income / maximum * 76), backgroundColor: colors.success }]} /><View style={[styles.bar, { height: Math.max(3, item.expenses / maximum * 76), backgroundColor: colors.danger }]} /></View>
      <Text style={styles.monthLabel}>{(data.breakdown.length <= 10 || index % Math.ceil(data.breakdown.length / 8) === 0) ? item.label : ''}</Text>
    </View>)}</View></Card>
    <Text style={uiStyles.sectionTitle}>{t('recent')}</Text>
    <Card>{data?.recent.length ? data.recent.map((item) => <ListRow key={`${item.kind}-${item.id}`} title={item.title} subtitle={item.date} value={`${item.kind === 'expense' || item.kind === 'give' ? '−' : '+'}${money(item.amount)}`} color={item.kind === 'expense' || item.kind === 'give' ? colors.danger : colors.success} />) : <Text style={uiStyles.subtitle}>Your recent activity will appear here.</Text>}</Card>
  </Screen>;
}

const styles = StyleSheet.create({
  wallet: { minHeight: 136, borderRadius: radius.lg, padding: spacing.xl, justifyContent: 'space-between' },
  walletAmount: { color: colors.text, fontSize: 32, fontWeight: '800' },
  periodCard: { padding: spacing.md },
  summaryHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.md },
  periodCaption: { color: colors.secondary, fontSize: 12, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  stat: { width: '48%', flexGrow: 1 },
  statValue: { color: colors.text, fontSize: 16, fontWeight: '700' },
  loanSummary: { flexDirection: 'row' }, loanItem: { flex: 1, gap: spacing.sm }, loanValue: { fontSize: 16, fontWeight: '800' }, verticalDivider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  legend: { gap: spacing.sm }, legendItems: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, legendDot: { width: 8, height: 8, borderRadius: 4 }, legendText: { color: colors.secondary, fontSize: 12, marginRight: spacing.sm },
  chart: { height: 108, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around' },
  month: { flex: 1, alignItems: 'center', gap: spacing.sm },
  bars: { height: 76, flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  bar: { width: 7, borderRadius: 4 },
  monthLabel: { color: colors.secondary, fontSize: 11 },
  settingsButton: { minHeight: 48, color: colors.primary, fontSize: 14, fontWeight: '700', textAlignVertical: 'center' },
});
