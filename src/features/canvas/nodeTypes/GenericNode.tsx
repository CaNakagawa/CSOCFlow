import type { MouseEvent as ReactMouseEvent } from 'react'
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
  } = data as unknown as GenericNodeData
  const { t } = useI18n()
  const linkToNearest = useInvestigationStore((s) => s.linkToNearest)
  const stateLabel = t(nodeStateKey(state))

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
      <div className="generic-node__label">{label}</div>
      <div className="generic-node__state" title={stateLabel}>
        <span aria-hidden="true">{NODE_STATE_MARKERS[state]}</span> {stateLabel}
      </div>

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
