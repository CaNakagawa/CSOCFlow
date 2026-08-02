import { useEffect, useRef, useState } from 'react'
import { useInvestigationStore } from '../features/investigation/store/investigationStore'
import { useI18n } from '../shared/i18n'
import { LanguageSelect } from './LanguageSelect'
import './TopBar.css'

const STATUS_TIMEOUT_MS = 5000

interface TopBarProps {
  /** Result of the last file action, reported next to the title. */
  status: string | null
  onStatusCleared: () => void
}

/**
 * The header: what this investigation is called, and the two things that are
 * about the app rather than the canvas — language and help.
 *
 * Everything that acts on the canvas lives in the tool rail on the canvas
 * itself, and the side panels are opened and closed by their own arrows.
 */
export function TopBar({ status, onStatusCleared }: TopBarProps) {
  const { t } = useI18n()
  const meta = useInvestigationStore((s) => s.meta)
  const setMeta = useInvestigationStore((s) => s.setMeta)

  const [showHelp, setShowHelp] = useState(false)
  const helpRef = useRef<HTMLDivElement>(null)
  const helpButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!status) return
    const timer = window.setTimeout(onStatusCleared, STATUS_TIMEOUT_MS)
    return () => window.clearTimeout(timer)
  }, [status, onStatusCleared])

  useEffect(() => {
    if (!showHelp) return

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as globalThis.Node
      if (helpRef.current?.contains(target) || helpButtonRef.current?.contains(target)) return
      setShowHelp(false)
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setShowHelp(false)
      helpButtonRef.current?.focus()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showHelp])

  return (
    <header className="top-bar">
      <div className="top-bar__primary">
        <div className="top-bar__brand">
          <svg className="top-bar__logo" viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M8 1.4 14 4.9v6.2L8 14.6 2 11.1V4.9Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
            <circle cx="8" cy="8" r="2.2" fill="currentColor" />
          </svg>
          <span>CSOC Flow</span>
        </div>

        <input
          className="top-bar__title"
          value={meta.title}
          onChange={(e) => setMeta({ title: e.target.value })}
          aria-label={t('topBar.investigationName')}
        />

        {status && (
          <div className="top-bar__status" role="status">
            {status}
          </div>
        )}

        <div className="top-bar__primary-right">
          <LanguageSelect />
          <button
            ref={helpButtonRef}
            type="button"
            className="top-bar__icon-button"
            onClick={() => setShowHelp((v) => !v)}
            aria-expanded={showHelp}
            aria-label={t('topBar.help')}
            title={t('topBar.help')}
          >
            <svg
              className="top-bar__icon"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="8" cy="8" r="6" />
              <path d="M6.3 6.3a1.75 1.75 0 1 1 2.3 1.85c-.4.17-.6.5-.6.9v.3" />
              <path d="M8 11.7h.01" />
            </svg>
          </button>
        </div>
      </div>

      {showHelp && (
        <div ref={helpRef} className="top-bar__help" role="dialog" aria-label={t('topBar.help')}>
          <p>{t('topBar.helpText')}</p>
          <button type="button" className="top-bar__action" onClick={() => setShowHelp(false)}>
            {t('topBar.close')}
          </button>
        </div>
      )}
    </header>
  )
}
