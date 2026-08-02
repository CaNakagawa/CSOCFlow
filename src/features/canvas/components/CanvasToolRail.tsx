import { useEffect, useRef, useState } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useInvestigationStore } from '../../investigation/store/investigationStore'
import { WHITEBOARD_DEFAULT_SIZE } from '../utils/canvasDefaults'
import { TOOL_ICONS } from './toolIcons'
import { ShareMenu } from './ShareMenu'
import type { KnowledgeBase } from '../../../shared/types/knowledge'
import type { ThemePreference } from '../../../shared/theme/theme'
import { useI18n, type TranslationKey } from '../../../shared/i18n'
import './CanvasToolRail.css'

const THEME_LABEL_KEYS: Record<ThemePreference, TranslationKey> = {
  system: 'theme.system',
  light: 'theme.light',
  dark: 'theme.dark',
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
        {TOOL_ICONS[icon]}
      </svg>
    </button>
  )
}

interface CanvasToolRailProps {
  knowledgeBase: KnowledgeBase | null
  drawing: boolean
  onSetDrawing: (drawing: boolean) => void
  presenting: boolean
  onTogglePresentation: () => void
  onStatus: (message: string) => void
  theme: ThemePreference
  onCycleTheme: () => void
  onImportFile: (file: File) => void
  onSaveLocally: () => void
  onLoadDemo: () => void
}

/**
 * Everything the canvas can do, folded behind one button in the corner: the
 * pointer modes, the editing tools, the file actions and sharing.
 */
export function CanvasToolRail({
  knowledgeBase,
  drawing,
  onSetDrawing,
  presenting,
  onTogglePresentation,
  onStatus,
  theme,
  onCycleTheme,
  onImportFile,
  onSaveLocally,
  onLoadDemo,
}: CanvasToolRailProps) {
  const { t, locale } = useI18n()
  const { screenToFlowPosition } = useReactFlow()
  const [open, setOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const undo = useInvestigationStore((s) => s.undo)
  const redo = useInvestigationStore((s) => s.redo)
  const canUndo = useInvestigationStore((s) => s.past.length > 0)
  const canRedo = useInvestigationStore((s) => s.future.length > 0)
  const addFreeNode = useInvestigationStore((s) => s.addFreeNode)
  const runAutoLink = useInvestigationStore((s) => s.runAutoLink)
  const organizeLikeMitre = useInvestigationStore((s) => s.organizeLikeMitre)
  const clearDrawings = useInvestigationStore((s) => s.clearDrawings)
  const hasDrawings = useInvestigationStore((s) => s.nodes.some((n) => n.type === 'drawing'))
  const duplicateNode = useInvestigationStore((s) => s.duplicateNode)
  const removeNode = useInvestigationStore((s) => s.removeNode)
  const selectedNodeIds = useInvestigationStore((s) => s.selectedNodeIds)
  const groupSelection = useInvestigationStore((s) => s.groupSelection)
  const newInvestigation = useInvestigationStore((s) => s.newInvestigation)
  const clearCanvas = useInvestigationStore((s) => s.clearCanvas)

  // The open rail covers part of the canvas, so clicking away puts it back.
  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as globalThis.Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  /** Drop new things where the analyst is looking, not at the origin. */
  function centreOfView() {
    return screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
  }

  return (
    <div className={`tool-rail${open ? ' tool-rail--open' : ''}`} ref={rootRef}>
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
          {TOOL_ICONS.tool}
        </svg>
      </button>

      {open && (
        <div className="tool-rail__tools" role="toolbar" aria-label={t('canvas.tools')}>
          {/* What the pointer does. */}
          <Tool
            icon="select"
            labelKey="canvas.select"
            active={!drawing}
            onClick={() => onSetDrawing(false)}
          />
          <Tool
            icon="draw"
            labelKey="canvas.draw"
            active={drawing}
            onClick={() => onSetDrawing(true)}
          />
          <Tool
            icon="erase"
            labelKey="canvas.clearDrawings"
            disabled={!hasDrawings}
            onClick={clearDrawings}
          />

          <div className="tool-rail__divider" aria-hidden="true" />

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
            icon="group"
            labelKey="canvas.group"
            disabled={selectedNodeIds.length < 2}
            onClick={() => groupSelection()}
          />
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

          <Tool icon="new" labelKey="topBar.newInvestigation" onClick={() => newInvestigation()} />
          <Tool icon="demo" labelKey="topBar.loadDemo" onClick={onLoadDemo} />
          <Tool icon="save" labelKey="topBar.save" onClick={onSaveLocally} />
          <Tool
            icon="import"
            labelKey="topBar.import"
            onClick={() => fileInputRef.current?.click()}
          />
          <ShareMenu onStatus={onStatus} />
          <Tool icon="erase" labelKey="topBar.clear" onClick={() => clearCanvas()} />

          <div className="tool-rail__divider" aria-hidden="true" />

          <Tool icon="theme" labelKey={THEME_LABEL_KEYS[theme]} onClick={onCycleTheme} />
          <Tool
            icon="fullscreen"
            labelKey="canvas.presentation"
            active={presenting}
            onClick={onTogglePresentation}
          />
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onImportFile(file)
          event.target.value = ''
        }}
      />
    </div>
  )
}
