import { createContext, type PropsWithChildren, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSettings } from '@/data/repository';
import { translations, type TranslationKey } from './translations';
import type { Language } from '@/domain/types';

type I18nValue = { language: Language; t: (key: TranslationKey) => string };
const I18nContext = createContext<I18nValue>({ language: 'en', t: (key) => translations.en[key] });

export function I18nProvider({ children }: PropsWithChildren) {
  const { data } = useQuery({ queryKey: ['settings'], queryFn: getSettings });
  const language = data?.language ?? 'en';
  return <I18nContext.Provider value={{ language, t: (key) => translations[language][key] }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}
