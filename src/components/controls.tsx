import { useRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Field, Segmented } from './ui';
import { formatMoneyInput } from '@/domain/money';
import { formatPeriodLabel, shiftPeriod, type PeriodMode, type PeriodSelection } from '@/domain/period';
import { useI18n } from '@/i18n/provider';
import { colors, radius, spacing } from '@/theme/tokens';

export function MoneyField({ value, onChangeText, allowNegative = false, error, ...props }: Omit<TextInputProps, 'value' | 'onChangeText'> & {
  value: string;
  onChangeText: (value: string) => void;
  allowNegative?: boolean;
  label: string;
  error?: string;
}) {
  return <Field {...props} error={error} value={value} onChangeText={(next) => onChangeText(formatMoneyInput(next, allowNegative))} keyboardType="number-pad" />;
}

export function PinCodeInput({ label, value, onChangeText, digits = 4, autoFocus = false, onComplete }: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  digits?: number;
  autoFocus?: boolean;
  onComplete?: (value: string) => void;
}) {
  const input = useRef<TextInput>(null);
  const update = (nextValue: string) => {
    const next = nextValue.replace(/\D/g, '').slice(0, digits);
    onChangeText(next);
    if (next.length === digits) onComplete?.(next);
  };
  return <View style={styles.pinField}>
    <Text style={styles.label}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => input.current?.focus()} style={[styles.pinRow, digits === 6 && styles.pinRowCompact]}>
      {Array.from({ length: digits }, (_, index) => <View key={index} style={[styles.pinBox, digits === 6 && styles.pinBoxCompact, value.length === index && styles.pinBoxActive]}>
        <Text style={styles.pinDot}>{value[index] ? '●' : ''}</Text>
      </View>)}
      <TextInput ref={input} autoFocus={autoFocus} value={value} onChangeText={update} keyboardType="number-pad" maxLength={digits} secureTextEntry textContentType="password" caretHidden style={styles.hiddenPinInput} />
    </Pressable>
  </View>;
}

export function PeriodSelector({ value, onChange }: { value: PeriodSelection; onChange: (value: PeriodSelection) => void }) {
  const { t, language } = useI18n();
  const options: { value: PeriodMode; label: string }[] = [
    { value: 'day', label: t('daily') },
    { value: 'week', label: t('weekly') },
    { value: 'month', label: t('monthly') },
    { value: 'custom', label: t('custom') },
  ];
  return <View style={styles.period}>
    <Segmented value={value.mode} onChange={(mode) => onChange({ ...value, mode })} options={options} />
    {value.mode === 'custom' ? <View style={styles.customDates}>
      <View style={styles.dateField}><Field label={t('from')} value={value.customStart} onChangeText={(customStart) => onChange({ ...value, customStart })} placeholder="YYYY-MM-DD" maxLength={10} /></View>
      <View style={styles.dateField}><Field label={t('to')} value={value.customEnd} onChangeText={(customEnd) => onChange({ ...value, customEnd })} placeholder="YYYY-MM-DD" maxLength={10} /></View>
    </View> : <View style={styles.periodNavigator}>
      <Pressable accessibilityLabel={t('previousPeriod')} onPress={() => onChange(shiftPeriod(value, -1))} style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}><SymbolView name="chevron.left" tintColor={colors.text} size={18} /></Pressable>
      <Text numberOfLines={1} style={styles.periodLabel}>{formatPeriodLabel(value, language === 'uz' ? 'uz-UZ' : 'en-US')}</Text>
      <Pressable accessibilityLabel={t('nextPeriod')} onPress={() => onChange(shiftPeriod(value, 1))} style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}><SymbolView name="chevron.right" tintColor={colors.text} size={18} /></Pressable>
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  pinField: { gap: spacing.md },
  label: { color: colors.secondary, fontSize: 13, fontWeight: '600' },
  pinRow: { minHeight: 64, flexDirection: 'row', justifyContent: 'center', gap: spacing.md, position: 'relative' },
  pinRowCompact: { gap: spacing.sm },
  pinBox: { width: 58, height: 62, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input, alignItems: 'center', justifyContent: 'center' },
  pinBoxCompact: { width: 44, height: 54 },
  pinBoxActive: { borderWidth: 2, borderColor: colors.primary },
  pinDot: { color: colors.text, fontSize: 18 },
  hiddenPinInput: { position: 'absolute', inset: 0, opacity: 0.01, color: 'transparent' },
  period: { gap: spacing.md },
  periodNavigator: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  periodLabel: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  arrow: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.input, borderWidth: 1, borderColor: colors.border },
  pressed: { opacity: 0.65 },
  customDates: { flexDirection: 'row', gap: spacing.md },
  dateField: { flex: 1 },
});
