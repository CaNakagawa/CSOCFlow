import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nProvider } from '../../../shared/i18n'
import * as demoCases from '../../investigation/services/demoCaseService'
import { useInvestigationStore } from '../../investigation/store/investigationStore'
import { CanvasEmptyState } from './CanvasEmptyState'

function renderEmptyState(onImportFile = vi.fn()) {
  return render(
    <I18nProvider>
      <CanvasEmptyState onImportFile={onImportFile} />
    </I18nProvider>,
  )
}

afterEach(() => vi.restoreAllMocks())

describe('CanvasEmptyState', () => {
  it('offers the example, import and a blank start on an empty canvas', () => {
    renderEmptyState()
    expect(screen.getByRole('heading', { name: 'Start an investigation' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open example case' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Import JSON' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start blank' })).toBeInTheDocument()
  })

  it('loads the worked example into the store', async () => {
    const doc = { id: 'demo' } as unknown as Awaited<ReturnType<typeof demoCases.loadDemoCase>>
    vi.spyOn(demoCases, 'loadDemoCase').mockResolvedValue(doc)
    const load = vi.fn()
    useInvestigationStore.setState({ loadInvestigation: load })

    renderEmptyState()
    await userEvent.click(screen.getByRole('button', { name: 'Open example case' }))

    expect(demoCases.loadDemoCase).toHaveBeenCalledWith(demoCases.DEMO_CASES[0])
    expect(load).toHaveBeenCalledWith(doc)
  })

  it('says so when the example cannot be loaded', async () => {
    vi.spyOn(demoCases, 'loadDemoCase').mockRejectedValue(new Error('offline'))
    renderEmptyState()
    await userEvent.click(screen.getByRole('button', { name: 'Open example case' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be loaded')
  })

  it('steps aside when the analyst starts blank', async () => {
    renderEmptyState()
    await userEvent.click(screen.getByRole('button', { name: 'Start blank' }))
    expect(
      screen.queryByRole('heading', { name: 'Start an investigation' }),
    ).not.toBeInTheDocument()
  })
})
