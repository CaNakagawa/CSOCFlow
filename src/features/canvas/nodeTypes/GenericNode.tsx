import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { CanvasNodeType, NodeState } from '../../../shared/types/investigation'
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
}

const HANDLE_POSITIONS: Record<HandleId, Position> = {
  top: Position.Top,
  right: Position.Right,
  bottom: Position.Bottom,
  left: Position.Left,
}

export function GenericNode({ data, selected }: NodeProps) {
  const { label, nodeType, state, scaffold } = data as unknown as GenericNodeData
  const { t } = useI18n()
  const stateLabel = t(nodeStateKey(state))

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
        <Handle key={`target-${id}`} type="target" position={HANDLE_POSITIONS[id]} id={id} />
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

      {HANDLE_IDS.map((id) => (
        <Handle key={`source-${id}`} type="source" position={HANDLE_POSITIONS[id]} id={id} />
      ))}
    </div>
  )
}
