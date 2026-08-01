import type { ReactNode } from 'react'
import { useInvestigationStore } from '../../investigation/store/investigationStore'
import { useI18n, type TranslationKey } from '../../../shared/i18n'
import './CanvasEditToolbar.css'

const ICONS: Record<string, ReactNode> = {
  undo: <path d="M3.4 7.6h6.2a3.4 3.4 0 1 1 0 6.8H6.4M3.4 7.6 6.6 4.4M3.4 7.6l3.2 3.2" />,
  redo: <path d="M12.6 7.6H6.4a3.4 3.4 0 1 0 0 6.8h3.2M12.6 7.6 9.4 4.4M12.6 7.6l-3.2 3.2" />,
  duplicate: (
    <>
      <rect x="5.6" y="5.6" width="8" height="8" rx="1.2" />
      <path d="M10.4 5.6V3.6a1.2 1.2 0 0 0-1.2-1.2H3.6a1.2 1.2 0 0 0-1.2 1.2v5.6a1.2 1.2 0 0 0 1.2 1.2h2" />
    </>
  ),
  delete: (
    <path d="M2.8 4.4h10.4M6.4 4.4V2.9h3.2v1.5M4.2 4.4l.55 8.15a1.1 1.1 0 0 0 1.1 1.05h4.3a1.1 1.1 0 0 0 1.1-1.05L11.8 4.4" />
  ),
}

interface ToolProps {
  icon: string
  labelKey: TranslationKey
  hintKey: TranslationKey
  disabled: boolean
  danger?: boolean
  onClick: () => void
}

function Tool({ icon, labelKey, hintKey, disabled, danger, onClick }: ToolProps) {
  const { t } = useI18n()
  return (
    <button
      type="button"
      className={`canvas-edit__button nopan${danger ? ' canvas-edit__button--danger' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={t(labelKey)}
      title={t(hintKey)}
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

/** Editing tools kept on the canvas itself, where the editing happens. */
export function CanvasEditToolbar() {
  const undo = useInvestigationStore((s) => s.undo)
  const redo = useInvestigationStore((s) => s.redo)
  const canUndo = useInvestigationStore((s) => s.past.length > 0)
  const canRedo = useInvestigationStore((s) => s.future.length > 0)
  const selectedNodeId = useInvestigationStore((s) => s.selectedNodeId)
  const duplicateNode = useInvestigationStore((s) => s.duplicateNode)
  const removeNode = useInvestigationStore((s) => s.removeNode)

  return (
    <div className="canvas-edit">
      <Tool
        icon="undo"
        labelKey="topBar.undo"
        hintKey="topBar.undoHint"
        disabled={!canUndo}
        onClick={undo}
      />
      <Tool
        icon="redo"
        labelKey="topBar.redo"
        hintKey="topBar.redoHint"
        disabled={!canRedo}
        onClick={redo}
      />
      <div className="canvas-edit__divider" aria-hidden="true" />
      <Tool
        icon="duplicate"
        labelKey="details.duplicate"
        hintKey="topBar.duplicateHint"
        disabled={!selectedNodeId}
        onClick={() => selectedNodeId && duplicateNode(selectedNodeId)}
      />
      <Tool
        icon="delete"
        labelKey="details.delete"
        hintKey="canvas.deleteHint"
        disabled={!selectedNodeId}
        danger
        onClick={() => selectedNodeId && removeNode(selectedNodeId)}
      />
    </div>
  )
}
