import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useI18n } from '@/i18n/provider';
import { colors } from '@/theme/tokens';

export default function TabLayout() {
  const { t } = useI18n();
  return (
    <NativeTabs backgroundColor={colors.surface} tintColor={colors.primary} iconColor={{ default: colors.secondary, selected: colors.primary }} indicatorColor={colors.elevated} rippleColor={colors.border} labelVisibilityMode="labeled" backBehavior="history">
      <NativeTabs.Trigger name="overview"><NativeTabs.Trigger.Icon md={{ default: 'dashboard', selected: 'dashboard' }} sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }} /><NativeTabs.Trigger.Label>{t('overview')}</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="expenses"><NativeTabs.Trigger.Icon md={{ default: 'payments', selected: 'payments' }} sf={{ default: 'creditcard', selected: 'creditcard.fill' }} /><NativeTabs.Trigger.Label>{t('expenses')}</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="income"><NativeTabs.Trigger.Icon md={{ default: 'trending_up', selected: 'trending_up' }} sf={{ default: 'arrow.down.circle', selected: 'arrow.down.circle.fill' }} /><NativeTabs.Trigger.Label>{t('income')}</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="loans"><NativeTabs.Trigger.Icon md={{ default: 'handshake', selected: 'handshake' }} sf={{ default: 'person.2', selected: 'person.2.fill' }} /><NativeTabs.Trigger.Label>{t('loans')}</NativeTabs.Trigger.Label></NativeTabs.Trigger>
    </NativeTabs>
  );
}
