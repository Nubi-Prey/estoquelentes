// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ImportModal } from './ImportModal'
import { createMockApi } from '@renderer/test/mockApi'

beforeEach(() => {
  window.api = createMockApi()
})

describe('ImportModal', () => {
  it('opens modal, validates pasted JSON, and calls window.api.importStock', async () => {
    const onSuccess = vi.fn()
    window.api.importStock = vi.fn().mockResolvedValue({ success: true, importedCount: 1 })

    render(<ImportModal onSuccess={onSuccess} />)

    await userEvent.click(screen.getByRole('button', { name: /importar estoque/i }))
    expect(screen.getByRole('heading', { name: 'Importar estoque' })).toBeInTheDocument()

    const textarea = screen.getByLabelText(/ou cole o conteúdo/i)
    fireEvent.change(textarea, {
      target: { value: '[{"sphere":0.25,"cylinder":-0.5,"quantity":2}]' }
    })

    expect(screen.getByText(/1 lente\(s\) identificada\(s\)/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Confirmar importação' }))

    expect(window.api.importStock).toHaveBeenCalledWith({
      items: [
        {
          category: 'positive',
          sphereHundredths: 25,
          cylinderHundredths: -50,
          quantity: 2
        }
      ],
      mode: 'merge'
    })
  })

  it('allows switching to replace mode and passes mode replace to API', async () => {
    window.api.importStock = vi.fn().mockResolvedValue({ success: true, importedCount: 1 })

    render(<ImportModal />)

    await userEvent.click(screen.getByRole('button', { name: /importar estoque/i }))

    const textarea = screen.getByLabelText(/ou cole o conteúdo/i)
    fireEvent.change(textarea, {
      target: { value: '[{"sphere":1,"cylinder":0,"quantity":3}]' }
    })

    // Click "Substituir estoque" mode button
    await userEvent.click(screen.getByRole('button', { name: 'Substituir estoque' }))

    // Click submit button
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar importação' }))

    expect(window.api.importStock).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'replace'
      })
    )
  })

  it('shows error when invalid JSON or invalid diopter step is provided', async () => {
    render(<ImportModal />)

    await userEvent.click(screen.getByRole('button', { name: /importar estoque/i }))

    const textarea = screen.getByLabelText(/ou cole o conteúdo/i)
    fireEvent.change(textarea, {
      target: { value: '[{"sphere":0.13,"cylinder":0,"quantity":1}]' }
    })

    expect(screen.getByText(/não é múltiplo de 0.25/i)).toBeInTheDocument()
  })
})
