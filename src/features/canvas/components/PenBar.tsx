import { NODE_PALETTE } from '../utils/nodePalette'
import { STROKE_WIDTHS, type PenSettings } from '../utils/penSettings'
import { useI18n } from '../../../shared/i18n'
import './PenBar.css'

interface PenBarProps {
  pen: PenSettings
  onChange: (pen: PenSettings) => void
}

/**
 * The pen's settings, shown only while drawing is on.
 *
 * It sits beside the tool rail rather than inside it: an analyst changing
 * thickness mid-sketch should not have to open a menu that covers the drawing.
 */
export function PenBar({ pen, onChange }: PenBarProps) {
  const { t } = useI18n()

  return (
    <div className="pen-bar" role="toolbar" aria-label={t('canvas.penSettings')}>
      <div className="pen-bar__group" role="group" aria-label={t('canvas.penWidth')}>
        {STROKE_WIDTHS.map((width) => (
          <button
            key={width}
            type="button"
            className={`pen-bar__width${pen.width === width ? ' pen-bar__width--active' : ''}`}
            aria-pressed={pen.width === width}
            aria-label={t('canvas.penWidthValue', { width: String(width) })}
            title={t('canvas.penWidthValue', { width: String(width) })}
            onClick={() => onChange({ ...pen, width })}
          >
            {/* The sample is drawn in the ink it would leave. */}
            <span style={{ height: `${width}px`, background: pen.color }} aria-hidden="true" />
          </button>
        ))}
      </div>

      <div className="pen-bar__divider" aria-hidden="true" />

      <div className="pen-bar__group" role="group" aria-label={t('canvas.penColour')}>
        {NODE_PALETTE.map((colour) => (
          <button
            key={colour.value}
            type="button"
            className={`pen-bar__colour${pen.color === colour.value ? ' pen-bar__colour--active' : ''}`}
            style={{ background: colour.value }}
            aria-pressed={pen.color === colour.value}
            aria-label={t(colour.labelKey)}
            title={t(colour.labelKey)}
            onClick={() => onChange({ ...pen, color: colour.value })}
          />
        ))}
      </div>
    </div>
  )
}
