import { z } from 'zod'

const canvasNodeTypeSchema = z.enum([
  'mitre_tactic',
  'mitre_technique',
  'mitre_subtechnique',
  'alert',
  'authentication_event',
  'process',
  'command_line',
  'user',
  'host',
  'ip_address',
  'domain',
  'url',
  'file',
  'file_hash',
  'registry_key',
  'service',
  'scheduled_task',
  'network_connection',
  'email',
  'evidence',
  'analyst_note',
  'hypothesis',
  'detection_use_case',
])

const relationshipTypeSchema = z.enum([
  'executed_by',
  'executed_on',
  'parent_of',
  'child_of',
  'connected_to',
  'downloaded_from',
  'resolved_to',
  'authenticated_from',
  'targeted',
  'associated_with',
  'supports_hypothesis',
  'contradicts_hypothesis',
  'maps_to',
  'occurred_before',
  'occurred_after',
])

export const mitreTacticSchema = z.object({
  id: z.string(),
  name: z.string(),
  shortName: z.string(),
})

export const relationshipRuleSchema = z.object({
  id: z.string(),
  type: relationshipTypeSchema,
  label: z.string(),
  from: canvasNodeTypeSchema,
  to: canvasNodeTypeSchema,
  match: z.object({
    sourceField: z.string(),
    targetField: z.string(),
  }),
  explanation: z.string(),
  automatic: z.literal(true),
})
