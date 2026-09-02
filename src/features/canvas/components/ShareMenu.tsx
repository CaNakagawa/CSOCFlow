import { useEffect, useRef, useState } from 'react'
import { getNodesBounds, useReactFlow } from '@xyflow/react'
import { useInvestigationStore } from '../../investigation/store/investigationStore'
import { renderCanvasImage, toFileName, type RenderedImage } from '../export/canvasImage'
import { captureHtml, deliver, type ExportModel, type PictureFormat } from '../export/exportModels'
import { investigationToCsv } from '../export/investigationCsv'
import { toNavigatorLayer } from '../export/attackNavigatorLayer'
import {
  buildExecutiveReport,
  FULL_REPORT,
  TIMELINE_SHEET,
} from '../../report/generators/executiveReport'
import { gatherReportFacts } from '../../report/generators/reportFacts'
import type { RowLabels } from '../../report/generators/reportRows'
import { nodeCategoryKey, nodeStateKey, relationshipKey } from '../utils/nodeVisuals'
import { TOOL_ICONS } from './toolIcons'
import type { KnowledgeBase } from '../../../shared/types/knowledge'
import type { RelationshipType } from '../../../shared/types/investigation'
import { useI18n, type TranslationKey } from '../../../shared/i18n'
import '../../report/generators/executiveReport.css'
import './ShareMenu.css'

type DataFormat = 'json' | 'csv' | 'navigator'

const MODELS: { model: ExportModel | 'data'; labelKey: TranslationKey; hintKey: TranslationKey }[] =
  [
    { model: 'canvas', labelKey: 'export.modelCanvas', hintKey: 'export.modelCanvasHint' },
    { model: 'timeline', labelKey: 'export.modelTimeline', hintKey: 'export.modelTimelineHint' },
    { model: 'both', labelKey: 'export.modelBoth', hintKey: 'export.modelBothHint' },
    { model: 'report', labelKey: 'export.modelReport', hintKey: 'export.modelReportHint' },
    { model: 'data', labelKey: 'export.modelData', hintKey: 'export.modelDataHint' },
  ]

const PICTURE_FORMATS: { format: PictureFormat; labelKey: TranslationKey }[] = [
  { format: 'pdf', labelKey: 'export.pdf' },
  { format: 'pptx', labelKey: 'export.pptx' },
  { format: 'png', labelKey: 'export.png' },
  { format: 'jpg', labelKey: 'export.jpg' },
]

const DATA_FORMATS: { format: DataFormat; labelKey: TranslationKey }[] = [
  { format: 'json', labelKey: 'export.json' },
  { format: 'csv', labelKey: 'export.csv' },
  { format: 'navigator', labelKey: 'export.navigator' },
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
  /** Needed to place each technique in its tactic column, and to score. */
  knowledgeBase: KnowledgeBase | null
}

/**
 * Hands the investigation to someone else.
 *
 * Two questions, in the order they are actually asked: what should the reader
 * see — the board, the sequence, both, a written report, or the raw data — and
 * only then, in what file.
 */
