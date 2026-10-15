import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, EmptyState, ErrorBlock, Fab, Header, ListRow, LoadingBlock, Segmented } from '@/components/ui';
import { refreshQueries } from '@/data/query-cache';
import { deletePerson, deleteProject, getSettings, listPeople, listProjects } from '@/data/repository';
import { formatMoney } from '@/domain/money';
import type { LoanPerson, LoanProject } from '@/domain/types';
import { useI18n } from '@/i18n/provider';
import { colors, spacing } from '@/theme/tokens';

type LoanView = 'people' | 'projects';

export default function LoansScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [view, setView] = useState<LoanView>('people');
  const settingsQuery = useQuery({ queryKey: ['settings'], queryFn: getSettings });
  const peopleQuery = useQuery({ queryKey: ['people'], queryFn: listPeople, enabled: view === 'people' });
  const projectsQuery = useQuery({ queryKey: ['projects'], queryFn: listProjects, enabled: view === 'projects' });
  const settings = settingsQuery.data;
  const people = peopleQuery.data ?? [];
  const projects = projectsQuery.data ?? [];
  const removePerson = useMutation({
    mutationKey: ['delete-person'],
    mutationFn: deletePerson,
    onSuccess: () => refreshQueries(queryClient, ['people', 'dashboard', 'settings']),
    onError: () => Alert.alert('Loan', 'The person could not be deleted. The error was saved locally.'),
  });
  const removeProject = useMutation({
    mutationKey: ['delete-project'],
    mutationFn: deleteProject,
    onSuccess: () => refreshQueries(queryClient, ['projects', 'dashboard', 'settings']),
    onError: () => Alert.alert('Loan', 'The project could not be deleted. The error was saved locally.'),
  });
  const money = (amount: number) => formatMoney(amount, settings?.displayCurrency, settings?.usdRateUzs);
  const confirmPerson = (id: string) => Alert.alert('Delete person and timeline?', 'All transactions for this person will be removed.', [{ text: t('cancel') }, { text: t('delete'), style: 'destructive', onPress: () => removePerson.mutate(id) }]);
  const confirmProject = (id: string) => Alert.alert('Delete project?', 'All expected payments are removed. Existing income remains.', [{ text: t('cancel') }, { text: t('delete'), style: 'destructive', onPress: () => removeProject.mutate(id) }]);

  const renderPerson = ({ item }: { item: LoanPerson }) => <Card style={styles.card}>
    <ListRow title={item.name} subtitle={item.balance < 0 ? 'They have given you more' : undefined} value={money(item.balance)} color={item.balance >= 0 ? colors.warning : colors.success} onPress={() => router.push(`/person/${item.id}`)} onLongPress={() => confirmPerson(item.id)} />
  </Card>;
  const renderProject = ({ item }: { item: LoanProject }) => <Card style={styles.card}>
    <ListRow title={item.name} subtitle={item.borrower ?? undefined} value={item.overdueAmount ? money(item.overdueAmount) : money(item.upcomingAmount)} color={item.overdueAmount ? colors.danger : colors.warning} onPress={() => router.push(`/project/${item.id}`)} onLongPress={() => confirmProject(item.id)} />
  </Card>;

  return <SafeAreaView edges={['top']} style={styles.page}>
    <View style={styles.top}>
      <Header title={t('loans')} action={<Pressable hitSlop={12} onPress={() => router.push('/settings')}><Text style={styles.action}>{t('settings')}</Text></Pressable>} />
      <Segmented value={view} onChange={setView} options={[{ value: 'people', label: t('people') }, { value: 'projects', label: t('projects') }]} />
    </View>
    {view === 'people' ? <FlatList
      key="people"
      data={people}
      keyExtractor={(item) => item.id}
      renderItem={renderPerson}
      contentContainerStyle={styles.list}
      initialNumToRender={12}
      maxToRenderPerBatch={12}
      windowSize={7}
      ListEmptyComponent={peopleQuery.isLoading ? <LoadingBlock label="Loading loans…" /> : peopleQuery.error ? <ErrorBlock message="People loans could not be loaded." onRetry={() => { void peopleQuery.refetch(); }} /> : <EmptyState title={t('emptyLoans')} />}
    /> : <FlatList
      key="projects"
      data={projects}
      keyExtractor={(item) => item.id}
      renderItem={renderProject}
      contentContainerStyle={styles.list}
      initialNumToRender={12}
      maxToRenderPerBatch={12}
      windowSize={7}
      ListEmptyComponent={projectsQuery.isLoading ? <LoadingBlock label="Loading projects…" /> : projectsQuery.error ? <ErrorBlock message="Loan projects could not be loaded." onRetry={() => { void projectsQuery.refetch(); }} /> : <EmptyState title={t('emptyLoans')} />}
    />}
    <Fab label={t('add')} onPress={() => router.push(view === 'people' ? '/person-sheet' : '/project-sheet')} />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  top: { paddingTop: spacing.lg, paddingHorizontal: spacing.lg, gap: spacing.md },
  action: { color: colors.primary, minHeight: 48, textAlignVertical: 'center', fontWeight: '700' },
  list: { flexGrow: 1, gap: spacing.md, padding: spacing.lg, paddingBottom: 112 },
  card: { paddingVertical: 0 },
});
