import type { MitreTactic } from '../types/knowledge'

/**
 * Orders tactic ids the way MITRE lays the matrix out, left to right.
 *
 * Sorting by id would be wrong: the ids are not sequential in matrix order —
 * TA0043 Reconnaissance comes first while TA0001 Initial Access is third. The
 * canonical sequence is the position within the matrix, which is the order the
 * importer writes `mitre/tactics.json` in.
 *
 * Gaps are fine: a subset such as Persistence + Impact keeps its relative
 * matrix order. Ids the knowledge base doesn't know are kept at the end in
 * their original order rather than dropped.
 */
export function sortTacticIds(tacticIds: string[], tactics: MitreTactic[]): string[] {
  const position = new Map(tactics.map((tactic, index) => [tactic.id, index]))

  return [...tacticIds].sort((a, b) => {
    const positionA = position.get(a)
    const positionB = position.get(b)
    if (positionA === undefined && positionB === undefined) return 0
    if (positionA === undefined) return 1
    if (positionB === undefined) return -1
    return positionA - positionB
  })
}
