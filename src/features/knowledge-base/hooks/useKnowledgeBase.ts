import { useEffect, useState } from 'react'
import { getKnowledgeBase } from '../services/knowledgeBaseService'
import type { KnowledgeBase } from '../../../shared/types/knowledge'

export interface KnowledgeBaseState {
  knowledgeBase: KnowledgeBase | null
  loading: boolean
  error: Error | null
}

export function useKnowledgeBase(): KnowledgeBaseState {
  const [state, setState] = useState<KnowledgeBaseState>({
    knowledgeBase: null,
    loading: true,
    error: null,
  })

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

  return state
}
