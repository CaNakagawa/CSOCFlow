import type { CanvasNodeType, NodeState, RelationshipType } from '../../../shared/types/investigation'
import type { TranslationKey } from '../../../shared/i18n'

export const NODE_GLYPHS: Record<CanvasNodeType, string> = {
  mitre_tactic: 'TA',
  mitre_technique: 'T',
  mitre_subtechnique: 'T.',
  alert: '!',
  authentication_event: 'AUTH',
  process: 'PROC',
  command_line: '>_',
  user: 'USR',
  host: 'HOST',
  ip_address: 'IP',
  domain: 'DNS',
  url: 'URL',
  file: 'FILE',
  file_hash: 'HASH',
  registry_key: 'REG',
  service: 'SVC',
  scheduled_task: 'TASK',
  network_connection: 'NET',
  email: '@',
  evidence: 'EVD',
  analyst_note: 'NOTE',
  hypothesis: 'H',
  detection_use_case: 'UC',
}

export const NODE_STATE_MARKERS: Record<NodeState, string> = {
  unknown: '?',
  observed: 'o',
  suspicious: '/!\\',
  confirmed_malicious: 'X',
  expected: 'ok',
  false_positive: 'fp',
  discarded: '--',
}

export function nodeCategoryKey(type: CanvasNodeType): TranslationKey {
  return `nodeVisual.${type}` as TranslationKey
}

export function nodeStateKey(state: NodeState): TranslationKey {
  return `nodeState.${state}` as TranslationKey
}

export function relationshipKey(type: RelationshipType): TranslationKey {
  return `relationship.${type}` as TranslationKey
}
