import { useEffect, useRef, useState } from 'react'
import { NodeResizer, type NodeProps } from '@xyflow/react'
import { useInvestigationStore } from '../../investigation/store/investigationStore'
import { useI18n } from '../../../shared/i18n'
import './GroupNode.css'

export interface GroupNodeData extends Record<string, unknown> {
  label: string
  nodeId: string
  width: number
  height: number
}

const MIN_SIZE = { width: 160, height: 120 }

/**
 * A container that carries whatever sits inside it.
 *
 * Its children are ordinary elements whose position is relative to the group,
 * so dragging the group moves them all and dragging one on its own still works.
 */
export function GroupNode({ data, selected }: NodeProps) {
  const { label, nodeId, width, height } = data as unknown as GroupNodeData
  const { t } = useI18n()
  const updateNodeLabel = useInvestigationStore((s) => s.updateNodeLabel)
  const resizeNode = useInvestigationStore((s) => s.resizeNode)
  const ungroupNode = useInvestigationStore((s) => s.ungroupNode)
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  return (
    <div
      className={`group-node${selected ? ' group-node--selected' : ''}`}
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

      <div className="group-node__bar">
        {editing ? (
          <input
            ref={inputRef}
            className="nodrag"
            value={label}
            aria-label={t('nodeVisual.group')}
            onChange={(event) => updateNodeLabel(nodeId, event.target.value)}
            onBlur={() => setEditing(false)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === 'Escape') setEditing(false)
            }}
          />
        ) : (
          <span onDoubleClick={() => setEditing(true)} title={t('canvas.textEditHint')}>
            {label || t('nodeVisual.group')}
          </span>
        )}

        {selected && (
          <button
            type="button"
            className="group-node__ungroup nodrag canvas-export-hide"
            onClick={(event) => {
              event.stopPropagation()
              ungroupNode(nodeId)
            }}
          >
            {t('canvas.ungroup')}
          </button>
        )}
      </div>
    </div>
  )
}
