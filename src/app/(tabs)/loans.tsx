import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, EmptyState, Fab, Header, ListRow, Screen, Segmented } from '@/components/ui';
import { deletePerson, deleteProject, getSettings, listPeople, listProjects } from '@/data/repository';
import { formatMoney } from '@/domain/money';
import { useI18n } from '@/i18n/provider';
import { colors, spacing } from '@/theme/tokens';

type LoanView = 'people' | 'projects';
export default function LoansScreen() {
  const { t } = useI18n(); const router = useRouter(); const queryClient = useQueryClient();
  const [view, setView] = useState<LoanView>('people');
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: getSettings });
  const { data: people = [] } = useQuery({ queryKey: ['people'], queryFn: listPeople });
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: listProjects });
  const removePerson = useMutation({ mutationFn: deletePerson, onSuccess: async () => queryClient.invalidateQueries() });
  const removeProject = useMutation({ mutationFn: deleteProject, onSuccess: async () => queryClient.invalidateQueries() });
  const money = (amount: number) => formatMoney(amount, settings?.displayCurrency, settings?.usdRateUzs);
  const confirmPerson = (id: string) => Alert.alert('Delete person and timeline?', 'All transactions for this person will be removed.', [{ text: t('cancel') }, { text: t('delete'), style: 'destructive', onPress: () => removePerson.mutate(id) }]);
  const confirmProject = (id: string) => Alert.alert('Delete project?', 'All expected payments are removed. Existing income remains.', [{ text: t('cancel') }, { text: t('delete'), style: 'destructive', onPress: () => removeProject.mutate(id) }]);
  return <View style={styles.page}><Screen scroll={false} contentStyle={{ paddingBottom: 96 }}>
    <Header title={t('loans')} action={<Pressable onPress={() => router.push('/settings')}><Text style={styles.action}>{t('settings')}</Text></Pressable>} />
    <Segmented value={view} onChange={setView} options={[{ value: 'people', label: t('people') }, { value: 'projects', label: t('projects') }]} />
    <View style={styles.list}>{view === 'people' ? people.length ? people.map((person) => <Card key={person.id} style={styles.card}><ListRow title={person.name} subtitle={person.balance < 0 ? 'They have given you more' : undefined} value={money(person.balance)} color={person.balance >= 0 ? colors.warning : colors.success} onPress={() => router.push(`/person/${person.id}`)} onLongPress={() => confirmPerson(person.id)} /></Card>) : <EmptyState title={t('emptyLoans')} /> : projects.length ? projects.map((project) => <Card key={project.id} style={styles.card}><ListRow title={project.name} subtitle={project.borrower ?? undefined} value={project.overdueAmount ? money(project.overdueAmount) : money(project.upcomingAmount)} color={project.overdueAmount ? colors.danger : colors.warning} onPress={() => router.push(`/project/${project.id}`)} onLongPress={() => confirmProject(project.id)} /></Card>) : <EmptyState title={t('emptyLoans')} />}</View>
  </Screen><Fab label={t('add')} onPress={() => router.push(view === 'people' ? '/person-sheet' : '/project-sheet')} /></View>;
}
const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: colors.background }, action: { color: colors.primary, minHeight: 48, textAlignVertical: 'center', fontWeight: '700' }, list: { gap: spacing.md }, card: { paddingVertical: 0 } });
