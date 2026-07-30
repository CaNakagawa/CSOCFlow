import type { InvestigationEdge, InvestigationNode, ConfidenceLevel } from './investigation'
import type { HypothesisCondition, KnowledgeBase, RecommendedCheckDefinition } from './knowledge'

export interface ConditionResult {
  condition: HypothesisCondition
  satisfied: boolean
  actualValue?: unknown
  contributedWeight: number
}

export interface HypothesisResult {
  hypothesisId: string
  score: number
  normalizedScore: number
  confidenceLevel: ConfidenceLevel
  matchedConditions: ConditionResult[]
  missingConditions: ConditionResult[]
  contradictedConditions: ConditionResult[]
  explanation: string
  recommendedChecks: RecommendedCheckDefinition[]
}

export interface CheckAnswerRecord {
  checkId: string
  value: string
  answeredAt: string
}

export interface CorrelationInput {
  nodes: InvestigationNode[]
  edges: InvestigationEdge[]
  knowledgeBase: KnowledgeBase
  checkAnswers: CheckAnswerRecord[]
}

export interface UseCaseSuggestion {
  useCaseId: string
  matchedTechniques: string[]
  missingTechniques: string[]
  matchRatio: number
  applied: boolean
}

export interface CorrelationResult {
  hypotheses: HypothesisResult[]
  inferredEdges: InvestigationEdge[]
  useCaseSuggestions: UseCaseSuggestion[]
}

export interface CorrelationEngine {
  evaluate(input: CorrelationInput): CorrelationResult
}
