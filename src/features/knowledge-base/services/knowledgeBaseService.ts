import { loadKnowledgeBase } from '../loader/loadKnowledgeBase'
import { createFetchSource } from '../loader/source'
import type { KnowledgeBase } from '../../../shared/types/knowledge'

let cached: Promise<KnowledgeBase> | null = null

export function getKnowledgeBase(): Promise<KnowledgeBase> {
  if (!cached) {
    const source = createFetchSource(`${import.meta.env.BASE_URL}data/`)
    cached = loadKnowledgeBase(source, { validate: import.meta.env.DEV })
  }
  return cached
}
