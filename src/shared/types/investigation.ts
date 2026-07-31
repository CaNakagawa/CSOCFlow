export type CanvasNodeType =
  | 'mitre_tactic'
  | 'mitre_technique'
  | 'mitre_subtechnique'
  | 'alert'
  | 'authentication_event'
  | 'process'
  | 'command_line'
  | 'user'
  | 'host'
  | 'ip_address'
  | 'domain'
  | 'url'
  | 'file'
  | 'file_hash'
  | 'registry_key'
  | 'service'
  | 'scheduled_task'
  | 'network_connection'
  | 'email'
  | 'evidence'
  | 'analyst_note'
  | 'hypothesis'
  | 'detection_use_case'

export type NodeState =
  | 'unknown'
  | 'observed'
  | 'suspicious'
  | 'confirmed_malicious'
  | 'expected'
  | 'false_positive'
  | 'discarded'

export type ConfidenceLevel = 'low' | 'possible' | 'probable' | 'high'

export type AnalyticStatus = 'pending' | 'confirmed' | 'not_confirmed'

export type RelationshipType =
  | 'executed_by'
  | 'executed_on'
  | 'parent_of'
  | 'child_of'
  | 'connected_to'
  | 'downloaded_from'
  | 'resolved_to'
  | 'authenticated_from'
  | 'targeted'
  | 'associated_with'
  | 'supports_hypothesis'
  | 'contradicts_hypothesis'
  | 'maps_to'
  | 'occurred_before'
  | 'occurred_after'

export interface InvestigationNode {
  id: string
  definitionId: string
  type: CanvasNodeType
  label: string
  state: NodeState
  position: {
    x: number
    y: number
  }
  fields: Record<string, unknown>
  notes?: string
  analyticStatuses?: Record<string, AnalyticStatus>
  /**
   * Structural scaffolding rather than something the analyst observed. Drawn
   * faded so the ATT&CK matrix frame never competes with real evidence.
   */
  scaffold?: boolean
  createdAt: string
  updatedAt: string
}

export interface InvestigationEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  type: RelationshipType
  label?: string
  automatic: boolean
  confidence?: number
  explanation?: string
  /** Analyst overrides for how the connection is drawn. */
  color?: string
  lineStyle?: EdgeLineStyle
}

export type EdgeLineStyle = 'solid' | 'dashed'

export type InvestigationConclusion =
  'confirmed' | 'probable' | 'inconclusive' | 'legitimate_activity' | 'false_positive'

export type InvestigationStatus = 'open' | 'closed'

export interface InvestigationMeta {
  id: string
  title: string
  caseId: string
  createdAt: string
  updatedAt: string
  analyst: string
  description: string
  status: InvestigationStatus
  conclusion: InvestigationConclusion | null
}

export interface TimelineEntry {
  id: string
  nodeId: string
  timestamp: string | null
  label: string
}

export interface Investigation {
  schemaVersion: string
  applicationVersion: string
  investigation: InvestigationMeta
  canvas: {
    viewport: { x: number; y: number; zoom: number }
    nodes: InvestigationNode[]
    edges: InvestigationEdge[]
  }
  hypotheses: HypothesisRecord[]
  timeline: TimelineEntry[]
  report: {
    analystNotes: string
    recommendations: string[]
  }
}

export interface HypothesisRecord {
  hypothesisId: string
  score: number
  overriddenByAnalyst?: boolean
}

export interface InvestigationSummary {
  id: string
  title: string
  caseId: string
  updatedAt: string
  status: InvestigationStatus
}
