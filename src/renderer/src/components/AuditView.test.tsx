// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { AuditView } from './AuditView'
import { createMockApi } from '@renderer/test/mockApi'
import type { StockHistoryEntry } from '@shared/ipc'

const mockEntries: StockHistoryEntry[] = [
  {
    id: 1,
    category: 'positive',
    sphereHundredths: 100,
    cylinderHundredths: -50,
    delta: 5,
    resultingQuantity: 5,
    source: 'manual',
    createdAt: new Date(2026, 9, 21, 10, 0).getTime() // 2026-10-21
  },
  {
    id: 2,
    category: 'positive',
    sphereHundredths: 200,
    cylinderHundredths: 0,
    delta: -2,
    resultingQuantity: 3,
    source: 'manual',
    createdAt: new Date(2026, 7, 15, 14, 0).getTime() // 2026-08-15
  }
]

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(new Date(2026, 9, 21, 12, 0))
  window.api = createMockApi({
    getStockHistory: vi.fn().mockResolvedValue(mockEntries),
    rollbackDay: vi.fn().mockResolvedValue(undefined)
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('AuditView', () => {
  it('renders days and allows searching by day and month', async () => {
    render(<AuditView />)

    // Wait for history to load
    expect(await screen.findByText(/Registro de auditoria/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Pesquisar por dia ou mês/i)).toBeInTheDocument()

    // Both days are visible initially
    expect(screen.getByText(/Hoje/)).toBeInTheDocument()
    expect(screen.getByText(/15 de agosto de 2026/)).toBeInTheDocument()

    // Search by month name
    const searchInput = screen.getByRole('textbox', { name: /Pesquisar histórico por mês ou dia/i })
    fireEvent.change(searchInput, { target: { value: 'agosto' } })

    expect(screen.queryByText(/Hoje/)).not.toBeInTheDocument()
    expect(screen.getByText(/15 de agosto de 2026/)).toBeInTheDocument()
    expect(screen.getByText(/Exibindo 1 dia para "agosto"/i)).toBeInTheDocument()

    // Search for non-existent day
    fireEvent.change(searchInput, { target: { value: 'dezembro' } })
    expect(screen.getByText(/Nenhuma alteração encontrada para "dezembro"/i)).toBeInTheDocument()

    // Click clear search
    const clearBtn = screen.getByRole('button', { name: /Limpar pesquisa/i })
    fireEvent.click(clearBtn)
    expect(screen.getByText(/Hoje/)).toBeInTheDocument()
    expect(screen.getByText(/15 de agosto de 2026/)).toBeInTheDocument()
  })
})
