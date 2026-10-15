import { ActivityIndicator, View } from 'react-native';
import { colors } from '@/theme/tokens';

export default function IndexScreen() {
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}><ActivityIndicator color={colors.primary} /></View>;
}
