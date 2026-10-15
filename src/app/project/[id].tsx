import { Pressable, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Card, ErrorBlock, Fab, Header, ListRow, LoadingBlock, Screen, uiStyles } from '@/components/ui';
import { getSettings, listExpectedIncome, listProjects } from '@/data/repository';
import { formatMoney } from '@/domain/money';
import { useI18n } from '@/i18n/provider';
import { colors } from '@/theme/tokens';

export default function ProjectDetail() {
  const { id = '' } = useLocalSearchParams<{ id: string }>(); const { t } = useI18n(); const router = useRouter();
  const settingsQuery = useQuery({ queryKey: ['settings'], queryFn: getSettings });
  const projectsQuery = useQuery({ queryKey: ['projects'], queryFn: listProjects });
  const expectedQuery = useQuery({ queryKey: ['expected-income', id], queryFn: () => listExpectedIncome(id) });
  const settings = settingsQuery.data; const projects = projectsQuery.data ?? []; const expected = expectedQuery.data ?? [];
  const project = projects.find((item) => item.id === id); const money = (amount: number) => formatMoney(amount, settings?.displayCurrency, settings?.usdRateUzs);
  if (settingsQuery.isLoading || projectsQuery.isLoading || expectedQuery.isLoading) return <Screen><Header title={t('projects')} action={<Pressable onPress={() => router.back()}><Text style={styles.action}>Back</Text></Pressable>} /><LoadingBlock label="Loading project…" /></Screen>;
  if (settingsQuery.error || projectsQuery.error || expectedQuery.error) return <Screen><Header title={t('projects')} action={<Pressable onPress={() => router.back()}><Text style={styles.action}>Back</Text></Pressable>} /><ErrorBlock message="The project could not be loaded." onRetry={() => { void settingsQuery.refetch(); void projectsQuery.refetch(); void expectedQuery.refetch(); }} /></Screen>;
  return <Screen><Header title={project?.name ?? t('projects')} action={<Pressable onPress={() => router.back()}><Text style={styles.action}>Back</Text></Pressable>} />{project?.borrower ? <Text style={uiStyles.subtitle}>{project.borrower}</Text> : null}<Card><Text style={uiStyles.label}>{t('upcoming')}</Text><Text style={[uiStyles.amount, { color: colors.warning }]}>{money(project?.upcomingAmount ?? 0)}</Text>{project?.overdueAmount ? <><Text style={uiStyles.label}>{t('overdue')}</Text><Text style={[uiStyles.amount, { color: colors.danger }]}>{money(project.overdueAmount)}</Text></> : null}</Card><Text style={uiStyles.sectionTitle}>Expected payments</Text><Card>{expected.length ? expected.map((item) => <ListRow key={item.id} title={item.status === 'RECEIVED' ? t('received') : item.status === 'PARTIAL' ? t('partial') : item.dueDate < new Date().toISOString().slice(0, 10) ? t('overdue') : t('upcoming')} subtitle={item.dueDate} value={money(item.amount)} color={item.status === 'RECEIVED' ? colors.success : item.dueDate < new Date().toISOString().slice(0, 10) ? colors.danger : colors.warning} onPress={item.status === 'RECEIVED' ? undefined : () => router.push({ pathname: '/payment-sheet', params: { expectedId: item.id, amount: String(item.amount), projectId: id } })} />) : <Text style={uiStyles.subtitle}>No expected payments yet.</Text>}</Card><Fab label={t('add')} onPress={() => router.push({ pathname: '/expected-income-sheet', params: { projectId: id } })} /></Screen>;
}
const styles = StyleSheet.create({ action: { color: colors.primary, minHeight: 48, textAlignVertical: 'center', fontWeight: '700' } });
