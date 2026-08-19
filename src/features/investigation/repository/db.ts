import Dexie, { type EntityTable } from 'dexie'
import type { Investigation } from '../../../shared/types/investigation'
import type { UseCaseDefinition } from '../../../shared/types/knowledge'

interface StoredInvestigation {
  id: string
  updatedAt: string
  document: Investigation
}

/** A use case the analyst brought themselves, kept on their machine alone. */
interface StoredUseCase {
  id: string
  addedAt: string
  definition: UseCaseDefinition
}

export class CsocFlowDatabase extends Dexie {
  investigations!: EntityTable<StoredInvestigation, 'id'>
  useCases!: EntityTable<StoredUseCase, 'id'>

  constructor() {
    super('csocflow')
    this.version(1).stores({
      investigations: 'id, updatedAt',
    })
    this.version(2).stores({
      investigations: 'id, updatedAt',
      useCases: 'id, addedAt',
    })
  }
}

export const db = new CsocFlowDatabase()
export type { StoredInvestigation, StoredUseCase }
