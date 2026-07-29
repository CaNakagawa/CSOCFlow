import type { Investigation, InvestigationSummary } from '../../../shared/types/investigation'
import { investigationSchema } from './investigationZodSchema'
import { db } from './db'

export interface InvestigationRepository {
  list(): Promise<InvestigationSummary[]>
  get(id: string): Promise<Investigation | null>
  save(investigation: Investigation): Promise<void>
  delete(id: string): Promise<void>
  import(data: unknown): Promise<Investigation>
  export(id: string): Promise<Blob>
}

export class InvalidInvestigationFileError extends Error {
  constructor(reason: string) {
    super(`Arquivo de investigação inválido: ${reason}`)
    this.name = 'InvalidInvestigationFileError'
  }
}

class DexieInvestigationRepository implements InvestigationRepository {
  async list(): Promise<InvestigationSummary[]> {
    const rows = await db.investigations.orderBy('updatedAt').reverse().toArray()
    return rows.map((row) => ({
      id: row.document.investigation.id,
      title: row.document.investigation.title,
      caseId: row.document.investigation.caseId,
      updatedAt: row.document.investigation.updatedAt,
      status: row.document.investigation.status,
    }))
  }

  async get(id: string): Promise<Investigation | null> {
    const row = await db.investigations.get(id)
    return row?.document ?? null
  }

  async save(investigation: Investigation): Promise<void> {
    await db.investigations.put({
      id: investigation.investigation.id,
      updatedAt: investigation.investigation.updatedAt,
      document: investigation,
    })
  }

  async delete(id: string): Promise<void> {
    await db.investigations.delete(id)
  }

  async import(data: unknown): Promise<Investigation> {
    const result = investigationSchema.safeParse(data)
    if (!result.success) {
      const reason = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
      throw new InvalidInvestigationFileError(reason)
    }
    const investigation = result.data as Investigation
    await this.save(investigation)
    return investigation
  }

  async export(id: string): Promise<Blob> {
    const investigation = await this.get(id)
    if (!investigation) {
      throw new Error(`Investigação "${id}" não encontrada.`)
    }
    return new Blob([JSON.stringify(investigation, null, 2)], { type: 'application/json' })
  }
}

export function createInvestigationRepository(): InvestigationRepository {
  return new DexieInvestigationRepository()
}
