export const LOCALES = ['en', 'pt', 'de'] as const
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'en'

/**
 * English is required; pt/de are optional and fall back to English.
 *
 * Hand-curated knowledge is fully translated, while content imported in bulk
 * from MITRE ATT&CK only carries the original English. Making the alternate
 * locales optional lets both live in the same knowledge base without shipping
 * machine-translated security guidance.
 */
export interface LocalizedText {
  en: string
  pt?: string
  de?: string
}

export interface LocalizedList {
  en: string[]
  pt?: string[]
  de?: string[]
}

export function localize(text: LocalizedText, locale: Locale): string {
  return text[locale] ?? text.en
}

export function localizeList(list: LocalizedList, locale: Locale): string[] {
  return list[locale] ?? list.en
}

const LOCALE_STORAGE_KEY = 'csocflow.locale'

function isLocale(value: string | null): value is Locale {
  return value !== null && (LOCALES as readonly string[]).includes(value)
}

export function getStoredLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE
  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY)
  return isLocale(stored) ? stored : DEFAULT_LOCALE
}
