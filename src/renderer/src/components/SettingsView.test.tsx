// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsView } from './SettingsView'
import { createMockApi } from '@renderer/test/mockApi'

beforeEach(() => {
  window.api = createMockApi({
    getDataPath: vi.fn().mockResolvedValue({
      userDataPath: '/home/user/.config/estoquelentes',
      dbPath: '/home/user/.config/estoquelentes/estoquelentes.db'
    }),
    backupDatabase: vi.fn().mockResolvedValue({
      success: true,
      filePath: '/home/user/backups/estoquelentes-backup.db'
    }),
    openDataFolder: vi.fn().mockResolvedValue({
      success: true
    })
  })
})

describe('SettingsView', () => {
  it('renders theme and storage sections and displays data paths', async () => {
    render(<SettingsView />)

    expect(screen.getByRole('heading', { name: 'Configurações' })).toBeInTheDocument()
    expect(screen.getByText('Tema')).toBeInTheDocument()
    expect(screen.getByText('Banco de Dados e Armazenamento Local')).toBeInTheDocument()

    expect(
      await screen.findByText('/home/user/.config/estoquelentes/estoquelentes.db')
    ).toBeInTheDocument()
    expect(screen.getByText('/home/user/.config/estoquelentes')).toBeInTheDocument()

    expect(
      screen.getByRole('button', { name: /criar backup do banco de dados/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /abrir pasta de dados locais/i })).toBeInTheDocument()
  })

  it('renders stock import and complete stock export buttons', async () => {
    render(<SettingsView />)

    expect(screen.getByText('Importação e Exportação de Estoque')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /importar estoque/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Estoque completo (JSON)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Estoque completo (SQL)' })).toBeInTheDocument()
  })

  it('triggers database backup and displays success message on confirmation', async () => {
    const user = userEvent.setup()
    render(<SettingsView />)

    const backupButton = screen.getByRole('button', { name: /criar backup do banco de dados/i })
    await user.click(backupButton)

    expect(window.api.backupDatabase).toHaveBeenCalledTimes(1)
    expect(
      await screen.findByText(
        /backup salvo com sucesso em: \/home\/user\/backups\/estoquelentes-backup\.db/i
      )
    ).toBeInTheDocument()
  })

  it('handles backup cancellation without showing error or success', async () => {
    window.api.backupDatabase = vi.fn().mockResolvedValue({
      success: false,
      canceled: true
    })
    const user = userEvent.setup()
    render(<SettingsView />)

    const backupButton = screen.getByRole('button', { name: /criar backup do banco de dados/i })
    await user.click(backupButton)

    expect(window.api.backupDatabase).toHaveBeenCalledTimes(1)
    expect(screen.queryByText(/backup salvo com sucesso/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/erro ao criar backup/i)).not.toBeInTheDocument()
  })

  it('displays error message when database backup fails', async () => {
    window.api.backupDatabase = vi.fn().mockResolvedValue({
      success: false,
      error: 'Disco cheio ou permissão negada'
    })
    const user = userEvent.setup()
    render(<SettingsView />)

    const backupButton = screen.getByRole('button', { name: /criar backup do banco de dados/i })
    await user.click(backupButton)

    expect(window.api.backupDatabase).toHaveBeenCalledTimes(1)
    expect(
      await screen.findByText(/erro ao criar backup: disco cheio ou permissão negada/i)
    ).toBeInTheDocument()
  })

  it('triggers opening the local data folder when clicked', async () => {
    const user = userEvent.setup()
    render(<SettingsView />)

    const openFolderButton = screen.getByRole('button', { name: /abrir pasta de dados locais/i })
    await user.click(openFolderButton)

    expect(window.api.openDataFolder).toHaveBeenCalledTimes(1)
  })

  it('displays error message if opening the data folder fails', async () => {
    window.api.openDataFolder = vi.fn().mockResolvedValue({
      success: false,
      error: 'Gerenciador de arquivos não encontrado'
    })
    const user = userEvent.setup()
    render(<SettingsView />)

    const openFolderButton = screen.getByRole('button', { name: /abrir pasta de dados locais/i })
    await user.click(openFolderButton)

    expect(window.api.openDataFolder).toHaveBeenCalledTimes(1)
    expect(
      await screen.findByText(/erro ao abrir pasta: gerenciador de arquivos não encontrado/i)
    ).toBeInTheDocument()
  })

  it('triggers database restore on confirmation and displays success feedback', async () => {
    window.api.restoreDatabase = vi.fn().mockResolvedValue({
      success: true,
      filePath: '/home/user/backups/restored-backup.db'
    })
    const user = userEvent.setup()
    render(<SettingsView />)

    const restoreTrigger = screen.getByRole('button', { name: /restaurar backup/i })
    await user.click(restoreTrigger)

    // Confirmation dialog appears
    const confirmButton = screen.getByRole('button', { name: /selecionar arquivo e restaurar/i })
    expect(confirmButton).toBeInTheDocument()
    await user.click(confirmButton)

    expect(window.api.restoreDatabase).toHaveBeenCalledTimes(1)
    expect(
      await screen.findByText(
        /backup restaurado com sucesso a partir de: \/home\/user\/backups\/restored-backup\.db/i
      )
    ).toBeInTheDocument()
  })

  it('handles restore cancellation without showing error or success', async () => {
    window.api.restoreDatabase = vi.fn().mockResolvedValue({
      success: false,
      canceled: true
    })
    const user = userEvent.setup()
    render(<SettingsView />)

    const restoreTrigger = screen.getByRole('button', { name: /restaurar backup/i })
    await user.click(restoreTrigger)

    const confirmButton = screen.getByRole('button', { name: /selecionar arquivo e restaurar/i })
    await user.click(confirmButton)

    expect(window.api.restoreDatabase).toHaveBeenCalledTimes(1)
    expect(screen.queryByText(/backup restaurado com sucesso/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/erro ao restaurar backup/i)).not.toBeInTheDocument()
  })

  it('displays error message when database restore fails', async () => {
    window.api.restoreDatabase = vi.fn().mockResolvedValue({
      success: false,
      error: 'Arquivo corrompido ou inválido'
    })
    const user = userEvent.setup()
    render(<SettingsView />)

    const restoreTrigger = screen.getByRole('button', { name: /restaurar backup/i })
    await user.click(restoreTrigger)

    const confirmButton = screen.getByRole('button', { name: /selecionar arquivo e restaurar/i })
    await user.click(confirmButton)

    expect(window.api.restoreDatabase).toHaveBeenCalledTimes(1)
    expect(
      await screen.findByText(/erro ao restaurar backup: arquivo corrompido ou inválido/i)
    ).toBeInTheDocument()
  })
})
