import type { CanvasNodeType, RelationshipType } from './investigation'
import type { LocalizedList, LocalizedText } from '../i18n/types'

export interface MitreReference {
  title: string
  url: string
}

export interface InvestigationContext {
  what_it_means: LocalizedText
  why_it_matters: LocalizedText
  suspicious_when: LocalizedList
  legitimate_when: LocalizedList
  common_mistakes: LocalizedList
}

export interface MitreTactic {
  id: string
  name: string
  shortName: string
}

export interface DetectionAnalytic {
  id: string
  detectionStrategyId: string
  description: LocalizedText
  url: string
}

export interface MitreTechnique {
  id: string
  name: string
  type: 'mitre_technique' | 'mitre_subtechnique'
  tactics: string[]
  platforms: string[]
  brief: LocalizedText
  /** Hand-curated teaching content. Absent on techniques imported in bulk from MITRE. */
  investigation_context?: InvestigationContext
  expected_evidence: CanvasNodeType[]
  related_hypotheses: string[]
  suggested_checks: string[]
  detection_analytics: DetectionAnalytic[]
  references: MitreReference[]
}

export type EvidenceFieldType = 'string' | 'number' | 'boolean' | 'ip' | 'datetime' | 'string_array'

export interface EvidenceFieldDefinition {
  id: string
  label: LocalizedText
  type: EvidenceFieldType
  required: boolean
}

export interface EvidenceEducationalContent {
  why_it_matters: LocalizedText
  suspicious_when: LocalizedList
  legitimate_when: LocalizedList
}

export interface EvidenceTypeDefinition {
  id: string
  name: LocalizedText
  category: string
  node_type: CanvasNodeType
  brief: LocalizedText
  fields: EvidenceFieldDefinition[]
  educational_content: EvidenceEducationalContent
}

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'in'
  | 'not_in'
  | 'exists'
  | 'not_exists'
  | 'greater_than'
  | 'greater_than_or_equal'
  | 'less_than'
  | 'less_than_or_equal'
  | 'matches_any_selected_node'
  | 'has_relationship'
  | 'node_count_greater_than'
  | 'state_equals'

export interface HypothesisCondition {
  id: string
  fact: string
  operator: ConditionOperator
  value?: unknown
  weight: number
  description: LocalizedText
}

export interface ExplanationTemplates {
  summary: LocalizedText
  missing: LocalizedText
  counterpoints: LocalizedText
}

export interface HypothesisReportTemplate {
  title: LocalizedText
  summary: LocalizedText
}

export interface HypothesisDefinition {
  id: string
  name: LocalizedText
  category: string
  description: LocalizedText
  mitre: string[]
  base_score: number
  minimum_score: number
  maximum_score: number
  conditions: HypothesisCondition[]
  negative_conditions: HypothesisCondition[]
  recommended_checks: string[]
  explanation_templates: ExplanationTemplates
  false_positive_context: LocalizedList
  report_template: HypothesisReportTemplate
}

export type CheckPriority = 'low' | 'medium' | 'high'

export interface CheckAnswerEffect {
  hypothesis_id: string
  score_delta: number
}

export interface CheckAnswer {
  value: string
  label: LocalizedText
  effects: CheckAnswerEffect[]
}

export interface RecommendedCheckDefinition {
  id: string
  title: LocalizedText
  description: LocalizedText
  reason: LocalizedText
  expected_evidence_types: CanvasNodeType[]
  priority: CheckPriority
  answers: CheckAnswer[]
}

export interface DetectionStrategyReference {
  id: string
  name: LocalizedText
  url: string
}

export interface UseCaseInvestigationStep {
  order: number
  techniqueId: string
  instruction: LocalizedText
  detectionStrategies: DetectionStrategyReference[]
}

export interface SourceReference {
  title: string
  url: string
}

export interface UseCaseDefinition {
  id: string
  name: LocalizedText
  description: LocalizedText
  tactics: string[]
  techniques: string[]
  investigationSteps: UseCaseInvestigationStep[]
  dataSources: LocalizedList
  relatedHypotheses: string[]
  sourceReference: SourceReference | null
}

export interface RelationshipRule {
  id: string
  type: RelationshipType
  label: LocalizedText
  from: CanvasNodeType
  to: CanvasNodeType
  match: {
    sourceField: string
    targetField: string
  }
  explanation: LocalizedText
  automatic: true
}

export interface KnowledgeManifest {
  version: string
  tactics: string
  techniques: string[]
  evidenceTypes: string[]
  hypotheses: string[]
  checks: string[]
  useCases: string[]
  relationships: string[]
}

export interface KnowledgeBase {
  version: string
  tactics: MitreTactic[]
  techniques: MitreTechnique[]
  evidenceTypes: EvidenceTypeDefinition[]
  hypotheses: HypothesisDefinition[]
  checks: RecommendedCheckDefinition[]
  useCases: UseCaseDefinition[]
  relationshipRules: RelationshipRule[]
}
