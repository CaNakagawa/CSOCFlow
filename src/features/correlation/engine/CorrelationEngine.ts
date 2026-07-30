import type {
  CorrelationEngine,
  CorrelationInput,
  CorrelationResult,
  ConditionResult,
  HypothesisResult,
} from '../../../shared/types/correlation'
import type { HypothesisDefinition } from '../../../shared/types/knowledge'
import { evaluateCondition } from './operators'
import type { EngineContext } from './facts'
import { normalizeScore, confidenceLevelFor } from './scoring'
import { explainHypothesis } from '../explainers/explainHypothesis'
import { inferRelationships } from './inferRelationships'
import { inferUseCaseLinks } from './inferUseCaseLinks'
import { suggestUseCases } from './suggestUseCases'

function evaluateHypothesis(
  hypothesis: HypothesisDefinition,
  ctx: EngineContext,
  checkScoreDelta: number,
  checksById: Map<string, CorrelationInput['knowledgeBase']['checks'][number]>,
): HypothesisResult {
  const matched: ConditionResult[] = []
  const missing: ConditionResult[] = []
  const contradicted: ConditionResult[] = []

  let score = hypothesis.base_score

  for (const condition of hypothesis.conditions) {
    const { satisfied, actualValue } = evaluateCondition(condition, ctx)
    const result: ConditionResult = {
      condition,
      satisfied,
      actualValue,
      contributedWeight: satisfied ? condition.weight : 0,
    }
    if (satisfied) {
      matched.push(result)
      score += condition.weight
    } else {
      missing.push(result)
    }
  }

  for (const condition of hypothesis.negative_conditions) {
    const { satisfied, actualValue } = evaluateCondition(condition, ctx)
    if (satisfied) {
      contradicted.push({
        condition,
        satisfied,
        actualValue,
        contributedWeight: condition.weight,
      })
      score += condition.weight
    }
  }

  score += checkScoreDelta

  const normalizedScore = normalizeScore(score, hypothesis.maximum_score)
  const recommendedChecks = hypothesis.recommended_checks
    .map((id) => checksById.get(id))
    .filter((c): c is NonNullable<typeof c> => c !== undefined)

  return {
    hypothesisId: hypothesis.id,
    score,
    normalizedScore,
    confidenceLevel: confidenceLevelFor(normalizedScore),
    matchedConditions: matched,
    missingConditions: missing,
    contradictedConditions: contradicted,
    explanation: explainHypothesis(
      hypothesis.explanation_templates,
      matched,
      missing,
      contradicted,
    ),
    recommendedChecks,
  }
}

export function createCorrelationEngine(): CorrelationEngine {
  return {
    evaluate(input: CorrelationInput): CorrelationResult {
      const ctx: EngineContext = { nodes: input.nodes, edges: input.edges }
      const checksById = new Map(input.knowledgeBase.checks.map((c) => [c.id, c]))

      const hypotheses = input.knowledgeBase.hypotheses
        .map((hypothesis) => {
          const checkScoreDelta = input.checkAnswers.reduce((acc, answer) => {
            const check = checksById.get(answer.checkId)
            const chosenAnswer = check?.answers.find((a) => a.value === answer.value)
            const effect = chosenAnswer?.effects.find((e) => e.hypothesis_id === hypothesis.id)
            return acc + (effect?.score_delta ?? 0)
          }, 0)
          return evaluateHypothesis(hypothesis, ctx, checkScoreDelta, checksById)
        })
        .filter((result) => {
          const hypothesis = input.knowledgeBase.hypotheses.find(
            (h) => h.id === result.hypothesisId,
          )
          return hypothesis !== undefined && result.score >= hypothesis.minimum_score
        })
        .sort((a, b) => b.normalizedScore - a.normalizedScore)

      const inferredEdges = [
        ...inferRelationships(input.nodes, input.knowledgeBase.relationshipRules),
        ...inferUseCaseLinks(input.nodes, input.knowledgeBase.useCases),
      ]

      const useCaseSuggestions = suggestUseCases(input.nodes, input.knowledgeBase.useCases)

      return { hypotheses, inferredEdges, useCaseSuggestions }
    },
  }
}
