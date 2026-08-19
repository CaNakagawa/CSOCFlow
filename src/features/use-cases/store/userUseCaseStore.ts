import { create } from 'zustand'
import { db } from '../../investigation/repository/db'
import { parseUseCase, UseCaseImportError } from '../import/parseUseCase'
import type { UseCaseDefinition } from '../../../shared/types/knowledge'

interface UserUseCaseState {
  /** The analyst's own cases, newest first. */
  useCases: UseCaseDefinition[]
  loaded: boolean
  load: () => Promise<void>
  /** Reads a file, keeps it locally, and returns the case it understood. */
  importFile: (file: File, builtInIds: readonly string[]) => Promise<UseCaseDefinition>
  remove: (id: string) => Promise<void>
}

/**
 * Use cases the analyst wrote themselves.
 *
 * They live in this browser and nowhere else — there is no server to send them
 * to, which also means a case written for one team's environment never leaks
 * into someone else's investigation.
 */
export const useUserUseCaseStore = create<UserUseCaseState>((set, get) => ({
  useCases: [],
  loaded: false,

  load: async () => {
    const rows = await db.useCases.orderBy('addedAt').reverse().toArray()
    set({ useCases: rows.map((row) => row.definition), loaded: true })
  },

  importFile: async (file, builtInIds) => {
    const useCase = parseUseCase(await file.text(), { builtInIds })
    // Re-importing a case the analyst already has replaces it: that is an edit.
    await db.useCases.put({
      id: useCase.id,
      addedAt: new Date().toISOString(),
      definition: useCase,
    })
    await get().load()
    return useCase
  },

  remove: async (id) => {
    await db.useCases.delete(id)
    set((state) => ({ useCases: state.useCases.filter((useCase) => useCase.id !== id) }))
  },
}))

export { UseCaseImportError }
