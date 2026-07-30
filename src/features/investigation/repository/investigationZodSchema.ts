import { z } from 'zod'

const nodeStateSchema = z.enum([
  'unknown',
  'observed',
  'suspicious',
  'confirmed_malicious',
  'expected',
  'false_positive',
  'discarded',
])

const investigationNodeSchema = z.object({
  id: z.string(),
  definitionId: z.string(),
  type: z.string(),
  label: z.string(),
  state: nodeStateSchema,
  position: z.object({ x: z.number(), y: z.number() }),
  fields: z.record(z.string(), z.unknown()),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const investigationEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  type: z.string(),
  label: z.string().optional(),
  automatic: z.boolean(),
  confidence: z.number().optional(),
  explanation: z.string().optional(),
})

export const investigationSchema = z.object({
  schemaVersion: z.string(),
  applicationVersion: z.string(),
  investigation: z.object({
    id: z.string(),
    title: z.string(),
    caseId: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    analyst: z.string(),
    description: z.string(),
    status: z.enum(['open', 'closed']),
    conclusion: z
      .enum(['confirmed', 'probable', 'inconclusive', 'legitimate_activity', 'false_positive'])
      .nullable(),
  }),
  canvas: z.object({
    viewport: z.object({ x: z.number(), y: z.number(), zoom: z.number() }),
    nodes: z.array(investigationNodeSchema),
    edges: z.array(investigationEdgeSchema),
  }),
  hypotheses: z.array(
    z.object({
      hypothesisId: z.string(),
      score: z.number(),
      overriddenByAnalyst: z.boolean().optional(),
    }),
  ),
  timeline: z.array(
    z.object({
      id: z.string(),
      nodeId: z.string(),
      timestamp: z.string().nullable(),
      label: z.string(),
    }),
  ),
  report: z.object({
    analystNotes: z.string(),
    recommendations: z.array(z.string()),
  }),
})
