import type {
  InvestigationEdge,
  InvestigationNode,
  CanvasNodeType,
} from '../../../shared/types/investigation'

export interface EngineContext {
  nodes: InvestigationNode[]
  edges: InvestigationEdge[]
}

const SCOPE_TO_NODE_TYPE: Record<string, CanvasNodeType> = {
  authentication: 'authentication_event',
  source: 'ip_address',
  process: 'process',
  command: 'command_line',
  user: 'user',
  host: 'host',
  file: 'file',
  network: 'network_connection',
  alert: 'alert',
  email: 'email',
}

export function nodesOfType(ctx: EngineContext, type: CanvasNodeType): InvestigationNode[] {
  return ctx.nodes.filter(
    (n) => n.type === type && n.state !== 'discarded' && n.state !== 'false_positive',
  )
}

function fieldValues(ctx: EngineContext, nodeType: CanvasNodeType, field: string): unknown[] {
  return nodesOfType(ctx, nodeType)
    .map((n) => n.fields[field])
    .filter((v) => v !== undefined && v !== null)
}

function firstNodeField(ctx: EngineContext, nodeType: CanvasNodeType, field: string): unknown {
  const values = fieldValues(ctx, nodeType, field)
  return values.length > 0 ? values[0] : undefined
}

function sumNodeField(
  ctx: EngineContext,
  nodeType: CanvasNodeType,
  field: string,
): number | undefined {
  const values = fieldValues(ctx, nodeType, field).filter((v): v is number => typeof v === 'number')
  if (values.length === 0) return undefined
  return values.reduce((acc, v) => acc + v, 0)
}

function countDistinctField(ctx: EngineContext, nodeType: CanvasNodeType, field: string): number {
  const values = fieldValues(ctx, nodeType, field).map((v) => String(v))
  return new Set(values).size
}

function hasSuccessAfterFailures(ctx: EngineContext): boolean {
  const events = nodesOfType(ctx, 'authentication_event')
  const failures = events.filter((e) => e.fields.result === 'failed')
  const successes = events.filter((e) => e.fields.result === 'success')
  if (failures.length === 0 || successes.length === 0) return false

  const latestFailureTime = failures
    .map((e) => (typeof e.fields.timestamp === 'string' ? Date.parse(e.fields.timestamp) : NaN))
    .filter((t) => !Number.isNaN(t))
  const earliestSuccessTime = successes
    .map((e) => (typeof e.fields.timestamp === 'string' ? Date.parse(e.fields.timestamp) : NaN))
    .filter((t) => !Number.isNaN(t))

  if (latestFailureTime.length === 0 || earliestSuccessTime.length === 0) {
    // Timestamps not available on both sides: fall back to presence of both event kinds.
    return true
  }
  return Math.min(...earliestSuccessTime) >= Math.min(...latestFailureTime)
}

type FactResolver = (ctx: EngineContext) => unknown

const CUSTOM_FACTS: Record<string, FactResolver> = {
  'authentication.protocol': (ctx) => firstNodeField(ctx, 'authentication_event', 'protocol'),
  'authentication.failed_attempts': (ctx) =>
    sumNodeField(ctx, 'authentication_event', 'failed_attempts'),
  'authentication.success_after_failures': (ctx) => hasSuccessAfterFailures(ctx),
  'source.unique_ip_count': (ctx) => countDistinctField(ctx, 'authentication_event', 'source_ip'),
  'source.ip_reputation': (ctx) => firstNodeField(ctx, 'ip_address', 'reputation'),
  'source.ip_is_approved_scanner': (ctx) =>
    firstNodeField(ctx, 'ip_address', 'is_approved_scanner'),
}

export function resolveFact(fact: string, ctx: EngineContext): unknown {
  const customResolver = CUSTOM_FACTS[fact]
  if (customResolver) return customResolver(ctx)

  const [scope, ...rest] = fact.split('.')
  const field = rest.join('.')
  const nodeType = SCOPE_TO_NODE_TYPE[scope]
  if (!nodeType || !field) return undefined
  return firstNodeField(ctx, nodeType, field)
}
