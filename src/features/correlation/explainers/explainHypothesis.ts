import type { ExplanationTemplates } from '../../../shared/types/knowledge'
import type { ConditionResult } from '../../../shared/types/correlation'

function joinDescriptions(results: ConditionResult[]): string {
  return results.map((r) => r.condition.description).join('; ')
}

function fillTemplate(template: string, tokens: Record<string, string>): string {
  return template.replace(/{{\s*(\w+)\s*}}/g, (_match, key: string) => tokens[key] ?? '')
}

export function explainHypothesis(
  templates: ExplanationTemplates,
  matched: ConditionResult[],
  missing: ConditionResult[],
  contradicted: ConditionResult[],
): string {
  const parts: string[] = []

  if (matched.length > 0) {
    parts.push(fillTemplate(templates.summary, { matched_summary: joinDescriptions(matched) }))
  }
  if (missing.length > 0) {
    parts.push(fillTemplate(templates.missing, { missing_summary: joinDescriptions(missing) }))
  }
  if (contradicted.length > 0) {
    parts.push(
      fillTemplate(templates.counterpoints, {
        counterpoint_summary: joinDescriptions(contradicted),
      }),
    )
  }

  return parts.join(' ')
}
