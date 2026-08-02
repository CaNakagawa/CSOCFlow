import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { ViewportPortal, useReactFlow } from '@xyflow/react'
import { useInvestigationStore } from '../../investigation/store/investigationStore'
import { generateId } from '../../../shared/utils/id'
import { strokePath } from '../utils/strokePath'
import type { DrawingStroke } from '../../../shared/types/investigation'
import { useI18n } from '../../../shared/i18n'
import './DrawingLayer.css'

/** Below this many pixels apart, a point adds nothing but weight. */
const MIN_STEP = 2

/**
 * The stroke as it is being drawn, before it becomes an element of its own.
 * Painted with presentation attributes so an export keeps it.
 */
function PendingStroke({ stroke }: { stroke: DrawingStroke | null }) {
  if (!stroke) return null

  return (
    <ViewportPortal>
      <svg
        style={{ position: 'absolute', overflow: 'visible', pointerEvents: 'none', zIndex: 0 }}
        width="1"
        height="1"
      >
        <path
          d={strokePath(stroke.points)}
          fill="none"
          stroke={stroke.color}
          strokeWidth={stroke.width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </ViewportPortal>
  )
}

interface DrawingSurfaceProps {
  color: string
  width: number
}

/**
 * The transparent sheet that catches the pointer while drawing is on. It only
 * exists in drawing mode, so the canvas behaves normally the rest of the time.
 */
export function DrawingSurface({ color, width }: DrawingSurfaceProps) {
  const { t } = useI18n()
  const { screenToFlowPosition } = useReactFlow()
  const addStroke = useInvestigationStore((s) => s.addStroke)
  /*
   * The stroke being drawn lives in a ref, with the state only mirroring it for
   * rendering: pointerup has to commit the points that exist *now*, not the
   * ones from whatever render its closure happened to capture.
   */
  const pendingRef = useRef<DrawingStroke | null>(null)
  const [pending, setPending] = useState<DrawingStroke | null>(null)
  const drawing = useRef(false)

  function point(event: ReactPointerEvent<HTMLDivElement>) {
    return screenToFlowPosition({ x: event.clientX, y: event.clientY })
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    drawing.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
    pendingRef.current = { id: generateId('stroke'), points: [point(event)], color, width }
    setPending(pendingRef.current)
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const stroke = pendingRef.current
    if (!drawing.current || !stroke) return

    const next = point(event)
    const last = stroke.points[stroke.points.length - 1]
    if (Math.abs(next.x - last.x) < MIN_STEP && Math.abs(next.y - last.y) < MIN_STEP) return

    pendingRef.current = { ...stroke, points: [...stroke.points, next] }
    setPending(pendingRef.current)
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!drawing.current) return
    drawing.current = false
    event.currentTarget.releasePointerCapture(event.pointerId)
    if (pendingRef.current) addStroke(pendingRef.current)
    pendingRef.current = null
    setPending(null)
  }

  return (
    <>
      <div
        className="drawing-surface"
        role="application"
        aria-label={t('canvas.draw')}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
      <PendingStroke stroke={pending} />
    </>
  )
}
