import type { UseCaseDefinition } from '../../../shared/types/knowledge'

/**
 * Writes a use case back out in the shape the importer reads.
 *
 * This is the round trip an analyst expects: take one that exists, open it in
 * an editor, and bring the edited version back in. Everything the app keeps in
 * memory is written, so nothing is silently lost on the way out.
 */
export function serializeUseCase(useCase: UseCaseDefinition): string {
  return JSON.stringify(
    {
      id: useCase.id,
      name: useCase.name,
      description: useCase.description,
      tactics: useCase.tactics,
      techniques: useCase.techniques,
      investigationSteps: useCase.investigationSteps,
      dataSources: useCase.dataSources,
      relatedHypotheses: useCase.relatedHypotheses,
      sourceReference: useCase.sourceReference,
    },
    null,
    2,
  )
}

/** `use-case.suspicious_authentication` becomes `suspicious-authentication.json`. */
export function fileNameForUseCase(useCase: UseCaseDefinition): string {
  const base = useCase.id.replace(/^use-case\./, '').replace(/[^a-z0-9]+/gi, '-')
  return `${base || 'use-case'}.json`
}
