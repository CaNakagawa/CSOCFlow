import { useRef, useState } from 'react'
import { useInvestigationStore } from '../../investigation/store/investigationStore'
import { DEMO_CASES, loadDemoCase } from '../../investigation/services/demoCaseService'
import { useI18n } from '../../../shared/i18n'
import './CanvasEmptyState.css'

interface CanvasEmptyStateProps {
  onImportFile: (file: File) => void
}

/**
 * What a blank canvas offers on first sight. Without it the first screen was
 * an empty grid and a score of 0, and the worked example and Import sat
 * behind an icon in the tool rail. Starting blank only hides this card; it
 * comes back whenever the canvas is empty again.
 */
export function CanvasEmptyState({ onImportFile }: CanvasEmptyStateProps) {
  const { t } = useI18n()
  const loadInvestigation = useInvestigationStore((s) => s.loadInvestigation)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dismissed, setDismissed] = useState(false)
  const [failed, setFailed] = useState(false)

  if (dismissed) return null

  async function openExample() {
    try {
      loadInvestigation(await loadDemoCase(DEMO_CASES[0]))
    } catch {
      setFailed(true)
    }
  }

  return (
    <section className="canvas-empty" aria-labelledby="canvas-empty-title">
      <h2 id="canvas-empty-title" className="canvas-empty__title">
        {t('canvas.emptyTitle')}
      </h2>
      <p className="canvas-empty__hint">{t('canvas.emptyHint')}</p>
      <div className="canvas-empty__actions">
        <button
          type="button"
          className="canvas-empty__button canvas-empty__button--primary"
          onClick={() => void openExample()}
        >
          {t('canvas.emptyExample')}
        </button>
        <button
          type="button"
          className="canvas-empty__button"
          onClick={() => fileInputRef.current?.click()}
        >
          {t('canvas.emptyImport')}
        </button>
        <button type="button" className="canvas-empty__button" onClick={() => setDismissed(true)}>
          {t('canvas.emptyBlank')}
        </button>
      </div>
      {failed && (
        <p className="canvas-empty__error" role="alert">
          {t('useCase.demoFailed')}
        </p>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) onImportFile(file)
        }}
      />
    </section>
  )
}
