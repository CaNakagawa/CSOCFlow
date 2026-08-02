/** Colour scheme preference, remembered between sessions. */

export const THEMES = ['system', 'light', 'dark'] as const

export type ThemePreference = (typeof THEMES)[number]

const STORAGE_KEY = 'csocflow.theme'

function isTheme(value: string | null): value is ThemePreference {
  return value !== null && (THEMES as readonly string[]).includes(value)
}

export function getStoredTheme(): ThemePreference {
  if (typeof window === 'undefined') return 'system'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return isTheme(stored) ? stored : 'system'
}

export function storeTheme(theme: ThemePreference): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Private browsing: the choice simply does not survive the session.
  }
}

/**
 * Writes the preference onto the document.
 *
 * `system` removes the attribute so the stylesheet's own media query decides,
 * which is what keeps the app following the browser when nothing was chosen.
 */
export function applyTheme(theme: ThemePreference): void {
  if (typeof document === 'undefined') return
  if (theme === 'system') document.documentElement.removeAttribute('data-theme')
  else document.documentElement.setAttribute('data-theme', theme)
}
