import { useEffect, useRef, useState } from 'react'
import { getNodesBounds, useReactFlow } from '@xyflow/react'
import { useInvestigationStore } from '../../investigation/store/investigationStore'
import { exportCanvas, type ExportFormat } from '../export/canvasImage'
import { useI18n, type TranslationKey } from '../../../shared/i18n'
import './ExportMenu.css'

const FORMATS: { format: ExportFormat; labelKey: TranslationKey }[] = [
  { format: 'png', labelKey: 'export.png' },
  { format: 'jpg', labelKey: 'export.jpg' },
  { format: 'pdf', labelKey: 'export.pdf' },
  { format: 'pptx', labelKey: 'export.pptx' },
]

interface ExportMenuProps {
  onStatus: (message: string) => void
}

/** Saves the drawing as a picture: a report page, a slide, or a plain image. */
export function ExportMenu({ onStatus }: ExportMenuProps) {
  const { t } = useI18n()
  const { getNodes } = useReactFlow()
  const title = useInvestigationStore((s) => s.meta.title)
  const nodeCount = useInvestigationStore((s) => s.nodes.length)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<ExportFormat | null>(null)
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

  async function handleExport(format: ExportFormat) {
    const viewport = document.querySelector<HTMLElement>('.react-flow__viewport')
    if (!viewport) return

    setOpen(false)
    setBusy(format)
    try {
      await exportCanvas({
        element: viewport,
        bounds: getNodesBounds(getNodes()),
        // The page background, so the picture reads like the canvas does.
        backgroundColor: getComputedStyle(document.body).backgroundColor,
        format,
        title,
      })
      onStatus(t('export.done', { format: format.toUpperCase() }))
    } catch (error) {
      onStatus(t('export.failed', { reason: error instanceof Error ? error.message : '' }))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="export-menu" ref={rootRef}>
      <button
        type="button"
        className="canvas-actions__button nopan"
        onClick={() => setOpen((value) => !value)}
        disabled={nodeCount === 0 || busy !== null}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t('export.image')}
        title={t('export.imageHint')}
      >
        <svg className="canvas-actions__icon" viewBox="0 0 16 16" aria-hidden="true">
          <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
            <rect x="2.2" y="3" width="11.6" height="10" rx="1.3" />
            <path d="M2.2 10.4 5.6 7.6l2.6 2.2 2.4-2 3.2 2.6" />
            <circle cx="6" cy="5.9" r="1" />
          </g>
        </svg>
        {busy ? t('export.working') : t('export.image')}
      </button>

      {open && (
        <div className="export-menu__list nopan" role="menu" aria-label={t('export.image')}>
          {FORMATS.map(({ format, labelKey }) => (
            <button
              key={format}
              type="button"
              role="menuitem"
              onClick={() => void handleExport(format)}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
