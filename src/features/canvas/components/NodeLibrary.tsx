import { useMemo, useState } from 'react'
import Fuse from 'fuse.js'
import type { LibraryItem } from '../types/libraryItem'
import { useInvestigationStore } from '../../investigation/store/investigationStore'
import './NodeLibrary.css'

interface NodeLibraryProps {
  items: LibraryItem[]
}

function nextPosition(nodeCount: number): { x: number; y: number } {
  const column = nodeCount % 5
  const row = Math.floor(nodeCount / 5)
  return { x: 80 + column * 200, y: 80 + row * 140 }
}

export function NodeLibrary({ items }: NodeLibraryProps) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('all')
  const addNode = useInvestigationStore((s) => s.addNode)
  const nodeCount = useInvestigationStore((s) => s.nodes.length)

  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.category))
    return ['all', ...Array.from(set).sort()]
  }, [items])

  const fuse = useMemo(
    () => new Fuse(items, { keys: ['label', 'brief', 'category'], threshold: 0.35 }),
    [items],
  )

  const filtered = useMemo(() => {
    let base = category === 'all' ? items : items.filter((i) => i.category === category)
    if (query.trim()) {
      const matchedIds = new Set(fuse.search(query).map((r) => r.item.definitionId))
      base = base.filter((i) => matchedIds.has(i.definitionId))
    }
    return base
  }, [items, category, query, fuse])

  return (
    <aside className="node-library" aria-label="Biblioteca de elementos investigativos">
      <h2 className="node-library__title">Biblioteca</h2>
      <input
        type="search"
        className="node-library__search"
        placeholder="Buscar técnica, evidência..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Buscar na biblioteca"
      />
      <select
        className="node-library__filter"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        aria-label="Filtrar por categoria"
      >
        {categories.map((c) => (
          <option key={c} value={c}>
            {c === 'all' ? 'Todas as categorias' : c}
          </option>
        ))}
      </select>
      <ul className="node-library__list">
        {filtered.map((item) => (
          <li key={item.definitionId}>
            <button
              type="button"
              className="node-library__item"
              title={item.brief}
              onClick={() =>
                addNode({
                  nodeType: item.nodeType,
                  definitionId: item.definitionId,
                  label: item.label,
                  position: nextPosition(nodeCount),
                  fieldDefinitions: item.fieldDefinitions,
                })
              }
            >
              <span className="node-library__item-category">{item.category}</span>
              <span className="node-library__item-label">{item.label}</span>
            </button>
          </li>
        ))}
        {filtered.length === 0 && <li className="node-library__empty">Nenhum item encontrado.</li>}
      </ul>
    </aside>
  )
}
