import { z } from 'zod'

export const manifestSchema = z.object({
  version: z.string(),
  tactics: z.string(),
  techniques: z.array(z.string()),
  evidenceTypes: z.array(z.string()),
  hypotheses: z.array(z.string()),
  checks: z.array(z.string()),
  useCases: z.array(z.string()),
  relationships: z.array(z.string()),
})

export type ManifestShape = z.infer<typeof manifestSchema>
