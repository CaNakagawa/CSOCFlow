import { useInvestigationStore } from '../../investigation/store/investigationStore'
import type { AnalyticStatus } from '../../../shared/types/investigation'
import type { DetectionAnalytic } from '../../../shared/types/knowledge'
import { useI18n } from '../../../shared/i18n'

interface NodeAnalyticsProps {
  nodeId: string
  analytics: DetectionAnalytic[]
  expanded: boolean
  statuses: Record<string, AnalyticStatus>
  selectedAnalyticId: string | null
}

/**
 * The detection analytics of a technique, rendered inside its own canvas node.
 *
 * Collapsed it is a single counter row; expanded it shows every analytic at
 * once. Clicking an analytic selects it so the details panel can offer hunting
 * queries for it.
 */
export function NodeAnalytics({
  nodeId,
  analytics,
  expanded,
  statuses,
  selectedAnalyticId,
}: NodeAnalyticsProps) {
  const { t } = useI18n()
  const toggleAnalyticsExpanded = useInvestigationStore((s) => s.toggleAnalyticsExpanded)
  const setAnalyticStatus = useInvestigationStore((s) => s.setAnalyticStatus)
  const selectAnalytic = useInvestigationStore((s) => s.selectAnalytic)

  if (analytics.length === 0) return null

  const confirmed = analytics.filter((a) => statuses[a.id] === 'confirmed').length

  return (
    <div className="node-analytics">
      <button
        type="button"
        className="node-analytics__toggle nodrag"
        aria-expanded={expanded}
        onClick={(event) => {
          event.stopPropagation()
          toggleAnalyticsExpanded(nodeId)
        }}
      >
        <span className="node-analytics__caret" aria-hidden="true">
          {expanded ? '▾' : '▸'}
        </span>
        {t('canvas.analyticsCount', {
          count: String(analytics.length),
          confirmed: String(confirmed),
        })}
      </button>

      {expanded && (
        <ul className="node-analytics__list">
          {analytics.map((analytic) => {
            const status = statuses[analytic.id] ?? 'pending'
            const isSelected = selectedAnalyticId === analytic.id
            return (
              <li
                key={analytic.id}
                className={
                  `node-analytics__item node-analytics__item--${status}` +
                  (isSelected ? ' node-analytics__item--selected' : '')
                }
              >
                <button
                  type="button"
                  className="node-analytics__body nodrag"
                  aria-pressed={isSelected}
                  title={analytic.description.en}
                  onClick={(event) => {
                    event.stopPropagation()
                    selectAnalytic(nodeId, analytic.id)
                  }}
                >
                  {analytic.id}
                </button>

                <span className="node-analytics__actions">
                  <button
                    type="button"
                    className={`nodrag${status === 'confirmed' ? ' is-active' : ''}`}
                    title={t('details.analyticConfirm')}
                    aria-label={`${t('details.analyticConfirm')} ${analytic.id}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      setAnalyticStatus(nodeId, analytic.id, 'confirmed')
                    }}
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    className={`nodrag${status === 'not_confirmed' ? ' is-active' : ''}`}
                    title={t('details.analyticRuleOut')}
                    aria-label={`${t('details.analyticRuleOut')} ${analytic.id}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      setAnalyticStatus(nodeId, analytic.id, 'not_confirmed')
                    }}
                  >
                    ✕
                  </button>
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
