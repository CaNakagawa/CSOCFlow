import { useMemo } from 'react'
import { useInvestigationStore } from '../store/investigationStore'
import { computeInvestigationScore, scoreBand } from '../scoring/investigationScore'
import type { KnowledgeBase } from '../../../shared/types/knowledge'
import { localize, useI18n } from '../../../shared/i18n'
import './ScorePanel.css'

interface ScorePanelProps {
  knowledgeBase: KnowledgeBase | null
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`
}

export function ScorePanel({ knowledgeBase }: ScorePanelProps) {
  const { t, locale } = useI18n()
  const nodes = useInvestigationStore((s) => s.nodes)

  const result = useMemo(
    () => computeInvestigationScore(nodes, knowledgeBase),
    [nodes, knowledgeBase],
  )

  if (result.totalTechniques === 0) {
    return <p className="score-panel__empty">{t('score.empty')}</p>
  }

  return (
    <div className="score-panel">
      <div className={`score-panel__headline score-panel__headline--${scoreBand(result.score)}`}>
        <span className="score-panel__value">{result.score}</span>
        <span className="score-panel__scale">/ 100</span>
      </div>

      <p className="score-panel__reach">
        {result.deepestTactic
          ? t('score.reached', { tactic: localize(result.deepestTactic.name, locale) })
          : t('score.noneConfirmed')}
      </p>

      <dl className="score-panel__metrics">
        <div>
          <dt>{t('score.depth')}</dt>
          <dd>{percent(result.depth)}</dd>
        </div>
        <div>
          <dt>{t('score.breadth')}</dt>
          <dd>{percent(result.breadth)}</dd>
        </div>
        <div>
          <dt>{t('score.activity')}</dt>
          <dd>{percent(result.activity)}</dd>
        </div>
        <div>
          <dt>{t('score.coverage')}</dt>
          <dd>{percent(result.coverage)}</dd>
        </div>
      </dl>

      <p className="score-panel__techniques">
        {t('score.techniques', {
          confirmed: String(result.confirmedTechniques),
          total: String(result.totalTechniques),
        })}
      </p>

      <h5 className="score-panel__section">{t('score.byTactic')}</h5>
      <ul className="score-panel__tactics">
        {result.tactics.map((tactic) => (
          <li key={tactic.tacticId}>
            <span className="score-panel__tactic-name">
              {tactic.tacticId} — {localize(tactic.name, locale)}
              {tactic.techniqueCount > 1 && (
                <span className="score-panel__tactic-count"> ×{tactic.techniqueCount}</span>
              )}
            </span>
            <span className="score-panel__bar" aria-hidden="true">
              <span style={{ width: percent(tactic.confirmation) }} />
            </span>
            <span className="score-panel__tactic-value">{percent(tactic.confirmation)}</span>
          </li>
        ))}
      </ul>

      <p className="score-panel__disclaimer">{t('score.disclaimer')}</p>
    </div>
  )
}
