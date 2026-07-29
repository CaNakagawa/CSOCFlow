export interface KnowledgeFieldError {
  field: string
  reason: string
}

export class KnowledgeValidationError extends Error {
  readonly file: string
  readonly schema: string
  readonly fieldErrors: KnowledgeFieldError[]

  constructor(file: string, schema: string, fieldErrors: KnowledgeFieldError[]) {
    const summary = fieldErrors.map((e) => `${e.field}: ${e.reason}`).join('; ')
    super(`Invalid knowledge file "${file}" against schema "${schema}": ${summary}`)
    this.name = 'KnowledgeValidationError'
    this.file = file
    this.schema = schema
    this.fieldErrors = fieldErrors
  }
}

export class KnowledgeLoadError extends Error {
  readonly file: string

  constructor(file: string, cause: unknown) {
    super(`Failed to load knowledge file "${file}": ${String(cause)}`)
    this.name = 'KnowledgeLoadError'
    this.file = file
  }
}
