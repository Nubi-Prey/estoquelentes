// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ReportView } from './ReportView'
import { createMockApi } from '@renderer/test/mockApi'

beforeEach(() => {
  window.api = createMockApi({
    getAllStock: vi.fn().mockResolvedValue([]),
    getSalesReport: vi.fn().mockResolvedValue({
      monthlySummary: [
        { monthKey: '2026-08', totalSold: 15, totalAdded: 25, transactionCount: 6 },
        { monthKey: '2025-05', totalSold: 10, totalAdded: 12, transactionCount: 4 }
      ],
      topSellers: [
        {
          category: 'positive',
          sphereHundredths: 200,
          cylinderHundredths: -50,
          totalSold: 7
        }
      ]
    })
  })
})

describe('ReportView', () => {
  it('renders sales metrics (sold and added) and top-selling ranking table', async () => {
    render(<ReportView />)

    // Total sold: 15 + 10 = 25
    expect(await screen.findByText('25')).toBeInTheDocument()
    // Total added: 25 + 12 = 37
    expect(await screen.findByText('37')).toBeInTheDocument()
    expect(screen.getByText('Entradas')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Ranking de Lentes Mais Vendidas' })
    ).toBeInTheDocument()
    expect(screen.getByText('+2.00')).toBeInTheDocument()
    expect(screen.getByText('-0.50')).toBeInTheDocument()
    expect(screen.getByText('7 un')).toBeInTheDocument()
  })

  it('filters periods by date using the dd/mm/aaaa date selector', async () => {
    render(<ReportView />)

    expect(await screen.findByText('Entradas')).toBeInTheDocument()

    const dateInput = screen.getByLabelText('Selecionar data')
    expect(dateInput).toBeInTheDocument()

    // Filter by specific day (2026-10-21)
    fireEvent.change(dateInput, { target: { value: '2026-10-21' } })
    expect(window.api.getSalesReport).toHaveBeenCalledWith({ periodKey: '2026-10-21' })
    expect(screen.getByText(/21\/10\/2026/)).toBeInTheDocument()

    // Add end date
    const addEndBtn = screen.getByRole('button', { name: /\+ Até outra data/i })
    fireEvent.click(addEndBtn)

    const endDateInput = screen.getByLabelText('Data final')
    fireEvent.change(endDateInput, { target: { value: '2026-10-25' } })
    expect(window.api.getSalesReport).toHaveBeenCalledWith({
      startDate: '2026-10-21',
      endDate: '2026-10-25'
    })
    expect(screen.getByText(/21\/10\/2026 a 25\/10\/2026/)).toBeInTheDocument()

    // Clear filter
    const clearBtn = screen.getByRole('button', { name: 'Limpar filtro de data' })
    fireEvent.click(clearBtn)
    expect(screen.getByText(/todos os períodos/)).toBeInTheDocument()
  })

  it('renders shopping list exports and allows adjusting the stock target directly in the report', async () => {
    render(<ReportView />)

    expect(await screen.findByRole('heading', { name: 'Lista de Compras' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lista de compras (Texto)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lista de compras (JSON)' })).toBeInTheDocument()

    // Ensure import and full-stock exports are no longer in ReportView
    expect(screen.queryByRole('button', { name: /importar estoque/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /estoque completo/i })).not.toBeInTheDocument()

    // Stock target input is present and adjustable
    const targetInput = screen.getByLabelText('Meta de estoque')
    expect(targetInput).toBeInTheDocument()
    fireEvent.change(targetInput, { target: { value: '5' } })
    expect(targetInput).toHaveValue(5)
  })
})
