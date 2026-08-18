// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuditDayCard } from './AuditDayCard'
import { groupHistoryByDay } from '@renderer/lib/auditLog'
import type { StockHistoryEntry } from '@shared/ipc'

const entries: StockHistoryEntry[] = [
  {
    id: 1,
    category: 'positive',
    sphereHundredths: 425,
    cylinderHundredths: -50,
    delta: 2,
    resultingQuantity: 2,
    source: 'manual',
    createdAt: new Date(2026, 7, 18, 10, 0).getTime()
  },
  {
    id: 2,
    category: 'positive',
    sphereHundredths: 425,
    cylinderHundredths: -50,
    delta: -1,
    resultingQuantity: 1,
    source: 'manual',
    createdAt: new Date(2026, 7, 18, 11, 0).getTime()
  }
]

const day = groupHistoryByDay(entries)[0]

describe('AuditDayCard', () => {
  it('shows the net movement line and one row per entry, colored by action', () => {
    render(<AuditDayCard day={day} onRollback={vi.fn()} />)

    expect(
      screen.getByText('Movimento total: +1 lentes (Adicionado: 2, Removido: 1)')
    ).toBeInTheDocument()
    expect(screen.getAllByText(/Lente ESF: \+4\.25, CIL: -0\.50/)).toHaveLength(2)
    expect(screen.getByText('Adicionado')).toHaveClass('text-emerald-600')
    expect(screen.getByText('Removido')).toHaveClass('text-red-600')
  })

  it('only calls onRollback after the confirmation dialog is accepted', async () => {
    const onRollback = vi.fn()
    render(<AuditDayCard day={day} onRollback={onRollback} />)

    await userEvent.click(screen.getByRole('button', { name: /rollback/i }))
    expect(onRollback).not.toHaveBeenCalled()

    expect(screen.getByText(/Isso reverte 2 alteração/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Desfazer alterações' }))
    expect(onRollback).toHaveBeenCalledWith(day)
  })

  it('does not roll back when the confirmation is cancelled', async () => {
    const onRollback = vi.fn()
    render(<AuditDayCard day={day} onRollback={onRollback} />)

    await userEvent.click(screen.getByRole('button', { name: /rollback/i }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onRollback).not.toHaveBeenCalled()
  })
})
