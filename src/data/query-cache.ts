import type { QueryClient } from '@tanstack/react-query';

export function refreshQueries(queryClient: QueryClient, keys: readonly string[]): void {
  void Promise.all(keys.map((key) => queryClient.invalidateQueries({ queryKey: [key] })));
}
