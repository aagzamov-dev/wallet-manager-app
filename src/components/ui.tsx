import type { PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, type TextInputProps,
  View, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { colors, radius, spacing } from '@/theme/tokens';

export function Screen({ children, scroll = true, contentStyle }: PropsWithChildren<{ scroll?: boolean; contentStyle?: ViewStyle }>) {
  const content = <View style={[styles.screenContent, contentStyle]}>{children}</View>;
  return <SafeAreaView edges={['top']} style={styles.screen}>{scroll ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>{content}</ScrollView> : content}</SafeAreaView>;
}

export function Header({ title, action }: { title: string; action?: ReactNode }) {
  return <View style={styles.header}><Text accessibilityRole="header" style={styles.headerTitle}>{title}</Text>{action}</View>;
}

export function Card({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function PrimaryButton({ label, onPress, disabled, loading, tone = 'primary' }: {
  label: string; onPress: () => void; disabled?: boolean; loading?: boolean; tone?: 'primary' | 'danger' | 'success';
}) {
  const backgroundColor = tone === 'danger' ? colors.danger : tone === 'success' ? colors.success : colors.primary;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled || loading} onPress={onPress}
      style={({ pressed }) => [styles.primaryButton, { backgroundColor }, (pressed || disabled) && styles.buttonDimmed]}>
      {loading ? <ActivityIndicator color={colors.background} /> : <Text style={styles.primaryButtonText}>{label}</Text>}
    </Pressable>
  );
}

export function GhostButton({ label, onPress, danger = false }: { label: string; onPress: () => void; danger?: boolean }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.ghostButton, pressed && styles.buttonDimmed]}><Text style={[styles.ghostText, danger && { color: colors.danger }]}>{label}</Text></Pressable>;
}

export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput placeholderTextColor={colors.secondary} selectionColor={colors.primary} {...props} style={[styles.input, props.multiline && styles.multiline, props.style]} />{error ? <Text style={styles.error}>{error}</Text> : null}</View>;
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (value: T) => void }) {
  return <View style={styles.segmented}>{options.map((option) => <Pressable key={option.value} onPress={() => onChange(option.value)} style={[styles.segment, value === option.value && styles.segmentSelected]}><Text style={[styles.segmentText, value === option.value && styles.segmentTextSelected]}>{option.label}</Text></Pressable>)}</View>;
}

export function ListRow({ title, subtitle, value, color, onPress, onLongPress }: { title: string; subtitle?: string; value?: string; color?: string; onPress?: () => void; onLongPress?: () => void }) {
  return <Pressable onPress={onPress} onLongPress={onLongPress} disabled={!onPress && !onLongPress} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
    {color ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
    <View style={styles.rowText}><Text numberOfLines={1} style={styles.rowTitle}>{title}</Text>{subtitle ? <Text numberOfLines={1} style={styles.rowSubtitle}>{subtitle}</Text> : null}</View>
    {value ? <Text style={styles.rowValue}>{value}</Text> : null}
    {onPress ? <SymbolView name="chevron.right" tintColor={colors.secondary} size={16} /> : null}
  </Pressable>;
}

export function Fab({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.fab, pressed && styles.buttonDimmed]}><SymbolView name="plus" tintColor={colors.background} size={24} /><Text style={styles.fabText}>{label}</Text></Pressable>;
}

export function EmptyState({ title }: { title: string }) {
  return <View style={styles.empty}><SymbolView name="tray" tintColor={colors.secondary} size={32} /><Text style={styles.emptyText}>{title}</Text></View>;
}

export const uiStyles = StyleSheet.create({
  title: { color: colors.text, fontSize: 28, lineHeight: 34, fontWeight: '700' },
  subtitle: { color: colors.secondary, fontSize: 15, lineHeight: 22 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: spacing.sm },
  label: { color: colors.secondary, fontSize: 13, fontWeight: '600' },
  amount: { color: colors.text, fontSize: 24, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  gap: { gap: spacing.md },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1 },
  screenContent: { flex: 1, padding: spacing.lg, paddingBottom: 112, gap: spacing.lg },
  header: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: colors.text, fontSize: 28, fontWeight: '700' },
  card: { backgroundColor: colors.elevated, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, padding: spacing.lg, gap: spacing.md },
  primaryButton: { height: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  primaryButtonText: { color: colors.background, fontSize: 16, fontWeight: '800' },
  buttonDimmed: { opacity: 0.7 },
  ghostButton: { minHeight: 48, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.md },
  ghostText: { color: colors.primary, fontSize: 15, fontWeight: '700' },
  field: { gap: spacing.sm },
  label: { color: colors.secondary, fontSize: 13, fontWeight: '600' },
  input: { minHeight: 52, color: colors.text, backgroundColor: colors.input, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, fontSize: 16 },
  multiline: { minHeight: 96, paddingTop: spacing.md, textAlignVertical: 'top' },
  error: { color: colors.danger, fontSize: 12 },
  segmented: { flexDirection: 'row', backgroundColor: colors.input, borderRadius: radius.md, padding: spacing.xs, gap: spacing.xs },
  segment: { flex: 1, minHeight: 44, borderRadius: radius.sm, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.sm },
  segmentSelected: { backgroundColor: colors.elevated },
  segmentText: { color: colors.secondary, fontSize: 14, fontWeight: '600' },
  segmentTextSelected: { color: colors.text },
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowPressed: { opacity: 0.65 },
  rowText: { flex: 1, gap: 3 },
  rowTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  rowSubtitle: { color: colors.secondary, fontSize: 13 },
  rowValue: { color: colors.text, fontSize: 15, fontWeight: '700' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  fab: { position: 'absolute', right: spacing.lg, bottom: spacing.lg, minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.lg, paddingHorizontal: spacing.lg, elevation: 5 },
  fabText: { color: colors.background, fontSize: 15, fontWeight: '800' },
  empty: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  emptyText: { color: colors.secondary, fontSize: 15 },
});
