import { useMemo } from 'react'
import { useKnowledgeBase } from '../features/knowledge-base/hooks/useKnowledgeBase'
import { useCorrelation } from '../features/correlation/selectors/useCorrelation'
import { buildLibraryItems } from '../features/canvas/types/libraryItem'
import { NodeLibrary } from '../features/canvas/components/NodeLibrary'
import { Canvas } from '../features/canvas/components/Canvas'
import { TopBar } from './TopBar'
import { RightPanel } from './RightPanel'
import './App.css'

export function App() {
  const { knowledgeBase, loading, error } = useKnowledgeBase()
  useCorrelation(knowledgeBase)

  const libraryItems = useMemo(
    () => (knowledgeBase ? buildLibraryItems(knowledgeBase) : []),
    [knowledgeBase],
  )

  if (loading) {
    return <div className="app-loading">Carregando base de conhecimento...</div>
  }

  if (error) {
    return (
      <div className="app-error">
        <h1>Falha ao carregar a base de conhecimento</h1>
        <p>{error.message}</p>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <TopBar />
      <div className="app-body">
        <NodeLibrary items={libraryItems} />
        <Canvas />
        <RightPanel knowledgeBase={knowledgeBase} />
      </div>
    </div>
  )
}
