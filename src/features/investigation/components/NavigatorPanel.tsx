import { useMemo } from 'react'
import { useInvestigationStore } from '../store/investigationStore'
import { heatGradientCss } from '../../canvas/utils/heatScale'
import {
  DEFAULT_SCORE_VIEW,
  hasScoreRange,
  isTechniqueNode,
  listForView,
  type ScoreDirection,
  type ScoreOrder,
  type ScoreSpacing,
} from '../../canvas/utils/scoreView'
import type { KnowledgeBase } from '../../../shared/types/knowledge'
import { useI18n } from '../../../shared/i18n'
import './NavigatorPanel.css'

interface NavigatorPanelProps {
  knowledgeBase: KnowledgeBase | null
}

/** A number box that is empty for "no limit". */
function parseLimit(raw: string): number | null {
  if (raw.trim() === '') return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

/**
 * The scores an imported ATT&CK Navigator layer gave its techniques, with the
 * controls to look at them the way a report needs: a range of scores, and an
 * order, either the matrix's own or by score in either direction.
 */
export function NavigatorPanel({ knowledgeBase }: NavigatorPanelProps) {
  const { t } = useI18n()
  const nodes = useInvestigationStore((s) => s.nodes)
  const view = useInvestigationStore((s) => s.scoreView)
  const scale = useInvestigationStore((s) => s.heatScale)
  const selectedNodeId = useInvestigationStore((s) => s.selectedNodeId)
  const setScoreView = useInvestigationStore((s) => s.setScoreView)
  const selectNode = useInvestigationStore((s) => s.selectNode)
  const arrangeByScoreView = useInvestigationStore((s) => s.arrangeByScoreView)
  const scheduleArrange = useInvestigationStore((s) => s.scheduleArrange)

  const scored = useMemo(
    () => nodes.filter((n) => isTechniqueNode(n) && n.navigatorScore !== undefined),
    [nodes],
  )
  const rows = useMemo(() => listForView(nodes, view), [nodes, view])

  if (scored.length === 0) {
    return <p className="navigator-panel__empty">{t('navigator.empty')}</p>
  }

  const scores = scored.map((n) => n.navigatorScore as number)
  const lowest = Math.min(...scores)
  const highest = Math.max(...scores)
  const invalidRange = view.min !== null && view.max !== null && view.min > view.max
  const nameOf = (id: string) => knowledgeBase?.techniques.find((x) => x.id === id)?.name

  return (
    <div className="navigator-panel">
      {scale && (
        <div className="navigator-panel__legend">
          <span className="navigator-panel__legend-title">{t('navigator.legend')}</span>
          <div
            className="navigator-panel__legend-bar"
            style={{ background: heatGradientCss(scale) }}
            role="img"
            aria-label={`${t('navigator.legend')}: ${scale.min} – ${scale.max}`}
          />
          <div className="navigator-panel__legend-ends">
            <span>{scale.min}</span>
            <span>{scale.max}</span>
          </div>
        </div>
      )}

      <div className="navigator-panel__controls">
        <label className="navigator-panel__field">
          <span>{t('navigator.orderBy')}</span>
          <select
            value={view.order}
            onChange={(event) => setScoreView({ order: event.target.value as ScoreOrder })}
          >
            <option value="technique">{t('navigator.orderTechnique')}</option>
            <option value="score">{t('navigator.orderScore')}</option>
          </select>
        </label>
        <label className="navigator-panel__field">
          <span>{t('navigator.direction')}</span>
          <select
            value={view.direction}
            onChange={(event) => setScoreView({ direction: event.target.value as ScoreDirection })}
          >
            <option value="asc">{t('navigator.asc')}</option>
            <option value="desc">{t('navigator.desc')}</option>
          </select>
        </label>
      </div>

      <label className="navigator-panel__field">
        <span>{t('navigator.spacing')}</span>
        <select
          value={view.spacing}
          onChange={(event) => {
            const spacing = event.target.value as ScoreSpacing
            setScoreView({ spacing })
            if (!knowledgeBase) return
            // Spacing is about how the canvas looks, so it redraws the view by itself. A packed
            // spacing changes the size of the cards first, so wait for them to be measured again.
            if (spacing === 'normal') arrangeByScoreView(knowledgeBase)
            else scheduleArrange(knowledgeBase)
          }}
        >
          <option value="normal">{t('navigator.spacingNormal')}</option>
          <option value="compact">{t('navigator.spacingCompact')}</option>
          <option value="tight">{t('navigator.spacingTight')}</option>
        </select>
      </label>

      <fieldset className="navigator-panel__range">
        <legend>{t('navigator.range')}</legend>
        <label className="navigator-panel__field">
          <span>{t('navigator.min')}</span>
          <input
            type="number"
            inputMode="numeric"
            value={view.min ?? ''}
            placeholder={String(lowest)}
            aria-invalid={invalidRange}
            onChange={(event) => setScoreView({ min: parseLimit(event.target.value) })}
          />
        </label>
        <label className="navigator-panel__field">
          <span>{t('navigator.max')}</span>
          <input
            type="number"
            inputMode="numeric"
            value={view.max ?? ''}
            placeholder={String(highest)}
            aria-invalid={invalidRange}
            onChange={(event) => setScoreView({ max: parseLimit(event.target.value) })}
          />
        </label>
      </fieldset>
      {invalidRange && (
        <p className="navigator-panel__warning" role="alert">
          {t('navigator.rangeInvalid')}
        </p>
      )}

      <label className="navigator-panel__check">
        <input
          type="checkbox"
          checked={view.hideOutside}
          onChange={(event) => setScoreView({ hideOutside: event.target.checked })}
        />
        <span>{t('navigator.hideOutside')}</span>
      </label>

      <div className="navigator-panel__actions">
        <button
          type="button"
          className="navigator-panel__button"
          disabled={!knowledgeBase}
          onClick={() => knowledgeBase && arrangeByScoreView(knowledgeBase)}
        >
          {t('navigator.arrange')}
        </button>
        <button
          type="button"
          className="navigator-panel__button navigator-panel__button--quiet"
          disabled={
            !hasScoreRange(view) &&
            view.order === DEFAULT_SCORE_VIEW.order &&
            view.direction === DEFAULT_SCORE_VIEW.direction &&
            view.spacing === DEFAULT_SCORE_VIEW.spacing
          }
          onClick={() => setScoreView({ ...DEFAULT_SCORE_VIEW })}
        >
          {t('navigator.clear')}
        </button>
      </div>

      <p className="navigator-panel__summary" role="status">
        {t('navigator.summary', { shown: String(rows.length), total: String(scored.length) })}
      </p>

      {rows.length === 0 ? (
        <p className="navigator-panel__empty">{t('navigator.noMatch')}</p>
      ) : (
        <table className="navigator-panel__table" aria-label={t('navigator.listLabel')}>
          <thead>
            <tr>
              <th scope="col">{t('navigator.colTechnique')}</th>
              <th scope="col">{t('navigator.colName')}</th>
              <th scope="col" className="navigator-panel__num">
                {t('navigator.colScore')}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((node) => (
              <tr
                key={node.id}
                className={node.id === selectedNodeId ? 'is-selected' : undefined}
                onClick={() => selectNode(node.id)}
              >
                <td>
                  <button
                    type="button"
                    className="navigator-panel__row-button"
                    onClick={(event) => {
                      event.stopPropagation()
                      selectNode(node.id)
                    }}
                  >
                    {node.definitionId}
                  </button>
                </td>
                <td>{nameOf(node.definitionId) ?? node.label}</td>
                <td className="navigator-panel__num">
                  <span
                    className="navigator-panel__chip"
                    style={node.color ? { background: node.color } : undefined}
                  >
                    {node.navigatorScore}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="navigator-panel__hint">{t('navigator.hint')}</p>
    </div>
  )
}
