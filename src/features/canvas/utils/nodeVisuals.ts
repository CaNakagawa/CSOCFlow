import type {
  CanvasNodeType,
  NodeState,
  RelationshipType,
} from '../../../shared/types/investigation'

export interface NodeVisual {
  glyph: string
  categoryLabel: string
}

export const NODE_VISUALS: Record<CanvasNodeType, NodeVisual> = {
  mitre_tactic: { glyph: 'TA', categoryLabel: 'Tática MITRE' },
  mitre_technique: { glyph: 'T', categoryLabel: 'Técnica MITRE' },
  mitre_subtechnique: { glyph: 'T.', categoryLabel: 'Subtécnica MITRE' },
  alert: { glyph: '!', categoryLabel: 'Alerta' },
  authentication_event: { glyph: 'AUTH', categoryLabel: 'Evento de autenticação' },
  process: { glyph: 'PROC', categoryLabel: 'Processo' },
  command_line: { glyph: '>_', categoryLabel: 'Linha de comando' },
  user: { glyph: 'USR', categoryLabel: 'Usuário' },
  host: { glyph: 'HOST', categoryLabel: 'Host' },
  ip_address: { glyph: 'IP', categoryLabel: 'Endereço IP' },
  domain: { glyph: 'DNS', categoryLabel: 'Domínio' },
  url: { glyph: 'URL', categoryLabel: 'URL' },
  file: { glyph: 'FILE', categoryLabel: 'Arquivo' },
  file_hash: { glyph: 'HASH', categoryLabel: 'Hash de arquivo' },
  registry_key: { glyph: 'REG', categoryLabel: 'Chave de registro' },
  service: { glyph: 'SVC', categoryLabel: 'Serviço' },
  scheduled_task: { glyph: 'TASK', categoryLabel: 'Tarefa agendada' },
  network_connection: { glyph: 'NET', categoryLabel: 'Conexão de rede' },
  email: { glyph: '@', categoryLabel: 'E-mail' },
  evidence: { glyph: 'EVD', categoryLabel: 'Evidência' },
  analyst_note: { glyph: 'NOTE', categoryLabel: 'Observação do analista' },
  hypothesis: { glyph: 'H', categoryLabel: 'Hipótese' },
  detection_use_case: { glyph: 'UC', categoryLabel: 'Caso de uso de detecção' },
}

export const NODE_STATE_LABELS: Record<NodeState, string> = {
  unknown: 'Desconhecido',
  observed: 'Observado',
  suspicious: 'Suspeito',
  confirmed_malicious: 'Confirmado malicioso',
  expected: 'Esperado',
  false_positive: 'Falso positivo',
  discarded: 'Descartado',
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

export const RELATIONSHIP_TYPE_LABELS: Record<RelationshipType, string> = {
  executed_by: 'foi executado por',
  executed_on: 'foi executado em',
  parent_of: 'é pai de',
  child_of: 'é filho de',
  connected_to: 'conectou-se a',
  downloaded_from: 'foi baixado de',
  resolved_to: 'resolveu para',
  authenticated_from: 'autenticou a partir de',
  targeted: 'teve como alvo',
  associated_with: 'está associado a',
  supports_hypothesis: 'sustenta a hipótese',
  contradicts_hypothesis: 'contradiz a hipótese',
  maps_to: 'mapeia para',
  occurred_before: 'ocorreu antes de',
  occurred_after: 'ocorreu depois de',
}
