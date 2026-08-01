import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import './PanelResizer.css'

/** How much an arrow key moves the edge. */
const KEYBOARD_STEP = 16

interface PanelResizerProps {
  /** Which side of the canvas the panel being resized sits on. */
  side: 'left' | 'right'
  width: number
  min: number
  max: number
  label: string
  onResize: (width: number) => void
}

/**
 * The draggable edge between a side panel and the canvas.
 *
 * Exposed as a separator so it can also be moved with the arrow keys — dragging
 * a 6px strip is not the only way anyone works.
 */
export function PanelResizer({ side, width, min, max, label, onResize }: PanelResizerProps) {
  const drag = useRef<{ startX: number; startWidth: number } | null>(null)
  const [dragging, setDragging] = useState(false)

  const clamp = useCallback((value: number) => Math.min(max, Math.max(min, value)), [min, max])

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    // Only the primary button drags; a right-click here should do nothing.
    if (event.button !== 0) return
    drag.current = { startX: event.clientX, startWidth: width }
    setDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current) return
    const delta = event.clientX - drag.current.startX
    // Dragging right widens a left panel and narrows a right one.
    onResize(clamp(drag.current.startWidth + (side === 'left' ? delta : -delta)))
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    drag.current = null
    setDragging(false)
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const direction = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0
    if (direction === 0) return
    event.preventDefault()
    onResize(clamp(width + direction * KEYBOARD_STEP * (side === 'left' ? 1 : -1)))
  }

  return (
    <div
      className={`panel-resizer panel-resizer--${side}${dragging ? ' panel-resizer--active' : ''}`}
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={Math.round(width)}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
    >
      <span className="panel-resizer__grip" aria-hidden="true" />
    </div>
  )
}
