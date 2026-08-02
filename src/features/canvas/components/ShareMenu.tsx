import { useEffect, useRef, useState } from 'react'
import { getNodesBounds, useReactFlow } from '@xyflow/react'
import { useInvestigationStore } from '../../investigation/store/investigationStore'
import { exportCanvas, toFileName, type ExportFormat } from '../export/canvasImage'
import { investigationToCsv } from '../export/investigationCsv'
import { TOOL_ICONS } from './toolIcons'
import { useI18n, type TranslationKey } from '../../../shared/i18n'
import './ShareMenu.css'

/** Everything the canvas can leave the app as. */
type ShareFormat = ExportFormat | 'json' | 'csv'

const FORMATS: { format: ShareFormat; labelKey: TranslationKey }[] = [
  { format: 'png', labelKey: 'export.png' },
  { format: 'jpg', labelKey: 'export.jpg' },
  { format: 'pdf', labelKey: 'export.pdf' },
  { format: 'pptx', labelKey: 'export.pptx' },
  { format: 'json', labelKey: 'export.json' },
  { format: 'csv', labelKey: 'export.csv' },
]

function downloadText(text: string, fileName: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

interface ShareMenuProps {
  onStatus: (message: string) => void
}

/**
 * Hands the investigation to someone else: as a picture, a page, a slide, or as
 * data another tool can read.
 */
export function ShareMenu({ onStatus }: ShareMenuProps) {
  const { t } = useI18n()
  const { getNodes } = useReactFlow()
  const title = useInvestigationStore((s) => s.meta.title)
  const toDocument = useInvestigationStore((s) => s.toDocument)
  const nodeCount = useInvestigationStore((s) => s.nodes.length)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
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

  async function share(format: ShareFormat) {
    setOpen(false)
    setBusy(true)
    try {
      if (format === 'json') {
        const doc = toDocument()
        downloadText(JSON.stringify(doc, null, 2), toFileName(title, 'json'), 'application/json')
      } else if (format === 'csv') {
        downloadText(investigationToCsv(toDocument()), toFileName(title, 'csv'), 'text/csv')
      } else {
        const viewport = document.querySelector<HTMLElement>('.react-flow__viewport')
        if (!viewport) return
        await exportCanvas({
          element: viewport,
          bounds: getNodesBounds(getNodes()),
          backgroundColor: getComputedStyle(document.body).backgroundColor,
          format,
          title,
        })
      }
      onStatus(t('export.done', { format: format.toUpperCase() }))
    } catch (error) {
      onStatus(t('export.failed', { reason: error instanceof Error ? error.message : '' }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="share-menu" ref={rootRef}>
      <button
        type="button"
        className="tool-rail__button"
        onClick={() => setOpen((value) => !value)}
        disabled={nodeCount === 0 || busy}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t('export.share')}
        title={busy ? t('export.working') : t('export.share')}
      >
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {TOOL_ICONS.share}
        </svg>
      </button>

      {open && (
        <div className="share-menu__list" role="menu" aria-label={t('export.share')}>
          {FORMATS.map(({ format, labelKey }) => (
            <button key={format} type="button" role="menuitem" onClick={() => void share(format)}>
              {t(labelKey)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
