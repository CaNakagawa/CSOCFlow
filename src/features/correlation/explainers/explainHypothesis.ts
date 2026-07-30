import type { ExplanationTemplates } from '../../../shared/types/knowledge'
import type { ConditionResult } from '../../../shared/types/correlation'
import { localize, type Locale } from '../../../shared/i18n/types'

function joinDescriptions(results: ConditionResult[], locale: Locale): string {
  return results.map((r) => localize(r.condition.description, locale)).join('; ')
}

function fillTemplate(template: string, tokens: Record<string, string>): string {
  return template.replace(/{{\s*(\w+)\s*}}/g, (_match, key: string) => tokens[key] ?? '')
}

export function explainHypothesis(
  templates: ExplanationTemplates,
  matched: ConditionResult[],
  missing: ConditionResult[],
  contradicted: ConditionResult[],
  locale: Locale,
): string {
  const parts: string[] = []

  if (matched.length > 0) {
    parts.push(
      fillTemplate(localize(templates.summary, locale), {
        matched_summary: joinDescriptions(matched, locale),
      }),
    )
  }
  if (missing.length > 0) {
    parts.push(
      fillTemplate(localize(templates.missing, locale), {
        missing_summary: joinDescriptions(missing, locale),
      }),
    )
  }
  if (contradicted.length > 0) {
    parts.push(
      fillTemplate(localize(templates.counterpoints, locale), {
        counterpoint_summary: joinDescriptions(contradicted, locale),
      }),
    )
  }

  return parts.join(' ')
}
