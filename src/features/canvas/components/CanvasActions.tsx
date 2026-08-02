import { ExportMenu } from './ExportMenu'
import './CanvasActions.css'

interface CanvasActionsProps {
  /** Result of the last canvas-wide action, shown under the buttons. */
  feedback: string | null
  onStatus: (message: string) => void
}

/** Canvas-wide actions that are not editing tools: exporting, and what it said. */
export function CanvasActions({ feedback, onStatus }: CanvasActionsProps) {
  return (
    <div className="canvas-actions">
      <div className="canvas-actions__row">
        <ExportMenu onStatus={onStatus} />
      </div>

      {feedback && (
        <p className="canvas-actions__feedback" role="status">
          {feedback}
        </p>
      )}
    </div>
  )
}
