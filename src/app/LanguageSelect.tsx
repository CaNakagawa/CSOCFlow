import { useEffect, useRef, useState } from 'react'
import { useI18n, LOCALES, type Locale } from '../shared/i18n'
import './LanguageSelect.css'

const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  pt: 'Português',
  de: 'Deutsch',
}

const LOCALE_CODES: Record<Locale, string> = {
  en: 'EN',
  pt: 'PT',
  de: 'DE',
}

/**
 * Inline SVG flags rather than emoji: Windows renders regional indicator pairs
 * as bare letters ("GB", "BR", "DE") instead of actual flags.
 */
function Flag({ locale }: { locale: Locale }) {
  switch (locale) {
    case 'pt':
      return (
        <svg className="flag" viewBox="0 0 20 14" aria-hidden="true">
          <rect width="20" height="14" fill="#009b3a" />
          <path d="M10 1.7 18 7l-8 5.3L2 7Z" fill="#fedf00" />
          <circle cx="10" cy="7" r="3" fill="#002776" />
        </svg>
      )
    case 'de':
      return (
        <svg className="flag" viewBox="0 0 5 3" aria-hidden="true">
          <rect width="5" height="1" fill="#000" />
          <rect width="5" height="1" y="1" fill="#dd0000" />
          <rect width="5" height="1" y="2" fill="#ffce00" />
        </svg>
      )
    default:
      return (
        <svg className="flag" viewBox="0 0 60 30" aria-hidden="true">
          <rect width="60" height="30" fill="#012169" />
          <path d="M0 0 60 30M60 0 0 30" stroke="#fff" strokeWidth="6" />
          <path d="M0 0 60 30M60 0 0 30" stroke="#c8102e" strokeWidth="3" />
          <path d="M30 0v30M0 15h60" stroke="#fff" strokeWidth="10" />
          <path d="M30 0v30M0 15h60" stroke="#c8102e" strokeWidth="6" />
        </svg>
      )
  }
}

export function LanguageSelect() {
  const { t, locale, setLocale } = useI18n()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as globalThis.Node)) setOpen(false)
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setOpen(false)
      triggerRef.current?.focus()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  function select(next: Locale) {
    setLocale(next)
    setOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <div className="language-select" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="language-select__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('topBar.language')}
        title={LOCALE_LABELS[locale]}
      >
        <Flag locale={locale} />
        <span className="language-select__code">{LOCALE_CODES[locale]}</span>
        <svg className="language-select__caret" viewBox="0 0 10 6" aria-hidden="true">
          <path d="M1 1.5 5 5l4-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      </button>

      {open && (
        <div className="language-select__menu" role="menu" aria-label={t('topBar.language')}>
          {LOCALES.map((option) => (
            <button
              key={option}
              type="button"
              role="menuitemradio"
              aria-checked={option === locale}
              className="language-select__option"
              onClick={() => select(option)}
            >
              <Flag locale={option} />
              <span className="language-select__label">{LOCALE_LABELS[option]}</span>
              <span className="language-select__check" aria-hidden="true">
                {option === locale ? '✓' : ''}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
