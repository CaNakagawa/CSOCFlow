import { useEffect, useMemo, useRef } from 'react'
import { createCorrelationEngine } from '../engine/CorrelationEngine'
import { useInvestigationStore } from '../../investigation/store/investigationStore'
import type { KnowledgeBase } from '../../../shared/types/knowledge'
import { useI18n } from '../../../shared/i18n'

const DEBOUNCE_MS = 150

export function useCorrelation(knowledgeBase: KnowledgeBase | null): void {
  const { locale } = useI18n()
  const nodes = useInvestigationStore((s) => s.nodes)
  const manualEdges = useInvestigationStore((s) => s.manualEdges)
  const checkAnswers = useInvestigationStore((s) => s.checkAnswers)
  const autoLinkTactics = useInvestigationStore((s) => s.autoLinkTactics)
  const setInferredEdges = useInvestigationStore((s) => s.setInferredEdges)
  const setHypothesisResults = useInvestigationStore((s) => s.setHypothesisResults)
  const setUseCaseSuggestions = useInvestigationStore((s) => s.setUseCaseSuggestions)

  const engine = useMemo(() => createCorrelationEngine(), [])
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!knowledgeBase) return

    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      const result = engine.evaluate({
        nodes,
        edges: manualEdges,
        knowledgeBase,
        checkAnswers,
        locale,
        autoLinkTactics,
      })
      setInferredEdges(result.inferredEdges)
      setHypothesisResults(result.hypotheses)
      setUseCaseSuggestions(result.useCaseSuggestions)
    }, DEBOUNCE_MS)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [
    knowledgeBase,
    nodes,
    manualEdges,
    checkAnswers,
    locale,
    autoLinkTactics,
    engine,
    setInferredEdges,
    setHypothesisResults,
    setUseCaseSuggestions,
  ])
}
