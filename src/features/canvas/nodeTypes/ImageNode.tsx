import { NodeResizer, type NodeProps } from '@xyflow/react'
import { useInvestigationStore } from '../../investigation/store/investigationStore'
import { useI18n } from '../../../shared/i18n'
import './ImageNode.css'

export interface ImageNodeData extends Record<string, unknown> {
  src: string
  nodeId: string
  width: number
  height: number
  /** A colour picked by hand, worn as a frame. */
  color?: string
}

const MIN_SIZE = { width: 60, height: 40 }

/** A picture pasted onto the canvas: a screenshot, a chart, a log excerpt. */
export function ImageNode({ data, selected }: NodeProps) {
  const { src, nodeId, width, height, color } = data as unknown as ImageNodeData
  const { t } = useI18n()
  const resizeNode = useInvestigationStore((s) => s.resizeNode)

  return (
    <div
      className={`image-node${selected ? ' image-node--selected' : ''}`}
      style={{ width, height, borderColor: color }}
    >
      <NodeResizer
        isVisible={selected}
        keepAspectRatio
        minWidth={MIN_SIZE.width}
        minHeight={MIN_SIZE.height}
        onResizeEnd={(_event, params) =>
          resizeNode(nodeId, { width: params.width, height: params.height })
        }
      />
      <img src={src} alt={t('nodeVisual.image')} draggable={false} />
    </div>
  )
}
