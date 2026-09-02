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

const analyticStatusSchema = z.enum(['pending', 'confirmed', 'not_confirmed'])

/*
 * Every field an element can carry, because Zod drops what it is not told
 * about: anything missing here is silently lost when an investigation is
 * imported back, which is the whole point of having exported it.
 */
const investigationNodeSchema = z.object({
  id: z.string(),
  definitionId: z.string(),
  type: z.string(),
  label: z.string(),
  state: nodeStateSchema,
  position: z.object({ x: z.number(), y: z.number() }),
  fields: z.record(z.string(), z.unknown()),
  notes: z.string().optional(),
  analyticStatuses: z.record(z.string(), analyticStatusSchema).optional(),
  analyticsExpanded: z.boolean().optional(),
  scaffold: z.boolean().optional(),
  size: z.object({ width: z.number(), height: z.number() }).optional(),
  parentId: z.string().optional(),
  stroke: z
    .object({
      points: z.array(z.object({ x: z.number(), y: z.number() })),
      color: z.string(),
      width: z.number(),
    })
    .optional(),
  imageSrc: z.string().optional(),
  layer: z.number().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  step: z.number().optional(),
  eventAt: z.string().optional(),
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
  color: z.string().optional(),
  lineStyle: z.enum(['solid', 'dashed']).optional(),
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
