import Ajv, { type ErrorObject } from 'ajv'
import addFormats from 'ajv-formats'
import { KnowledgeValidationError } from './errors'
import type { KnowledgeSource } from './source'

function createAjv(): Ajv {
  const ajv = new Ajv({ allErrors: true, strict: false })
  addFormats(ajv)
  return ajv
}

export interface SchemaValidator {
  validate(schemaPath: string, dataPath: string, data: unknown): Promise<void>
}

function formatErrors(errors: ErrorObject[] | null | undefined) {
  return (errors ?? []).map((err) => ({
    field: err.instancePath || err.schemaPath,
    reason: err.message ?? 'invalid value',
  }))
}

export function createSchemaValidator(source: KnowledgeSource): SchemaValidator {
  const ajv = createAjv()
  const compiledCache = new Map<string, ReturnType<Ajv['compile']>>()

  return {
    async validate(schemaPath, dataPath, data) {
      let validateFn = compiledCache.get(schemaPath)
      if (!validateFn) {
        const schema = await source.readJson(schemaPath)
        validateFn = ajv.compile(schema as object)
        compiledCache.set(schemaPath, validateFn)
      }
      const valid = validateFn(data)
      if (!valid) {
        throw new KnowledgeValidationError(dataPath, schemaPath, formatErrors(validateFn.errors))
      }
    },
  }
}