export function ShareMenu({ onStatus, knowledgeBase }: ShareMenuProps) {
  const { t, locale } = useI18n()
  const { getNodes } = useReactFlow()
  const title = useInvestigationStore((s) => s.meta.title)
  const toDocument = useInvestigationStore((s) => s.toDocument)
  const nodeCount = useInvestigationStore((s) => s.nodes.length)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [model, setModel] = useState<ExportModel | 'data'>('canvas')
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

  /** The words the report and the spreadsheet print, in the analyst's language. */
  function rowLabels(): RowLabels {
    return {
      type: (type) => t(nodeCategoryKey(type as never)),
      state: (state) => t(nodeStateKey(state as never)),
      connection: (type) => t(relationshipKey(type as RelationshipType)),
    }
  }

  function reportHtml(sections: typeof FULL_REPORT): string {
    const doc = toDocument()
    return buildExecutiveReport(
      doc,
      gatherReportFacts(doc, knowledgeBase!, locale),
      {
        title: t('report.title'),
        caseLabel: t('report.case'),
        analyst: t('report.analyst'),
        date: t('report.date'),
        dateValue: new Date().toLocaleDateString(locale),
        statusLabel: t('report.status'),
        conclusionLabel: t('report.conclusion'),
        summary: t('report.summary'),
        scoreLabel: t('report.score'),
        scoreOutOf: t('report.scoreOutOf'),
        reach: t('report.score'),
        sequence: t('report.sequence'),
        elements: t('report.elements'),
        connections: t('report.connections'),
        noSequence: t('report.noSequence'),
        noConnections: t('report.noConnections'),
        columns: {
          step: t('report.col.step'),
          time: t('report.col.time'),
          type: t('report.col.type'),
          label: t('report.col.label'),
          state: t('report.col.state'),
          connections: t('report.col.connections'),
          notes: t('report.col.notes'),
          from: t('report.col.from'),
          to: t('report.col.to'),
          explanation: t('report.col.explanation'),
        },
      },
      rowLabels(),
      sections,
    )
  }

  async function canvasImage(format: PictureFormat): Promise<RenderedImage> {
    const viewport = document.querySelector<HTMLElement>('.react-flow__viewport')
    if (!viewport) throw new Error('The canvas is not on screen.')
    return renderCanvasImage({
      element: viewport,
      bounds: getNodesBounds(getNodes()),
      backgroundColor: getComputedStyle(document.body).backgroundColor,
      format: format === 'jpg' ? 'jpeg' : 'png',
    })
  }

  async function sharePicture(format: PictureFormat) {
    const canvasBackground = getComputedStyle(document.body).backgroundColor
    const images: RenderedImage[] = []

    if (model === 'canvas' || model === 'both') images.push(await canvasImage(format))
    // The sequence and the report are printed on white: they are documents,
    // not screenshots, and a dark theme has no place in a briefing pack.
    if (model === 'timeline' || model === 'both') {
      images.push(await captureHtml(reportHtml(TIMELINE_SHEET), '#ffffff'))
    }
    if (model === 'report') images.push(await captureHtml(reportHtml(FULL_REPORT), '#ffffff'))

    await deliver(images, format, title, model === 'canvas' ? canvasBackground : '#ffffff')
  }

  function shareData(format: DataFormat) {
    const doc = toDocument()
    if (format === 'json') {
      downloadText(JSON.stringify(doc, null, 2), toFileName(title, 'json'), 'application/json')
      return
    }
    if (format === 'csv') {
      downloadText(
        investigationToCsv(doc, rowLabels()),
        toFileName(title, 'csv'),
        'text/csv;charset=utf-8',
      )
      return
    }
    if (!knowledgeBase) return
    downloadText(
      JSON.stringify(toNavigatorLayer(doc, knowledgeBase), null, 2),
      toFileName(`${title} - navigator`, 'json'),
      'application/json',
    )
  }

  async function share(format: PictureFormat | DataFormat) {
    setOpen(false)
    setBusy(true)
    try {
      if (model === 'data') {
        shareData(format as DataFormat)
        onStatus(
          t('export.done', {
            format: format === 'navigator' ? 'ATT&CK Navigator' : format.toUpperCase(),
          }),
        )
      } else {
        await sharePicture(format as PictureFormat)
        onStatus(t('export.done', { format: format.toUpperCase() }))
      }
    } catch (error) {
      onStatus(t('export.failed', { reason: error instanceof Error ? error.message : '' }))
    } finally {
      setBusy(false)
    }
  }

  const formats = model === 'data' ? DATA_FORMATS : PICTURE_FORMATS
  const hint = MODELS.find((entry) => entry.model === model)!.hintKey

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
          <p className="share-menu__heading">{t('export.what')}</p>
          <div className="share-menu__models" role="group" aria-label={t('export.what')}>
            {MODELS.map((entry) => (
              <button
                key={entry.model}
                type="button"
                className={`share-menu__model${model === entry.model ? ' share-menu__model--active' : ''}`}
                aria-pressed={model === entry.model}
                onClick={() => setModel(entry.model)}
              >
                {t(entry.labelKey)}
              </button>
            ))}
          </div>

          <p className="share-menu__hint">{t(hint)}</p>

          <p className="share-menu__heading">{t('export.format')}</p>
          <div className="share-menu__formats">
            {formats.map(({ format, labelKey }) => (
              <button key={format} type="button" role="menuitem" onClick={() => void share(format)}>
                {t(labelKey)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
