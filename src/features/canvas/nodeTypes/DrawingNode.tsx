import type { NodeProps } from '@xyflow/react'
import { strokePath } from '../utils/strokePath'

export interface DrawingNodeData extends Record<string, unknown> {
  points: { x: number; y: number }[]
  color: string
  /** Thickness of the line, not the size of the box. */
  strokeWidth: number
  boxWidth: number
  boxHeight: number
}

/**
 * One freehand stroke as a canvas element.
 *
 * The stroke is painted with presentation attributes rather than CSS: exporting
 * the canvas clones the DOM without the stylesheet once it crosses into an
 * `<svg>`, and a stroke styled by class would come out black.
 */
export function DrawingNode({ data, selected }: NodeProps) {
  const { points, color, strokeWidth, boxWidth, boxHeight } = data as unknown as DrawingNodeData

  return (
    <svg
      width={boxWidth}
      height={boxHeight}
      style={{ overflow: 'visible', display: 'block' }}
      aria-hidden="true"
    >
      {selected && (
        <rect
          x={0}
          y={0}
          width={boxWidth}
          height={boxHeight}
          fill="none"
          stroke={color}
          strokeOpacity={0.5}
          strokeDasharray="4 3"
        />
      )}
      <path
        d={strokePath(points)}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
