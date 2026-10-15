import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Card, EmptyState, ErrorBlock, GhostButton, Header, LoadingBlock, Screen, uiStyles } from '@/components/ui';
import { clearErrorLog, readErrorLog } from '@/errors/error-log';
import { colors, spacing } from '@/theme/tokens';

export default function ErrorLogScreen() {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data: entries, isLoading, error, refetch } = useQuery({ queryKey: ['error-log'], queryFn: readErrorLog, staleTime: 0 });

  const confirmClear = () => Alert.alert('Clear error log?', 'This removes the saved diagnostic messages from this phone.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Clear', style: 'destructive', onPress: async () => { await clearErrorLog(); await refetch(); } },
  ]);

  return <Screen>
    <Header title="Error log" action={<Pressable accessibilityRole="button" onPress={() => router.back()}><Text style={styles.done}>Done</Text></Pressable>} />
    <Text style={uiStyles.subtitle}>Errors are stored only on this phone. Passwords and PIN values are not included. The newest 100 errors are kept.</Text>
    {isLoading ? <LoadingBlock label="Loading error log…" /> : null}
    {error ? <ErrorBlock message="The error log could not be opened." onRetry={() => { void refetch(); }} /> : null}
    {!isLoading && !error && entries?.length === 0 ? <EmptyState title="No saved errors" /> : null}
    {entries?.map((entry) => {
      const expanded = expandedId === entry.id;
      return <Pressable key={entry.id} accessibilityRole="button" onPress={() => setExpandedId(expanded ? null : entry.id)}>
        <Card>
          <View style={styles.entryHeader}><Text style={styles.area}>{entry.area}</Text><Text style={styles.time}>{new Date(entry.occurredAt).toLocaleString()}</Text></View>
          <Text selectable style={styles.message}>{entry.message}</Text>
          {expanded && entry.details ? <Text selectable style={styles.details}>{entry.details}</Text> : null}
          {entry.details ? <Text style={styles.expand}>{expanded ? 'Hide details' : 'Show details'}</Text> : null}
        </Card>
      </Pressable>;
    })}
    {entries?.length ? <GhostButton danger label="Clear error log" onPress={confirmClear} /> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  done: { minHeight: 48, color: colors.primary, fontWeight: '700', textAlignVertical: 'center' },
  entryHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  area: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '700' },
  time: { color: colors.secondary, fontSize: 11 },
  message: { color: colors.danger, fontSize: 14, lineHeight: 20 },
  details: { color: colors.secondary, fontSize: 11, lineHeight: 17 },
  expand: { color: colors.primary, fontSize: 13, fontWeight: '700' },
});
