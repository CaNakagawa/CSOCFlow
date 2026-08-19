import { useEffect, useMemo, useState } from 'react'
import { getKnowledgeBase } from '../services/knowledgeBaseService'
import { useUserUseCaseStore } from '../../use-cases/store/userUseCaseStore'
import type { KnowledgeBase } from '../../../shared/types/knowledge'

export interface KnowledgeBaseState {
  knowledgeBase: KnowledgeBase | null
  loading: boolean
  error: Error | null
}

export function useKnowledgeBase(): KnowledgeBaseState {
  const [state, setState] = useState<{
    knowledgeBase: KnowledgeBase | null
    loading: boolean
    error: Error | null
  }>({
    knowledgeBase: null,
    loading: true,
    error: null,
  })

  const userUseCases = useUserUseCaseStore((s) => s.useCases)
  const loadUserUseCases = useUserUseCaseStore((s) => s.load)

  useEffect(() => {
    let cancelled = false
    getKnowledgeBase()
      .then((knowledgeBase) => {
        if (!cancelled) setState({ knowledgeBase, loading: false, error: null })
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            knowledgeBase: null,
            loading: false,
            error: error instanceof Error ? error : new Error(String(error)),
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    void loadUserUseCases()
  }, [loadUserUseCases])

  /*
   * The analyst's own cases join the base itself, so the library, the
   * suggestions and the correlation engine all see them without knowing where
   * they came from. The loaded base is shared and cached, so it is copied
   * rather than added to.
   */
  const knowledgeBase = useMemo(() => {
    if (!state.knowledgeBase) return null
    if (userUseCases.length === 0) return state.knowledgeBase
    return { ...state.knowledgeBase, useCases: [...state.knowledgeBase.useCases, ...userUseCases] }
  }, [state.knowledgeBase, userUseCases])

  return { knowledgeBase, loading: state.loading, error: state.error }
}
