// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReportView } from './ReportView'
import { createMockApi } from '@renderer/test/mockApi'

beforeEach(() => {
  window.api = createMockApi({
    getAllStock: vi.fn().mockResolvedValue([]),
    getSalesReport: vi.fn().mockResolvedValue({
      monthlySummary: [{ monthKey: '2026-08', totalSold: 15, transactionCount: 6 }],
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
  it('renders sales metrics and top-selling ranking table', async () => {
    render(<ReportView />)

    expect(await screen.findByText('15')).toBeInTheDocument()
    expect(await screen.findByText('6')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Ranking de Lentes Mais Vendidas' })
    ).toBeInTheDocument()
    expect(screen.getByText('+2.00')).toBeInTheDocument()
    expect(screen.getByText('-0.50')).toBeInTheDocument()
    expect(screen.getByText('7 un')).toBeInTheDocument()
  })

  it('renders export buttons and import button', async () => {
    render(<ReportView />)

    expect(await screen.findByRole('button', { name: /importar estoque/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lista de compras' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lista de compras (JSON)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Estoque completo (JSON)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Estoque completo (SQL)' })).toBeInTheDocument()
  })
})
