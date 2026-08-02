import { useEffect, useRef, useState } from 'react'
import { THEMES, type ThemePreference } from '../shared/theme/theme'
import { useI18n, type TranslationKey } from '../shared/i18n'
import './ThemeSelect.css'

const LABEL_KEYS: Record<ThemePreference, TranslationKey> = {
  system: 'theme.system',
  light: 'theme.light',
  dark: 'theme.dark',
}

const GLYPHS: Record<ThemePreference, string> = {
  system: '◐',
  light: '☀',
  dark: '☾',
}

interface ThemeSelectProps {
  theme: ThemePreference
  onChange: (theme: ThemePreference) => void
}

/** Light, dark, or whatever the browser is set to — remembered for next time. */
export function ThemeSelect({ theme, onChange }: ThemeSelectProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as globalThis.Node)) setOpen(false)
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div className="theme-select" ref={rootRef}>
      <button
        type="button"
        className="theme-select__button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={t(LABEL_KEYS[theme])}
        title={t(LABEL_KEYS[theme])}
      >
        <span aria-hidden="true">{GLYPHS[theme]}</span>
      </button>

      {open && (
        <ul className="theme-select__list" role="menu">
          {THEMES.map((option) => (
            <li key={option}>
              <button
                type="button"
                role="menuitemradio"
                aria-checked={option === theme}
                onClick={() => {
                  onChange(option)
                  setOpen(false)
                }}
              >
                <span aria-hidden="true">{GLYPHS[option]}</span>
                {t(LABEL_KEYS[option])}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
