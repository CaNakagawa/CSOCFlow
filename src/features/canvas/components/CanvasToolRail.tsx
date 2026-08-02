import { useState, type ReactNode } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useInvestigationStore } from '../../investigation/store/investigationStore'
import { WHITEBOARD_DEFAULT_SIZE } from '../utils/canvasDefaults'
import type { KnowledgeBase } from '../../../shared/types/knowledge'
import { useI18n, type TranslationKey } from '../../../shared/i18n'
import './CanvasToolRail.css'

const ICONS: Record<string, ReactNode> = {
  tool: (
    <path d="M10.6 2.6a3.4 3.4 0 0 0-4.4 4.2L2.6 10.4a1.4 1.4 0 0 0 2 2l3.6-3.6a3.4 3.4 0 0 0 4.2-4.4l-2 2-1.8-1.8Z" />
  ),
  add: <path d="M8 3.4v9.2M3.4 8h9.2" />,
  undo: <path d="M3.4 7.6h6.2a3.4 3.4 0 1 1 0 6.8H6.4M3.4 7.6 6.6 4.4M3.4 7.6l3.2 3.2" />,
  redo: <path d="M12.6 7.6H6.4a3.4 3.4 0 1 0 0 6.8h3.2M12.6 7.6 9.4 4.4M12.6 7.6l-3.2 3.2" />,
  link: (
    <>
      <path d="M6.6 9.4a2.6 2.6 0 0 0 3.9.3l2-2a2.6 2.6 0 0 0-3.7-3.7l-1.1 1.1" />
      <path d="M9.4 6.6a2.6 2.6 0 0 0-3.9-.3l-2 2a2.6 2.6 0 0 0 3.7 3.7l1.1-1.1" />
    </>
  ),
  matrix: (
    <>
      <rect x="1.8" y="2.6" width="3.4" height="3" rx="0.6" />
      <rect x="6.3" y="2.6" width="3.4" height="3" rx="0.6" />
      <rect x="10.8" y="2.6" width="3.4" height="3" rx="0.6" />
      <rect x="1.8" y="7.2" width="3.4" height="3" rx="0.6" />
      <rect x="6.3" y="7.2" width="3.4" height="3" rx="0.6" />
    </>
  ),
  text: <path d="M3.4 3.6h9.2M8 3.6v8.8M6.2 12.4h3.6" />,
  whiteboard: (
    <>
      <rect x="2" y="3.2" width="12" height="8.4" rx="1.2" />
      <path d="M4.6 13.4 8 11.6l3.4 1.8" />
    </>
  ),
  draw: <path d="M3 13h2.2l6.4-6.4a1.55 1.55 0 0 0-2.2-2.2L3 10.8V13Z" />,
  duplicate: (
    <>
      <rect x="5.6" y="5.6" width="8" height="8" rx="1.2" />
      <path d="M10.4 5.6V3.6a1.2 1.2 0 0 0-1.2-1.2H3.6a1.2 1.2 0 0 0-1.2 1.2v5.6a1.2 1.2 0 0 0 1.2 1.2h2" />
    </>
  ),
  delete: (
    <path d="M2.8 4.4h10.4M6.4 4.4V2.9h3.2v1.5M4.2 4.4l.55 8.15a1.1 1.1 0 0 0 1.1 1.05h4.3a1.1 1.1 0 0 0 1.1-1.05L11.8 4.4" />
  ),
  erase: <path d="M3.2 12.8h9.6M4.6 10.6l5-5 2.8 2.8-5 5H4.6v-2.8Z" />,
  present: (
    <path d="M2.6 5.6V3.2a.6.6 0 0 1 .6-.6h2.4M13.4 5.6V3.2a.6.6 0 0 0-.6-.6h-2.4M2.6 10.4v2.4a.6.6 0 0 0 .6.6h2.4M13.4 10.4v2.4a.6.6 0 0 1-.6.6h-2.4" />
  ),
}

interface ToolProps {
  icon: string
  labelKey: TranslationKey
  disabled?: boolean
  active?: boolean
  onClick: () => void
}

