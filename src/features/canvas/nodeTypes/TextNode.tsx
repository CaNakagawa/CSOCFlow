import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Handle, NodeResizer, Position, type NodeProps } from '@xyflow/react'
import { useInvestigationStore } from '../../investigation/store/investigationStore'
import { HANDLE_IDS, type HandleId } from '../../../shared/types/handles'
import { useI18n } from '../../../shared/i18n'
import './TextNode.css'

export interface TextNodeData extends Record<string, unknown> {
  label: string
  nodeId: string
  /** Set once the analyst has resized it; zero means fit the text. */
  width: number
  height: number
}

const MIN_SIZE = { width: 90, height: 40 }

const HANDLE_POSITIONS: Record<HandleId, Position> = {
  top: Position.Top,
  right: Position.Right,
  bottom: Position.Bottom,
  left: Position.Left,
}

/** Free text on the canvas: a caption, a question, a working note. */
export function TextNode({ data, selected }: NodeProps) {
  const { label, nodeId, width, height } = data as unknown as TextNodeData
  const { t } = useI18n()
  const updateNodeLabel = useInvestigationStore((s) => s.updateNodeLabel)
  const resizeNode = useInvestigationStore((s) => s.resizeNode)
  const sized = width > 0 && height > 0
  // A text node with nothing in it yet opens straight into editing.
  const [editing, setEditing] = useState(label.length === 0)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  function handleKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Escape' || (event.key === 'Enter' && (event.ctrlKey || event.metaKey))) {
      event.preventDefault()
      setEditing(false)
    }
  }

  return (
    <div
      className={`text-node${selected ? ' text-node--selected' : ''}${sized ? ' text-node--sized' : ''}`}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={MIN_SIZE.width}
        minHeight={MIN_SIZE.height}
        onResizeEnd={(_event, params) =>
          resizeNode(nodeId, { width: params.width, height: params.height })
        }
      />

      {HANDLE_IDS.map((id) => (
        <Handle key={`t-${id}`} type="target" position={HANDLE_POSITIONS[id]} id={id} />
      ))}

      {editing ? (
        <textarea
          ref={inputRef}
          className="text-node__input nodrag"
          value={label}
          placeholder={t('canvas.textPlaceholder')}
          aria-label={t('nodeVisual.text')}
          onChange={(event) => updateNodeLabel(nodeId, event.target.value)}
          onBlur={() => setEditing(false)}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <div
          className="text-node__body"
          onDoubleClick={() => setEditing(true)}
          title={t('canvas.textEditHint')}
        >
          {label || t('canvas.textPlaceholder')}
        </div>
      )}

      {HANDLE_IDS.map((id) => (
        <Handle key={`s-${id}`} type="source" position={HANDLE_POSITIONS[id]} id={id} />
      ))}
    </div>
  )
}
