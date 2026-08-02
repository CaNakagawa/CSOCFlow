import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useInvestigationStore } from '../../investigation/store/investigationStore'
import type { AnalyticStatus, CanvasNodeType, NodeState } from '../../../shared/types/investigation'
import type { DetectionAnalytic } from '../../../shared/types/knowledge'
import { NodeAnalytics } from './NodeAnalytics'
import {
  NODE_GLYPHS,
  NODE_STATE_MARKERS,
  nodeCategoryKey,
  nodeStateKey,
} from '../utils/nodeVisuals'
import { HANDLE_IDS, type HandleId } from '../../../shared/types/handles'
import { useI18n } from '../../../shared/i18n'
import './GenericNode.css'

export interface GenericNodeData extends Record<string, unknown> {
  label: string
  nodeType: CanvasNodeType
  state: NodeState
  scaffold?: boolean
  nodeId: string
  analytics: DetectionAnalytic[]
  analyticsExpanded: boolean
  analyticStatuses: Record<string, AnalyticStatus>
  selectedAnalyticId: string | null
  /** Subtechniques of this technique that are not on the canvas yet. */
  missingSubtechniques: number
  /** Subtechniques of this technique that are on the canvas and can go back. */
  presentSubtechniques: number
  onExpandSubtechniques?: (nodeId: string) => void
  onCollapseSubtechniques?: (nodeId: string) => void
}

const HANDLE_POSITIONS: Record<HandleId, Position> = {
  top: Position.Top,
  right: Position.Right,
  bottom: Position.Bottom,
  left: Position.Left,
}

export function GenericNode({ data, selected }: NodeProps) {
  const {
    label,
    nodeType,
    state,
    scaffold,
    nodeId,
    analytics,
    analyticsExpanded,
    analyticStatuses,
    selectedAnalyticId,
    missingSubtechniques,
    presentSubtechniques,
    onExpandSubtechniques,
    onCollapseSubtechniques,
  } = data as unknown as GenericNodeData
  const { t } = useI18n()
  const linkToNearest = useInvestigationStore((s) => s.linkToNearest)
  const updateNodeLabel = useInvestigationStore((s) => s.updateNodeLabel)
  const stateLabel = t(nodeStateKey(state))
  // A node added blank from the canvas menu starts out waiting for its name.
  const [editingLabel, setEditingLabel] = useState(label.length === 0)
  const labelInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingLabel) labelInputRef.current?.focus()
  }, [editingLabel])

  // Double-clicking a connection point reaches for whatever is nearest on that
  // side, so a chain can be wired without dragging each link.
  function handleDoubleClick(event: ReactMouseEvent, id: HandleId) {
    event.stopPropagation()
    linkToNearest(nodeId, id)
  }

  return (
    <div
      className={
        `generic-node generic-node--${state}` +
        (scaffold ? ' generic-node--scaffold' : '') +
        (selected ? ' generic-node--selected' : '')
      }
    >
      {/* Both handle types on every side, so a connection can be re-anchored anywhere. */}
      {HANDLE_IDS.map((id) => (
        <Handle
          key={`target-${id}`}
          type="target"
          position={HANDLE_POSITIONS[id]}
          id={id}
          onDoubleClick={(event) => handleDoubleClick(event, id)}
        />
      ))}

      <div className="generic-node__header">
        <span className="generic-node__glyph" aria-hidden="true">
          {NODE_GLYPHS[nodeType]}
        </span>
        <span className="generic-node__category">{t(nodeCategoryKey(nodeType))}</span>
      </div>
      {editingLabel ? (
        <input
          ref={labelInputRef}
          className="generic-node__label-input nodrag"
          value={label}
          placeholder={t('canvas.labelPlaceholder')}
          aria-label={t('canvas.labelPlaceholder')}
          onChange={(event) => updateNodeLabel(nodeId, event.target.value)}
          onBlur={() => setEditingLabel(false)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === 'Escape') setEditingLabel(false)
          }}
        />
      ) : (
        <div
          className="generic-node__label"
          onDoubleClick={() => setEditingLabel(true)}
          title={t('canvas.textEditHint')}
        >
          {label || t('canvas.labelPlaceholder')}
        </div>
      )}
      <div className="generic-node__state" title={stateLabel}>
        <span aria-hidden="true">{NODE_STATE_MARKERS[state]}</span> {stateLabel}
      </div>

      {/* Bring the subtechniques in, or send back the ones that came from here. */}
      {missingSubtechniques > 0 && (
        <button
          type="button"
          className="node-analytics__toggle nodrag canvas-export-hide"
          onClick={(event) => {
            event.stopPropagation()
            onExpandSubtechniques?.(nodeId)
          }}
        >
          <span className="node-analytics__caret" aria-hidden="true">
            ⤵
          </span>
          {t('canvas.expandSubtechniques', { count: String(missingSubtechniques) })}
        </button>
      )}
      {presentSubtechniques > 0 && (
        <button
          type="button"
          className="node-analytics__toggle nodrag canvas-export-hide"
          onClick={(event) => {
            event.stopPropagation()
            onCollapseSubtechniques?.(nodeId)
          }}
        >
          <span className="node-analytics__caret" aria-hidden="true">
            ⤴
          </span>
          {t('canvas.collapseSubtechniques', { count: String(presentSubtechniques) })}
        </button>
      )}

      <NodeAnalytics
        nodeId={nodeId}
        analytics={analytics ?? []}
        expanded={analyticsExpanded ?? false}
        statuses={analyticStatuses ?? {}}
        selectedAnalyticId={selectedAnalyticId ?? null}
      />

      {HANDLE_IDS.map((id) => (
        <Handle
          key={`source-${id}`}
          type="source"
          position={HANDLE_POSITIONS[id]}
          id={id}
          onDoubleClick={(event) => handleDoubleClick(event, id)}
        />
      ))}
    </div>
  )
}
