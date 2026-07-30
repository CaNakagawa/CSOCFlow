import { DEFAULT_LOCALE, type Locale } from './types'
import { en, type TranslationKey } from './translations/en'
import { pt } from './translations/pt'
import { de } from './translations/de'

const DICTIONARIES: Record<Locale, Record<TranslationKey, string>> = { en, pt, de }

export function translate(locale: Locale, key: TranslationKey, params?: Record<string, string>): string {
  const template = DICTIONARIES[locale][key] ?? DICTIONARIES[DEFAULT_LOCALE][key]
  if (!params) return template
  return Object.entries(params).reduce(
    (acc, [paramKey, value]) => acc.replaceAll(`{${paramKey}}`, value),
    template,
  )
}

export type { TranslationKey }
