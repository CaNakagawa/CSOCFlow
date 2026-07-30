export const LOCALES = ['en', 'pt', 'de'] as const
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'en'

export type LocalizedText = Record<Locale, string>
export type LocalizedList = Record<Locale, string[]>

export function localize(text: LocalizedText, locale: Locale): string {
  return text[locale] ?? text[DEFAULT_LOCALE]
}

export function localizeList(list: LocalizedList, locale: Locale): string[] {
  return list[locale] ?? list[DEFAULT_LOCALE]
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
