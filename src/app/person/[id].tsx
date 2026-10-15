import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Card, Header, ListRow, PrimaryButton, Screen, uiStyles } from '@/components/ui';
import { getSettings, listPeople, listPersonTransactions } from '@/data/repository';
import { formatMoney } from '@/domain/money';
import { useI18n } from '@/i18n/provider';
import { colors, spacing } from '@/theme/tokens';

export default function PersonDetail() {
  const { id = '' } = useLocalSearchParams<{ id: string }>(); const { t } = useI18n(); const router = useRouter();
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: getSettings });
  const { data: people = [] } = useQuery({ queryKey: ['people'], queryFn: listPeople });
  const { data: transactions = [] } = useQuery({ queryKey: ['person-transactions', id], queryFn: () => listPersonTransactions(id) });
  const person = people.find((item) => item.id === id); const money = (amount: number) => formatMoney(amount, settings?.displayCurrency, settings?.usdRateUzs);
  return <Screen><Header title={person?.name ?? t('loans')} action={<Pressable onPress={() => router.back()}><Text style={styles.action}>Back</Text></Pressable>} /><Card><Text style={uiStyles.label}>Current balance</Text><Text style={[uiStyles.amount, { color: (person?.balance ?? 0) >= 0 ? colors.warning : colors.success }]}>{money(person?.balance ?? 0)}</Text></Card><View style={styles.actions}><PrimaryButton label={t('give')} onPress={() => router.push({ pathname: '/loan-transaction-sheet', params: { personId: id, kind: 'GIVE' } })} /><PrimaryButton label={t('returned')} tone="success" onPress={() => router.push({ pathname: '/loan-transaction-sheet', params: { personId: id, kind: 'RETURN' } })} /></View><Text style={uiStyles.sectionTitle}>Timeline</Text><Card>{transactions.length ? transactions.map((item) => <ListRow key={item.id} title={item.kind === 'GIVE' ? t('give') : t('returned')} subtitle={`${item.date}${item.note ? ` · ${item.note}` : ''}`} value={`${item.kind === 'GIVE' ? '−' : '+'}${money(item.amount)}`} color={item.kind === 'GIVE' ? colors.danger : colors.success} />) : <Text style={uiStyles.subtitle}>No transactions yet.</Text>}</Card></Screen>;
}
const styles = StyleSheet.create({ action: { color: colors.primary, minHeight: 48, textAlignVertical: 'center', fontWeight: '700' }, actions: { flexDirection: 'row', gap: spacing.md }, });
