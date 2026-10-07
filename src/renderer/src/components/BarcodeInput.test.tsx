// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BarcodeInput } from './BarcodeInput'

describe('BarcodeInput', () => {
  it('scans a valid barcode and emits onScan request with delta +1', async () => {
    const onScan = vi.fn()
    render(<BarcodeInput onScan={onScan} />)

    const input = screen.getByLabelText('Código de barras')
    fireEvent.change(input, { target: { value: '000114250050' } })
    fireEvent.submit(input.closest('form')!)

    expect(onScan).toHaveBeenCalledWith({
      category: 'positive',
      sphereHundredths: 425,
      cylinderHundredths: -50,
      delta: 1,
      source: 'barcode'
    })
  })

  it('switches to subtraction mode when clicking the toggle button', async () => {
    const onScan = vi.fn()
    render(<BarcodeInput onScan={onScan} />)

    const toggleBtn = screen.getByRole('button', { name: /modo leitura/i })
    await userEvent.click(toggleBtn)

    const input = screen.getByLabelText('Código de barras')
    fireEvent.change(input, { target: { value: '000114250050' } })
    fireEvent.submit(input.closest('form')!)

    expect(onScan).toHaveBeenCalledWith(
      expect.objectContaining({
        delta: -1,
        source: 'barcode'
      })
    )
  })

  it('shows error message on invalid barcode and does not emit onScan', () => {
    const onScan = vi.fn()
    render(<BarcodeInput onScan={onScan} />)

    const input = screen.getByLabelText('Código de barras')
    fireEvent.change(input, { target: { value: 'invalid123' } })
    fireEvent.submit(input.closest('form')!)

    expect(onScan).not.toHaveBeenCalled()
    expect(screen.getByText(/Código de barras inválido/i)).toBeInTheDocument()
  })

  it('focuses the input element when F2 key is pressed', () => {
    render(<BarcodeInput onScan={vi.fn()} />)
    const input = screen.getByLabelText('Código de barras')

    expect(document.activeElement).not.toBe(input)
    fireEvent.keyDown(window, { key: 'F2' })
    expect(document.activeElement).toBe(input)
  })
})
