import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { CanvasNodeType, NodeState } from '../../../shared/types/investigation'
import { NODE_VISUALS, NODE_STATE_LABELS, NODE_STATE_MARKERS } from '../utils/nodeVisuals'
import './GenericNode.css'

export interface GenericNodeData extends Record<string, unknown> {
  label: string
  nodeType: CanvasNodeType
  state: NodeState
}

export function GenericNode({ data, selected }: NodeProps) {
  const { label, nodeType, state } = data as unknown as GenericNodeData
  const visual = NODE_VISUALS[nodeType]

  return (
    <div
      className={`generic-node generic-node--${state}${selected ? ' generic-node--selected' : ''}`}
    >
      <Handle type="target" position={Position.Top} />
      <div className="generic-node__header">
        <span className="generic-node__glyph" aria-hidden="true">
          {visual.glyph}
        </span>
        <span className="generic-node__category">{visual.categoryLabel}</span>
      </div>
      <div className="generic-node__label">{label}</div>
      <div className="generic-node__state" title={`Estado: ${NODE_STATE_LABELS[state]}`}>
        <span aria-hidden="true">{NODE_STATE_MARKERS[state]}</span> {NODE_STATE_LABELS[state]}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}
