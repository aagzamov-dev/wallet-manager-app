import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSession } from '@/security/session';
import { colors } from '@/theme/tokens';

export default function IndexScreen() {
  const { status } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (status === 'setup') router.replace('/setup');
    if (status === 'locked') router.replace('/unlock');
    if (status === 'unlocked') router.replace('/(tabs)/expenses?compose=1');
  }, [router, status]);
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}><ActivityIndicator color={colors.primary} /></View>;
}
