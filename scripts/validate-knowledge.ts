import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { loadKnowledgeBase } from '../src/features/knowledge-base/loader/loadKnowledgeBase'
import type { KnowledgeSource } from '../src/features/knowledge-base/loader/source'

const dataRoot = path.resolve(import.meta.dirname, '../public/data')

function createFsSource(root: string): KnowledgeSource {
  return {
    async readJson(filePath: string): Promise<unknown> {
      const absolute = path.join(root, filePath)
      const contents = await readFile(absolute, 'utf-8')
      return JSON.parse(contents)
    },
  }
}

async function main() {
  const source = createFsSource(dataRoot)
  const knowledgeBase = await loadKnowledgeBase(source, { validate: true })
  console.log(
    `Knowledge base OK: ${knowledgeBase.techniques.length} techniques, ` +
      `${knowledgeBase.evidenceTypes.length} evidence types, ` +
      `${knowledgeBase.hypotheses.length} hypotheses, ` +
      `${knowledgeBase.checks.length} checks, ` +
      `${knowledgeBase.useCases.length} use cases, ` +
      `${knowledgeBase.relationshipRules.length} relationship rules.`,
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
