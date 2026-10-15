import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View, type TextInputProps } from 'react-native';
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

export function PinCodeInput({ label, value, onChangeText, digits = 4, onComplete, disabled = false }: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  digits?: number;
  autoFocus?: boolean;
  onComplete?: (value: string) => void;
  disabled?: boolean;
}) {
  const valueRef = useRef(value);
  useEffect(() => { valueRef.current = value; }, [value]);
  const append = (number: string) => {
    if (disabled || valueRef.current.length >= digits) return;
    const next = `${valueRef.current}${number}`.slice(0, digits);
    valueRef.current = next;
    onChangeText(next);
    if (next.length === digits) onComplete?.(next);
  };
  const remove = () => {
    if (!disabled) {
      const next = valueRef.current.slice(0, -1);
      valueRef.current = next;
      onChangeText(next);
    }
  };
  const keys: (string | null)[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', null, '0', 'backspace'];

  return <View style={styles.pinField}>
    <Text style={styles.label}>{label}</Text>
    <View accessibilityLabel={`${value.length} of ${digits} PIN digits entered`} style={styles.pinDisplay}>
      {Array.from({ length: digits }, (_, index) => <View key={index} style={[styles.pinDot, index < value.length && styles.pinDotFilled]} />)}
    </View>
    <View style={styles.keypad}>
      {keys.map((key, index) => key === null
        ? <View key={`space-${index}`} style={styles.key} />
        : <Pressable
          key={key}
          accessibilityRole="button"
          accessibilityLabel={key === 'backspace' ? 'Delete last PIN digit' : `PIN digit ${key}`}
          disabled={disabled || (key === 'backspace' ? value.length === 0 : value.length >= digits)}
          onPress={key === 'backspace' ? remove : () => append(key)}
          style={({ pressed }) => [styles.key, pressed && styles.keyPressed, disabled && styles.keyDisabled]}
        >
          <Text style={[styles.keyText, key === 'backspace' && styles.backspace]}>{key === 'backspace' ? '⌫' : key}</Text>
        </Pressable>)}
    </View>
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
      <Pressable accessibilityRole="button" accessibilityLabel={t('previousPeriod')} onPress={() => onChange(shiftPeriod(value, -1))} style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}><Text style={styles.arrowText}>‹</Text></Pressable>
      <Text numberOfLines={1} style={styles.periodLabel}>{formatPeriodLabel(value, language === 'uz' ? 'uz-UZ' : 'en-US')}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={t('nextPeriod')} onPress={() => onChange(shiftPeriod(value, 1))} style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}><Text style={styles.arrowText}>›</Text></Pressable>
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  pinField: { alignItems: 'center', gap: spacing.md },
  label: { color: colors.secondary, fontSize: 13, fontWeight: '600' },
  pinDisplay: { minWidth: 132, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, borderRadius: radius.pill, backgroundColor: colors.input, borderWidth: 1, borderColor: colors.border },
  pinDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: colors.secondary },
  pinDotFilled: { borderColor: colors.primary, backgroundColor: colors.primary },
  keypad: { width: '100%', maxWidth: 288, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.md },
  key: { width: 80, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  keyPressed: { backgroundColor: colors.elevated, transform: [{ scale: 0.96 }] },
  keyDisabled: { opacity: 0.5 },
  keyText: { color: colors.text, fontSize: 24, fontWeight: '700' },
  backspace: { color: colors.secondary, fontSize: 23 },
  period: { gap: spacing.md },
  periodNavigator: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  periodLabel: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  arrow: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.input, borderWidth: 1, borderColor: colors.border },
  arrowText: { color: colors.text, fontSize: 31, lineHeight: 34, fontWeight: '400' },
  pressed: { opacity: 0.65 },
  customDates: { flexDirection: 'row', gap: spacing.md },
  dateField: { flex: 1 },
});
