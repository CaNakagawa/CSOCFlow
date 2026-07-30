import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { CanvasNodeType, NodeState } from '../../../shared/types/investigation'
import {
  NODE_GLYPHS,
  NODE_STATE_MARKERS,
  nodeCategoryKey,
  nodeStateKey,
} from '../utils/nodeVisuals'
import { SOURCE_HANDLE_IDS, TARGET_HANDLE_IDS } from '../../../shared/types/handles'
import { useI18n } from '../../../shared/i18n'
import './GenericNode.css'

export interface GenericNodeData extends Record<string, unknown> {
  label: string
  nodeType: CanvasNodeType
  state: NodeState
}

export function GenericNode({ data, selected }: NodeProps) {
  const { label, nodeType, state } = data as unknown as GenericNodeData
  const { t } = useI18n()
  const stateLabel = t(nodeStateKey(state))

  return (
    <div
      className={`generic-node generic-node--${state}${selected ? ' generic-node--selected' : ''}`}
    >
      <Handle type="target" position={Position.Top} id={TARGET_HANDLE_IDS[0]} />
      <Handle type="target" position={Position.Left} id={TARGET_HANDLE_IDS[1]} />
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
      <Handle type="source" position={Position.Bottom} id={SOURCE_HANDLE_IDS[0]} />
      <Handle type="source" position={Position.Right} id={SOURCE_HANDLE_IDS[1]} />
    </div>
  )
}
