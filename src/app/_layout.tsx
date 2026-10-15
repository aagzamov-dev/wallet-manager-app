import { Suspense, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, Stack, ThemeProvider, usePathname, useRouter } from 'expo-router';
import { SQLiteProvider, type SQLiteDatabase } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { migrateDatabase, setDatabase } from '@/data/database';
import { ErrorBlock, LoadingBlock } from '@/components/ui';
import { AppErrorBoundary } from '@/errors/AppErrorBoundary';
import { recordError } from '@/errors/error-log';
import { I18nProvider } from '@/i18n/provider';
import { SessionProvider, useSession } from '@/security/session';
import { colors } from '@/theme/tokens';

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: (error, query) => { void recordError(`Data: ${String(query.queryKey[0] ?? 'unknown')}`, error); } }),
  mutationCache: new MutationCache({ onError: (error, _variables, _context, mutation) => { void recordError(`Action: ${String(mutation.options.mutationKey?.[0] ?? 'unknown')}`, error); } }),
  defaultOptions: { queries: { staleTime: 10_000, retry: 1 } },
});
const navigationTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, primary: colors.primary, background: colors.background, card: colors.surface, text: colors.text, border: colors.border, notification: colors.danger },
};

async function initializeDatabase(db: SQLiteDatabase): Promise<void> {
  try {
    setDatabase(db);
    await migrateDatabase(db);
  } catch (error) {
    await recordError('Database startup', error);
    throw error;
  }
}

function GuardedNavigator() {
  const { status, initializationError, retryInitialization } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (status === 'locked' && pathname !== '/unlock') router.replace('/unlock');
    if (status === 'setup' && pathname !== '/setup') router.replace('/setup');
  }, [pathname, router, status]);

  if (status === 'loading') return <View style={{ flex: 1, backgroundColor: colors.background }}><LoadingBlock label="Loading Wallet Manager…" /></View>;
  if (status === 'error') return <View style={{ flex: 1, backgroundColor: colors.background }}><ErrorBlock message={initializationError ?? 'Wallet Manager could not finish loading. The error was saved locally.'} onRetry={() => { void retryInitialization(); }} /></View>;

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: 'fade_from_bottom' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="setup" options={{ gestureEnabled: false, animation: 'none' }} />
        <Stack.Screen name="unlock" options={{ gestureEnabled: false, animation: 'none' }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="backup" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="categories" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="error-log" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="expense-sheet" options={{ presentation: 'formSheet', sheetAllowedDetents: [0.92], sheetGrabberVisible: true, contentStyle: { backgroundColor: colors.elevated } }} />
        <Stack.Screen name="income-sheet" options={{ presentation: 'formSheet', sheetAllowedDetents: [0.82], sheetGrabberVisible: true, contentStyle: { backgroundColor: colors.elevated } }} />
        <Stack.Screen name="person-sheet" options={{ presentation: 'formSheet', sheetAllowedDetents: [0.7], sheetGrabberVisible: true, contentStyle: { backgroundColor: colors.elevated } }} />
        <Stack.Screen name="project-sheet" options={{ presentation: 'formSheet', sheetAllowedDetents: [0.72], sheetGrabberVisible: true, contentStyle: { backgroundColor: colors.elevated } }} />
        <Stack.Screen name="loan-transaction-sheet" options={{ presentation: 'formSheet', sheetAllowedDetents: [0.76], sheetGrabberVisible: true, contentStyle: { backgroundColor: colors.elevated } }} />
        <Stack.Screen name="expected-income-sheet" options={{ presentation: 'formSheet', sheetAllowedDetents: [0.8], sheetGrabberVisible: true, contentStyle: { backgroundColor: colors.elevated } }} />
        <Stack.Screen name="payment-sheet" options={{ presentation: 'formSheet', sheetAllowedDetents: [0.68], sheetGrabberVisible: true, contentStyle: { backgroundColor: colors.elevated } }} />
        <Stack.Screen name="person/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="project/[id]" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider value={navigationTheme}>
        <AppErrorBoundary>
          <Suspense fallback={<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}><ActivityIndicator color={colors.primary} /></View>}>
            <SQLiteProvider databaseName="my-money.db" onInit={initializeDatabase} useSuspense>
              <QueryClientProvider client={queryClient}>
                <I18nProvider><SessionProvider><GuardedNavigator /></SessionProvider></I18nProvider>
              </QueryClientProvider>
            </SQLiteProvider>
          </Suspense>
        </AppErrorBoundary>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
