// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MatrixCell } from './MatrixCell'
import type { StockVariant } from '@shared/ipc'

const variant: StockVariant = {
  id: 1,
  category: 'positive',
  sphereHundredths: 0,
  cylinderHundredths: 0,
  quantity: 3,
  createdAt: 0,
  updatedAt: 0
}

describe('MatrixCell', () => {
  it('shows a dash placeholder for an empty cell in view mode', () => {
    render(<MatrixCell variant={undefined} editMode={false} onAdjust={vi.fn()} />)

    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('renders quantity read-only in view mode, without +/- controls', () => {
    render(<MatrixCell variant={variant} editMode={false} onAdjust={vi.fn()} />)

    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('creates a variant by clicking the empty-cell "+" in edit mode', async () => {
    const onAdjust = vi.fn()
    render(<MatrixCell variant={undefined} editMode={true} onAdjust={onAdjust} />)

    await userEvent.click(screen.getByRole('button', { name: 'Adicionar lente nesta célula' }))

    expect(onAdjust).toHaveBeenCalledWith(1)
  })

  it('increments and decrements an existing quantity in edit mode', async () => {
    const onAdjust = vi.fn()
    render(<MatrixCell variant={variant} editMode={true} onAdjust={onAdjust} />)

    await userEvent.click(screen.getByRole('button', { name: 'Adicionar uma unidade' }))
    await userEvent.click(screen.getByRole('button', { name: 'Remover uma unidade' }))

    expect(onAdjust).toHaveBeenNthCalledWith(1, 1)
    expect(onAdjust).toHaveBeenNthCalledWith(2, -1)
  })

  it('disables the decrement button at zero quantity', () => {
    render(<MatrixCell variant={{ ...variant, quantity: 0 }} editMode={true} onAdjust={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Remover uma unidade' })).toBeDisabled()
  })

  it('colors the quantity by stock status: out of stock, below target, at target', () => {
    const { rerender } = render(
      <MatrixCell variant={{ ...variant, quantity: 0 }} editMode={false} onAdjust={vi.fn()} />
    )
    expect(screen.getByText('0')).toHaveClass('text-red-600')

    rerender(
      <MatrixCell variant={{ ...variant, quantity: 1 }} editMode={false} onAdjust={vi.fn()} />
    )
    expect(screen.getByText('1')).toHaveClass('text-amber-600')

    rerender(
      <MatrixCell variant={{ ...variant, quantity: 3 }} editMode={false} onAdjust={vi.fn()} />
    )
    expect(screen.getByText('3')).toHaveClass('text-emerald-600')
  })
})
