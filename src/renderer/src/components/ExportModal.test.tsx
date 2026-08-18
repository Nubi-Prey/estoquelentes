// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExportModal } from './ExportModal'
import { createMockApi } from '@renderer/test/mockApi'

beforeEach(() => {
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
  window.api = createMockApi()
})

describe('ExportModal', () => {
  it('shows an empty message instead of the content when there is nothing to export', async () => {
    render(
      <ExportModal
        trigger={<button>abrir</button>}
        title="Título"
        content=""
        emptyMessage="vazio"
      />
    )

    await userEvent.click(screen.getByText('abrir'))

    expect(screen.getByText('vazio')).toBeInTheDocument()
  })

  it('copies the content to the clipboard', async () => {
    render(<ExportModal trigger={<button>abrir</button>} title="Título" content="linha 1" />)

    await userEvent.click(screen.getByText('abrir'))
    await userEvent.click(screen.getByRole('button', { name: /copiar lista/i }))

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('linha 1')
    expect(await screen.findByText('Copiado!')).toBeInTheDocument()
  })

  it('does not render a download button unless `download` is provided', async () => {
    render(<ExportModal trigger={<button>abrir</button>} title="Título" content="linha 1" />)

    await userEvent.click(screen.getByText('abrir'))

    expect(screen.queryByRole('button', { name: /baixar arquivo/i })).not.toBeInTheDocument()
  })

  it('calls window.api.saveFile with the content and file name when downloading', async () => {
    render(
      <ExportModal
        trigger={<button>abrir</button>}
        title="Título"
        content="linha 1"
        download={{ fileName: 'saida.json', filters: [{ name: 'JSON', extensions: ['json'] }] }}
      />
    )

    await userEvent.click(screen.getByText('abrir'))
    await userEvent.click(screen.getByRole('button', { name: /baixar arquivo/i }))

    expect(window.api.saveFile).toHaveBeenCalledWith({
      content: 'linha 1',
      defaultFileName: 'saida.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    expect(await screen.findByText('Salvo!')).toBeInTheDocument()
  })
})
