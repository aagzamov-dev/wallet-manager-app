import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, EmptyState, ErrorBlock, Fab, Header, ListRow, LoadingBlock, Screen, Segmented } from '@/components/ui';
import { deletePerson, deleteProject, getSettings, listPeople, listProjects } from '@/data/repository';
import { formatMoney } from '@/domain/money';
import { useI18n } from '@/i18n/provider';
import { colors, spacing } from '@/theme/tokens';

type LoanView = 'people' | 'projects';
export default function LoansScreen() {
  const { t } = useI18n(); const router = useRouter(); const queryClient = useQueryClient();
  const [view, setView] = useState<LoanView>('people');
  const settingsQuery = useQuery({ queryKey: ['settings'], queryFn: getSettings });
  const peopleQuery = useQuery({ queryKey: ['people'], queryFn: listPeople });
  const projectsQuery = useQuery({ queryKey: ['projects'], queryFn: listProjects });
  const settings = settingsQuery.data; const people = peopleQuery.data ?? []; const projects = projectsQuery.data ?? [];
  const removePerson = useMutation({ mutationKey: ['delete-person'], mutationFn: deletePerson, onSuccess: async () => queryClient.invalidateQueries(), onError: () => Alert.alert('Loan', 'The person could not be deleted. The error was saved locally.') });
  const removeProject = useMutation({ mutationKey: ['delete-project'], mutationFn: deleteProject, onSuccess: async () => queryClient.invalidateQueries(), onError: () => Alert.alert('Loan', 'The project could not be deleted. The error was saved locally.') });
  const money = (amount: number) => formatMoney(amount, settings?.displayCurrency, settings?.usdRateUzs);
  const confirmPerson = (id: string) => Alert.alert('Delete person and timeline?', 'All transactions for this person will be removed.', [{ text: t('cancel') }, { text: t('delete'), style: 'destructive', onPress: () => removePerson.mutate(id) }]);
  const confirmProject = (id: string) => Alert.alert('Delete project?', 'All expected payments are removed. Existing income remains.', [{ text: t('cancel') }, { text: t('delete'), style: 'destructive', onPress: () => removeProject.mutate(id) }]);
  return <View style={styles.page}><Screen scroll={false} contentStyle={{ paddingBottom: 96 }}>
    <Header title={t('loans')} action={<Pressable onPress={() => router.push('/settings')}><Text style={styles.action}>{t('settings')}</Text></Pressable>} />
    <Segmented value={view} onChange={setView} options={[{ value: 'people', label: t('people') }, { value: 'projects', label: t('projects') }]} />
    <View style={styles.list}>{view === 'people' ? peopleQuery.isLoading ? <LoadingBlock label="Loading loans…" /> : peopleQuery.error ? <ErrorBlock message="People loans could not be loaded." onRetry={() => { void peopleQuery.refetch(); }} /> : people.length ? people.map((person) => <Card key={person.id} style={styles.card}><ListRow title={person.name} subtitle={person.balance < 0 ? 'They have given you more' : undefined} value={money(person.balance)} color={person.balance >= 0 ? colors.warning : colors.success} onPress={() => router.push(`/person/${person.id}`)} onLongPress={() => confirmPerson(person.id)} /></Card>) : <EmptyState title={t('emptyLoans')} /> : projectsQuery.isLoading ? <LoadingBlock label="Loading projects…" /> : projectsQuery.error ? <ErrorBlock message="Loan projects could not be loaded." onRetry={() => { void projectsQuery.refetch(); }} /> : projects.length ? projects.map((project) => <Card key={project.id} style={styles.card}><ListRow title={project.name} subtitle={project.borrower ?? undefined} value={project.overdueAmount ? money(project.overdueAmount) : money(project.upcomingAmount)} color={project.overdueAmount ? colors.danger : colors.warning} onPress={() => router.push(`/project/${project.id}`)} onLongPress={() => confirmProject(project.id)} /></Card>) : <EmptyState title={t('emptyLoans')} />}</View>
  </Screen><Fab label={t('add')} onPress={() => router.push(view === 'people' ? '/person-sheet' : '/project-sheet')} /></View>;
}
const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: colors.background }, action: { color: colors.primary, minHeight: 48, textAlignVertical: 'center', fontWeight: '700' }, list: { gap: spacing.md }, card: { paddingVertical: 0 } });
