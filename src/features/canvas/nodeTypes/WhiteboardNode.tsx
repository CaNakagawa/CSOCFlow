import { useEffect, useRef, useState } from 'react'
import { NodeResizer, type NodeProps } from '@xyflow/react'
import { useInvestigationStore } from '../../investigation/store/investigationStore'
import { useI18n } from '../../../shared/i18n'
import './WhiteboardNode.css'

export interface WhiteboardNodeData extends Record<string, unknown> {
  label: string
  nodeId: string
  width: number
  height: number
}

const MIN_SIZE = { width: 200, height: 140 }

/**
 * A blank panel that sits behind the evidence, for grouping a stretch of the
 * investigation the way a whiteboard section would.
 */
export function WhiteboardNode({ data, selected }: NodeProps) {
  const { label, nodeId, width, height } = data as unknown as WhiteboardNodeData
  const { t } = useI18n()
  const updateNodeLabel = useInvestigationStore((s) => s.updateNodeLabel)
  const resizeNode = useInvestigationStore((s) => s.resizeNode)
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  return (
    <div
      className={`whiteboard-node${selected ? ' whiteboard-node--selected' : ''}`}
      style={{ width, height }}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={MIN_SIZE.width}
        minHeight={MIN_SIZE.height}
        onResizeEnd={(_event, params) =>
          resizeNode(nodeId, { width: params.width, height: params.height })
        }
      />

      <div className="whiteboard-node__title">
        {editing ? (
          <input
            ref={inputRef}
            className="nodrag"
            value={label}
            aria-label={t('nodeVisual.whiteboard')}
            onChange={(event) => updateNodeLabel(nodeId, event.target.value)}
            onBlur={() => setEditing(false)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === 'Escape') setEditing(false)
            }}
          />
        ) : (
          <span onDoubleClick={() => setEditing(true)} title={t('canvas.textEditHint')}>
            {label || t('nodeVisual.whiteboard')}
          </span>
        )}
      </div>
    </div>
  )
}
