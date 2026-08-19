import { z } from 'zod'
import type { UseCaseDefinition } from '../../../shared/types/knowledge'

/**
 * The shape of a use case file, kept in step with
 * `public/data/schemas/use-case.schema.json`.
 *
 * English is the only text required. MITRE publishes ATT&CK in English, and an
 * analyst writing their own case should not have to translate it three times to
 * be allowed to use it; `localize` falls back to English when a locale is
 * missing.
 */
const localizedText = z.object({
  en: z.string().min(1),
  pt: z.string().min(1).optional(),
  de: z.string().min(1).optional(),
})

const localizedList = z.object({
  en: z.array(z.string()),
  pt: z.array(z.string()).optional(),
  de: z.array(z.string()).optional(),
})

const detectionStrategy = z.object({
  id: z.string(),
  name: localizedText,
  url: z.string().url(),
})

const investigationStep = z.object({
  order: z.number(),
  techniqueId: z.string(),
  instruction: localizedText,
  detectionStrategies: z.array(detectionStrategy).default([]),
})

export const useCaseSchema = z.object({
  id: z.string().regex(/^use-case\./, 'must start with "use-case."'),
  name: localizedText,
  description: localizedText,
  tactics: z.array(z.string().regex(/^TA[0-9]{4}$/, 'must look like TA0001')).min(1),
  techniques: z.array(z.string().regex(/^T[0-9]{4}(\.[0-9]{3})?$/, 'must look like T1110')).min(1),
  investigationSteps: z.array(investigationStep).default([]),
  dataSources: localizedList.default({ en: [] }),
  relatedHypotheses: z.array(z.string()).default([]),
  sourceReference: z.object({ title: z.string(), url: z.string().url() }).nullish(),
})

function isInvestigationDocument(data: unknown): boolean {
  return (
    typeof data === 'object' &&
    data !== null &&
    'schemaVersion' in data &&
    'canvas' in data &&
    'investigation' in data
  )
}

/** Why a file was turned away, in words the analyst can act on. */
export class UseCaseImportError extends Error {
  constructor(reason: string) {
    super(reason)
    this.name = 'UseCaseImportError'
  }
}

export interface ParseOptions {
  /** Ids that ship with the app: a file may not quietly take one over. */
  builtInIds: readonly string[]
}

/**
 * Reads one use case out of the text of a file.
 *
 * Missing techniques are not checked here: whether an id exists in the base is
 * a question for the moment the case is applied, and a case may legitimately
 * name a technique the analyst is about to add.
 */
export function parseUseCase(text: string, { builtInIds }: ParseOptions): UseCaseDefinition {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new UseCaseImportError('notJson')
  }

  /*
   * The Share menu writes investigations, and an investigation is the file an
   * analyst most plausibly brings here by mistake. Naming it beats handing back
   * a list of fields that are missing from something that was never a use case.
   */
  if (isInvestigationDocument(data)) {
    throw new UseCaseImportError('isInvestigation')
  }

  const result = useCaseSchema.safeParse(data)
  if (!result.success) {
    const detail = result.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
      .join('; ')
    throw new UseCaseImportError(detail)
  }

  if (builtInIds.includes(result.data.id)) {
    throw new UseCaseImportError('idTaken')
  }

  return {
    ...result.data,
    sourceReference: result.data.sourceReference ?? null,
  }
}
