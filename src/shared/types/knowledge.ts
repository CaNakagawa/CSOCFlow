import type { CanvasNodeType, RelationshipType } from './investigation'

export interface MitreReference {
  title: string
  url: string
}

export interface InvestigationContext {
  what_it_means: string
  why_it_matters: string
  suspicious_when: string[]
  legitimate_when: string[]
  common_mistakes: string[]
}

export interface MitreTactic {
  id: string
  name: string
  shortName: string
}

export interface MitreTechnique {
  id: string
  name: string
  type: 'mitre_technique' | 'mitre_subtechnique'
  tactics: string[]
  platforms: string[]
  brief: string
  investigation_context: InvestigationContext
  expected_evidence: CanvasNodeType[]
  related_hypotheses: string[]
  suggested_checks: string[]
  references: MitreReference[]
}

export type EvidenceFieldType = 'string' | 'number' | 'boolean' | 'ip' | 'datetime' | 'string_array'

export interface EvidenceFieldDefinition {
  id: string
  label: string
  type: EvidenceFieldType
  required: boolean
}

export interface EvidenceEducationalContent {
  why_it_matters: string
  suspicious_when: string[]
  legitimate_when: string[]
}

export interface EvidenceTypeDefinition {
  id: string
  name: string
  category: string
  node_type: CanvasNodeType
  brief: string
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
  description: string
}

export interface ExplanationTemplates {
  summary: string
  missing: string
  counterpoints: string
}

export interface HypothesisReportTemplate {
  title: string
  summary: string
}

export interface HypothesisDefinition {
  id: string
  name: string
  category: string
  description: string
  mitre: string[]
  base_score: number
  minimum_score: number
  maximum_score: number
  conditions: HypothesisCondition[]
  negative_conditions: HypothesisCondition[]
  recommended_checks: string[]
  explanation_templates: ExplanationTemplates
  false_positive_context: string[]
  report_template: HypothesisReportTemplate
}

export type CheckPriority = 'low' | 'medium' | 'high'

export interface CheckAnswerEffect {
  hypothesis_id: string
  score_delta: number
}

export interface CheckAnswer {
  value: string
  label: string
  effects: CheckAnswerEffect[]
}

export interface RecommendedCheckDefinition {
  id: string
  title: string
  description: string
  reason: string
  expected_evidence_types: CanvasNodeType[]
  priority: CheckPriority
  answers: CheckAnswer[]
}

export interface InvestigationPatternDefinition {
  id: string
  name: string
  description: string
  hypotheses: string[]
  suggested_evidence: string[]
}

export interface RelationshipRule {
  id: string
  type: RelationshipType
  label: string
  from: CanvasNodeType
  to: CanvasNodeType
  match: {
    sourceField: string
    targetField: string
  }
  explanation: string
  automatic: true
}

export interface KnowledgeManifest {
  version: string
  tactics: string
  techniques: string[]
  evidenceTypes: string[]
  hypotheses: string[]
  checks: string[]
  investigationPatterns: string[]
  relationships: string[]
}

export interface KnowledgeBase {
  version: string
  tactics: MitreTactic[]
  techniques: MitreTechnique[]
  evidenceTypes: EvidenceTypeDefinition[]
  hypotheses: HypothesisDefinition[]
  checks: RecommendedCheckDefinition[]
  investigationPatterns: InvestigationPatternDefinition[]
  relationshipRules: RelationshipRule[]
}
