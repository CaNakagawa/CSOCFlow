import type { HypothesisCondition } from '../../../shared/types/knowledge'
import type { CanvasNodeType, NodeState } from '../../../shared/types/investigation'
import { nodesOfType, resolveFact, type EngineContext } from './facts'

function isGraphOperator(operator: HypothesisCondition['operator']): boolean {
  return (
    operator === 'node_count_greater_than' ||
    operator === 'state_equals' ||
    operator === 'has_relationship' ||
    operator === 'matches_any_selected_node'
  )
}

function evaluateGraphOperator(
  condition: HypothesisCondition,
  ctx: EngineContext,
): { satisfied: boolean; actualValue: unknown } {
  switch (condition.operator) {
    case 'node_count_greater_than': {
      const count = nodesOfType(ctx, condition.fact as CanvasNodeType).length
      return { satisfied: count > Number(condition.value ?? 0), actualValue: count }
    }
    case 'state_equals': {
      const matches = nodesOfType(ctx, condition.fact as CanvasNodeType).filter(
        (n) => n.state === (condition.value as NodeState),
      )
      return { satisfied: matches.length > 0, actualValue: matches.map((n) => n.state) }
    }
    case 'has_relationship': {
      const matches = ctx.edges.filter((e) => e.type === condition.value)
      return { satisfied: matches.length > 0, actualValue: matches.length }
    }
    case 'matches_any_selected_node': {
      const matches = nodesOfType(ctx, condition.fact as CanvasNodeType)
      return { satisfied: matches.length > 0, actualValue: matches.length }
    }
    default:
      return { satisfied: false, actualValue: undefined }
  }
}

export function evaluateCondition(
  condition: HypothesisCondition,
  ctx: EngineContext,
): { satisfied: boolean; actualValue: unknown } {
  if (isGraphOperator(condition.operator)) {
    return evaluateGraphOperator(condition, ctx)
  }

  const actualValue = resolveFact(condition.fact, ctx)
  const expected = condition.value

  switch (condition.operator) {
    case 'equals':
      return { satisfied: actualValue === expected, actualValue }
    case 'not_equals':
      return { satisfied: actualValue !== expected, actualValue }
    case 'contains':
      return {
        satisfied:
          typeof actualValue === 'string' &&
          typeof expected === 'string' &&
          actualValue.includes(expected),
        actualValue,
      }
    case 'not_contains':
      return {
        satisfied: !(
          typeof actualValue === 'string' &&
          typeof expected === 'string' &&
          actualValue.includes(expected)
        ),
        actualValue,
      }
    case 'in':
      return { satisfied: Array.isArray(expected) && expected.includes(actualValue), actualValue }
    case 'not_in':
      return {
        satisfied: !(Array.isArray(expected) && expected.includes(actualValue)),
        actualValue,
      }
    case 'exists':
      return { satisfied: actualValue !== undefined && actualValue !== null, actualValue }
    case 'not_exists':
      return { satisfied: actualValue === undefined || actualValue === null, actualValue }
    case 'greater_than':
      return {
        satisfied: typeof actualValue === 'number' && actualValue > Number(expected),
        actualValue,
      }
    case 'greater_than_or_equal':
      return {
        satisfied: typeof actualValue === 'number' && actualValue >= Number(expected),
        actualValue,
      }
    case 'less_than':
      return {
        satisfied: typeof actualValue === 'number' && actualValue < Number(expected),
        actualValue,
      }
    case 'less_than_or_equal':
      return {
        satisfied: typeof actualValue === 'number' && actualValue <= Number(expected),
        actualValue,
      }
    default:
      return { satisfied: false, actualValue }
  }
}
