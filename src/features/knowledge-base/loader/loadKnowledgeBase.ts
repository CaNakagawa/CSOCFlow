import type {
  EvidenceTypeDefinition,
  HypothesisDefinition,
  InvestigationPatternDefinition,
  KnowledgeBase,
  MitreTactic,
  MitreTechnique,
  RecommendedCheckDefinition,
  RelationshipRule,
} from '../../../shared/types/knowledge'
import { manifestSchema } from './manifestSchema'
import {
  mitreTacticSchema,
  investigationPatternSchema,
  relationshipRuleSchema,
} from './lightSchemas'
import { createSchemaValidator } from './schemaValidator'
import type { KnowledgeSource } from './source'
import { KnowledgeLoadError } from './errors'

const SCHEMA_PATHS = {
  technique: 'schemas/technique.schema.json',
  evidence: 'schemas/evidence.schema.json',
  hypothesis: 'schemas/hypothesis.schema.json',
  check: 'schemas/check.schema.json',
} as const

export interface LoadKnowledgeBaseOptions {
  /** Validate every knowledge file against its JSON Schema (or Zod shape for internal files). Defaults to true. */
  validate?: boolean
}

async function loadArray<T>(
  source: KnowledgeSource,
  paths: string[],
  validateItem: (item: unknown, path: string) => Promise<T> | T,
): Promise<T[]> {
  const items: T[] = []
  for (const path of paths) {
    const raw = await source.readJson(path)
    items.push(await validateItem(raw, path))
  }
  return items
}

export async function loadKnowledgeBase(
  source: KnowledgeSource,
  options: LoadKnowledgeBaseOptions = {},
): Promise<KnowledgeBase> {
  const validate = options.validate ?? true
  const schemaValidator = createSchemaValidator(source)

  const manifestRaw = await source.readJson('manifest.json')
  const manifestResult = manifestSchema.safeParse(manifestRaw)
  if (!manifestResult.success) {
    throw new KnowledgeLoadError(
      'manifest.json',
      manifestResult.error.issues
        .map((i: { path: PropertyKey[]; message: string }) => `${i.path.join('.')}: ${i.message}`)
        .join('; '),
    )
  }
  const manifest = manifestResult.data

  const tacticsRaw = await source.readJson(manifest.tactics)
  const tacticsList = Array.isArray(tacticsRaw) ? tacticsRaw : []
  const tactics: MitreTactic[] = tacticsList.map((t) => mitreTacticSchema.parse(t))

  const techniques = await loadArray<MitreTechnique>(
    source,
    manifest.techniques,
    async (data, path) => {
      if (validate) await schemaValidator.validate(SCHEMA_PATHS.technique, path, data)
      return data as MitreTechnique
    },
  )

  const evidenceTypes: EvidenceTypeDefinition[] = []
  for (const path of manifest.evidenceTypes) {
    const raw = await source.readJson(path)
    const list = Array.isArray(raw) ? raw : []
    for (const item of list) {
      if (validate) await schemaValidator.validate(SCHEMA_PATHS.evidence, path, item)
      evidenceTypes.push(item as EvidenceTypeDefinition)
    }
  }

  const hypotheses = await loadArray<HypothesisDefinition>(
    source,
    manifest.hypotheses,
    async (data, path) => {
      if (validate) await schemaValidator.validate(SCHEMA_PATHS.hypothesis, path, data)
      return data as HypothesisDefinition
    },
  )

  const checks = await loadArray<RecommendedCheckDefinition>(
    source,
    manifest.checks,
    async (data, path) => {
      if (validate) await schemaValidator.validate(SCHEMA_PATHS.check, path, data)
      return data as RecommendedCheckDefinition
    },
  )

  const investigationPatterns = await loadArray<InvestigationPatternDefinition>(
    source,
    manifest.investigationPatterns,
    (data) => investigationPatternSchema.parse(data),
  )

  const relationshipRules: RelationshipRule[] = []
  for (const path of manifest.relationships) {
    const raw = await source.readJson(path)
    const list = Array.isArray(raw) ? raw : []
    relationshipRules.push(...list.map((item) => relationshipRuleSchema.parse(item)))
  }

  return {
    version: manifest.version,
    tactics,
    techniques,
    evidenceTypes,
    hypotheses,
    checks,
    investigationPatterns,
    relationshipRules,
  }
}
