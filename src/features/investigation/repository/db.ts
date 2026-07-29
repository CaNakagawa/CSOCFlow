import Dexie, { type EntityTable } from 'dexie'
import type { Investigation } from '../../../shared/types/investigation'

interface StoredInvestigation {
  id: string
  updatedAt: string
  document: Investigation
}

export class CsocFlowDatabase extends Dexie {
  investigations!: EntityTable<StoredInvestigation, 'id'>

  constructor() {
    super('csocflow')
    this.version(1).stores({
      investigations: 'id, updatedAt',
    })
  }
}

export const db = new CsocFlowDatabase()
export type { StoredInvestigation }
