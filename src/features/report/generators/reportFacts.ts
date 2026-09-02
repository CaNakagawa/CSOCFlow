import { computeInvestigationScore } from '../../investigation/scoring/investigationScore'
import { buildAttackTimeline } from '../../timeline/utils/attackTimeline'
import { nodeStateKey } from '../../canvas/utils/nodeVisuals'
import type { ReportFacts } from './executiveReport'
import type { Investigation } from '../../../shared/types/investigation'
import type { KnowledgeBase } from '../../../shared/types/knowledge'
import { localize, type Locale } from '../../../shared/i18n'
import { translate } from '../../../shared/i18n/translate'

/**
 * Everything the report states as fact, gathered in one place.
 *
 * The score and the sequence are read from the same code the canvas and the
 * timeline use, so a number in a report a director is holding cannot disagree
 * with the number on the analyst's screen.
 */
export function gatherReportFacts(
  doc: Investigation,
  knowledgeBase: KnowledgeBase,
  locale: Locale,
): ReportFacts {
  const score = computeInvestigationScore(doc.canvas.nodes, knowledgeBase)
  const timeline = buildAttackTimeline(doc.canvas.nodes)
  const meta = doc.investigation

  return {
    status: translate(locale, meta.status === 'open' ? 'report.statusOpen' : 'report.statusClosed'),
    conclusion: meta.conclusion
      ? translate(locale, `report.conclusion.${meta.conclusion}` as 'report.conclusion.confirmed')
      : translate(locale, 'report.noConclusion'),
    score: score.score,
    reach: score.deepestTactic
      ? translate(locale, 'score.reached', {
          tactic: localize(score.deepestTactic.name, locale),
        })
      : translate(locale, 'score.noneConfirmed'),
    steps: timeline.steps.map((column, index) => ({
      ordinal: index + 1,
      entries: column.entries.map((node) => ({
        label: node.label,
        time: node.eventAt ?? '',
        state: translate(locale, nodeStateKey(node.state)),
      })),
    })),
  }
}