function Tool({ icon, labelKey, disabled, active, onClick }: ToolProps) {
  const { t } = useI18n()
  return (
    <button
      type="button"
      className={`tool-rail__button${active ? ' tool-rail__button--active' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={t(labelKey)}
      title={t(labelKey)}
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
        {ICONS[icon]}
      </svg>
    </button>
  )
}

interface CanvasToolRailProps {
  knowledgeBase: KnowledgeBase | null
  drawing: boolean
  onToggleDrawing: () => void
  presenting: boolean
  onTogglePresentation: () => void
  onStatus: (message: string) => void
}

/**
 * The canvas tools, folded behind a single button in the corner so the drawing
 * keeps the space.
 */
export function CanvasToolRail({
  knowledgeBase,
  drawing,
  onToggleDrawing,
  presenting,
  onTogglePresentation,
  onStatus,
}: CanvasToolRailProps) {
  const { t, locale } = useI18n()
  const { screenToFlowPosition } = useReactFlow()
  const [open, setOpen] = useState(false)

  const undo = useInvestigationStore((s) => s.undo)
  const redo = useInvestigationStore((s) => s.redo)
  const canUndo = useInvestigationStore((s) => s.past.length > 0)
  const canRedo = useInvestigationStore((s) => s.future.length > 0)
  const addFreeNode = useInvestigationStore((s) => s.addFreeNode)
  const runAutoLink = useInvestigationStore((s) => s.runAutoLink)
  const organizeLikeMitre = useInvestigationStore((s) => s.organizeLikeMitre)
  const clearDrawings = useInvestigationStore((s) => s.clearDrawings)
  const hasDrawings = useInvestigationStore((s) => s.drawings.length > 0)
  const duplicateNode = useInvestigationStore((s) => s.duplicateNode)
  const removeNode = useInvestigationStore((s) => s.removeNode)
  const selectedNodeIds = useInvestigationStore((s) => s.selectedNodeIds)

  /** Drop new things where the analyst is looking, not at the origin. */
  function centreOfView() {
    return screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
  }

  return (
    <div className={`tool-rail${open ? ' tool-rail--open' : ''}`}>
      <button
        type="button"
        className="tool-rail__handle"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={t('canvas.tools')}
        title={t('canvas.tools')}
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
          {ICONS.tool}
        </svg>
      </button>

      {open && (
        <div className="tool-rail__tools" role="toolbar" aria-label={t('canvas.tools')}>
          <Tool
            icon="add"
            labelKey="canvas.add"
            onClick={() =>
              addFreeNode({ nodeType: 'evidence', label: '', position: centreOfView() })
            }
          />
          <Tool
            icon="text"
            labelKey="canvas.addText"
            onClick={() => addFreeNode({ nodeType: 'text', label: '', position: centreOfView() })}
          />
          <Tool
            icon="whiteboard"
            labelKey="canvas.addWhiteboard"
            onClick={() =>
              addFreeNode({
                nodeType: 'whiteboard',
                label: '',
                position: centreOfView(),
                size: WHITEBOARD_DEFAULT_SIZE,
              })
            }
          />

          <div className="tool-rail__divider" aria-hidden="true" />

          <Tool icon="undo" labelKey="topBar.undo" disabled={!canUndo} onClick={undo} />
          <Tool icon="redo" labelKey="topBar.redo" disabled={!canRedo} onClick={redo} />
          <Tool
            icon="duplicate"
            labelKey="details.duplicate"
            disabled={selectedNodeIds.length === 0}
            onClick={() => selectedNodeIds.forEach((id) => duplicateNode(id))}
          />
          <Tool
            icon="delete"
            labelKey="details.delete"
            disabled={selectedNodeIds.length === 0}
            onClick={() => selectedNodeIds.forEach((id) => removeNode(id))}
          />

          <div className="tool-rail__divider" aria-hidden="true" />

          <Tool
            icon="link"
            labelKey="canvas.autoLink"
            disabled={!knowledgeBase}
            onClick={() => {
              if (!knowledgeBase) return
              const created = runAutoLink(knowledgeBase, locale)
              onStatus(
                created > 0
                  ? t('canvas.autoLinkCreated', { count: String(created) })
                  : t('canvas.autoLinkNothing'),
              )
            }}
          />
          <Tool
            icon="matrix"
            labelKey="canvas.organize"
            disabled={!knowledgeBase}
            onClick={() => {
              if (!knowledgeBase) return
              const added = organizeLikeMitre(knowledgeBase, locale)
              onStatus(t('canvas.organizeDone', { count: String(added) }))
            }}
          />

          <div className="tool-rail__divider" aria-hidden="true" />

          <Tool icon="draw" labelKey="canvas.draw" active={drawing} onClick={onToggleDrawing} />
          <Tool
            icon="erase"
            labelKey="canvas.clearDrawings"
            disabled={!hasDrawings}
            onClick={clearDrawings}
          />
          <Tool
            icon="present"
            labelKey="canvas.presentation"
            active={presenting}
            onClick={onTogglePresentation}
          />
        </div>
      )}
    </div>
  )
}
