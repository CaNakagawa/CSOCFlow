import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nProvider } from '../../../shared/i18n'
import { DEFAULT_SCORE_VIEW } from '../../canvas/utils/scoreView'
import { useInvestigationStore } from '../store/investigationStore'
import { NavigatorPanel } from './NavigatorPanel'
import type { InvestigationNode } from '../../../shared/types/investigation'

function card(definitionId: string, navigatorScore: number, color: string): InvestigationNode {
  return {
    id: `n-${definitionId}`,
    definitionId,
    type: 'mitre_technique',
    label: definitionId,
    state: 'unknown',
    position: { x: 0, y: 0 },
    fields: {},
    color,
    navigatorScore,
    createdAt: '',
    updatedAt: '',
  }
}

function renderPanel() {
  return render(
    <I18nProvider>
      <NavigatorPanel knowledgeBase={null} />
    </I18nProvider>,
  )
}

/** The technique ids in the table, top to bottom. */
function listed(): string[] {
  const body = screen.getAllByRole('rowgroup')[1]
  return within(body)
    .getAllByRole('row')
    .map((row) => within(row).getAllByRole('cell')[0].textContent ?? '')
}

beforeEach(() => {
  useInvestigationStore.setState({
    nodes: [
      card('T1003', 4, '#ff7a66'),
      card('T1059.001', 26, '#8ec843'),
      card('T1078', 16, '#c0d555'),
      card('T1105', 25, '#8fc843'),
    ],
    heatScale: { colors: ['#ff6666', '#ffe766', '#8ec843'], min: 1, max: 26 },
    scoreView: DEFAULT_SCORE_VIEW,
    selectedNodeId: null,
  })
})

describe('NavigatorPanel', () => {
  it('says what to do while no layer has been imported', () => {
    useInvestigationStore.setState({ nodes: [] })
    renderPanel()
    expect(screen.getByText(/Import an ATT&CK Navigator layer/)).toBeInTheDocument()
  })

  it('lists the scored techniques in MITRE order to begin with', () => {
    renderPanel()
    expect(listed()).toEqual(['T1003', 'T1059.001', 'T1078', 'T1105'])
    expect(screen.getByText('Showing 4 of 4 techniques.')).toBeInTheDocument()
  })

  it('orders by score, highest first, when asked', async () => {
    renderPanel()
    await userEvent.selectOptions(screen.getByLabelText('Order by'), 'score')
    await userEvent.selectOptions(screen.getByLabelText('Direction'), 'desc')
    expect(listed()).toEqual(['T1059.001', 'T1105', 'T1078', 'T1003'])
  })

  it('orders by score, lowest first, when ascending', async () => {
    renderPanel()
    await userEvent.selectOptions(screen.getByLabelText('Order by'), 'score')
    expect(listed()).toEqual(['T1003', 'T1078', 'T1105', 'T1059.001'])
  })

  it('narrows the list to the score range typed in', async () => {
    renderPanel()
    await userEvent.type(screen.getByLabelText('From'), '16')
    await userEvent.type(screen.getByLabelText('To'), '25')
    expect(listed()).toEqual(['T1078', 'T1105'])
    expect(screen.getByText('Showing 2 of 4 techniques.')).toBeInTheDocument()
    expect(useInvestigationStore.getState().scoreView).toMatchObject({ min: 16, max: 25 })
  })

  it('warns when the lowest score is above the highest', async () => {
    renderPanel()
    await userEvent.type(screen.getByLabelText('From'), '20')
    await userEvent.type(screen.getByLabelText('To'), '5')
    expect(screen.getByRole('alert')).toHaveTextContent('above the highest')
    expect(screen.getByText('No technique has a score in this range.')).toBeInTheDocument()
  })

  it('clears the filter and goes back to MITRE order', async () => {
    renderPanel()
    await userEvent.type(screen.getByLabelText('From'), '16')
    await userEvent.selectOptions(screen.getByLabelText('Order by'), 'score')
    await userEvent.click(screen.getByRole('button', { name: 'Clear filter' }))
    expect(useInvestigationStore.getState().scoreView).toEqual(DEFAULT_SCORE_VIEW)
    expect(listed()).toEqual(['T1003', 'T1059.001', 'T1078', 'T1105'])
  })

  it('selects the card on the canvas when a row is clicked', async () => {
    renderPanel()
    await userEvent.click(screen.getByRole('button', { name: 'T1078' }))
    expect(useInvestigationStore.getState().selectedNodeId).toBe('n-T1078')
  })
})
