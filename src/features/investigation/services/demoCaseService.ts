import type { Investigation } from '../../../shared/types/investigation'
import { investigationSchema } from '../repository/investigationZodSchema'

export interface DemoCase {
  id: string
  title: string
  path: string
}

export const DEMO_CASES: DemoCase[] = [
  { id: 'ssh-brute-force', title: 'SSH Brute Force', path: 'demo-cases/ssh-brute-force.json' },
]

export async function loadDemoCase(demoCase: DemoCase): Promise<Investigation> {
  const url = new URL(
    `data/${demoCase.path}`,
    `${window.location.origin}${import.meta.env.BASE_URL}`,
  ).toString()
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(
      `Falha ao carregar caso de demonstração "${demoCase.title}" (HTTP ${response.status}).`,
    )
  }
  const raw: unknown = await response.json()
  return investigationSchema.parse(raw) as Investigation
}
