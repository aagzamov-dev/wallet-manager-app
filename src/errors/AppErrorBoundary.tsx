import { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { recordError } from './error-log';
import { colors, radius, spacing } from '@/theme/tokens';

type State = { error: Error | null };

export class AppErrorBoundary extends Component<PropsWithChildren, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    void recordError('App screen', new Error(`${error.message}\n${info.componentStack ?? ''}`));
  }

  private retry = (): void => this.setState({ error: null });

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.message}>The error was saved on this phone. You can review it in Settings → Error log.</Text>
        <Pressable accessibilityRole="button" onPress={this.retry} style={styles.button}>
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.lg, backgroundColor: colors.background },
  title: { color: colors.text, fontSize: 24, fontWeight: '800', textAlign: 'center' },
  message: { color: colors.secondary, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  button: { minHeight: 52, minWidth: 160, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, borderRadius: radius.md, backgroundColor: colors.primary },
  buttonText: { color: colors.background, fontSize: 16, fontWeight: '800' },
});
