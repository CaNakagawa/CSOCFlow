import './CanvasActions.css'

interface CanvasActionsProps {
  /** Result of the last canvas-wide action. */
  feedback: string | null
}

/** What the last canvas-wide action reported, shown out of the way. */
export function CanvasActions({ feedback }: CanvasActionsProps) {
  if (!feedback) return null

  return (
    <div className="canvas-actions">
      <p className="canvas-actions__feedback" role="status">
        {feedback}
      </p>
    </div>
  )
}
