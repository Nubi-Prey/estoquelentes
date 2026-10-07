/* eslint-disable @typescript-eslint/no-require-imports */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Electron Environment & Binary Smoke Test', () => {
  it('has node_modules/electron/path.txt pointing to a valid executable binary', () => {
    const electronModuleDir = path.resolve(__dirname, '../../node_modules/electron')
    const pathFile = path.join(electronModuleDir, 'path.txt')

    expect(fs.existsSync(pathFile)).toBe(true)

    const binaryRelative = fs.readFileSync(pathFile, 'utf-8').trim()
    expect(binaryRelative.length).toBeGreaterThan(0)

    const fullBinaryPath = path.join(electronModuleDir, 'dist', binaryRelative)
    expect(fs.existsSync(fullBinaryPath)).toBe(true)

    // Check executable permission
    expect(() => fs.accessSync(fullBinaryPath, fs.constants.X_OK)).not.toThrow()
  })

  it('runs the real Electron binary and reports the expected version (v43.4.0)', () => {
    const electronPath = require('electron') as string
    expect(typeof electronPath).toBe('string')
    expect(fs.existsSync(electronPath)).toBe(true)

    const result = spawnSync(electronPath, ['--version', '--no-sandbox'], {
      encoding: 'utf-8',
      timeout: 10000
    })

    expect(result.status).toBe(0)
    expect(result.stdout.trim()).toMatch(/^v43\./)
  })

  it('boots a real Electron process, triggers app.whenReady, creates a window, and exits cleanly', () => {
    const electronPath = require('electron') as string
    const tmpScript = path.resolve(__dirname, '../../node_modules/.tmp-electron-smoke.js')

    const scriptCode = `
      const { app, BrowserWindow } = require('electron');
      app.whenReady().then(() => {
        const win = new BrowserWindow({ show: false, webPreferences: { sandbox: false } });
        win.loadURL('about:blank').then(() => {
          console.log('SMOKE_LIFECYCLE_SUCCESS');
          app.quit();
        });
      });
    `

    fs.writeFileSync(tmpScript, scriptCode, 'utf-8')

    try {
      const result = spawnSync(electronPath, [tmpScript, '--no-sandbox'], {
        encoding: 'utf-8',
        timeout: 15000
      })

      expect(result.status).toBe(0)
      expect(result.stdout).toContain('SMOKE_LIFECYCLE_SUCCESS')
    } finally {
      if (fs.existsSync(tmpScript)) fs.unlinkSync(tmpScript)
    }
  })

  it('runs real SQLite migrations and database operations inside a spawned Electron process', () => {
    const electronPath = require('electron') as string
    const tmpScript = path.resolve(__dirname, '../../node_modules/.tmp-electron-db-smoke.js')
    const drizzleFolder = path.resolve(__dirname, '../../drizzle')

    const scriptCode = `
      const { app } = require('electron');
      const Database = require('better-sqlite3');
      const { drizzle } = require('drizzle-orm/better-sqlite3');
      const { migrate } = require('drizzle-orm/better-sqlite3/migrator');

      app.whenReady().then(() => {
        try {
          const sqlite = new Database(':memory:');
          const db = drizzle(sqlite);
          migrate(db, { migrationsFolder: ${JSON.stringify(drizzleFolder)} });

          // Verify tables exist
          const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
          const names = tables.map(t => t.name);
          if (!names.includes('lens_variants') || !names.includes('stock_history')) {
            throw new Error('Migrations failed: tables missing: ' + names.join(','));
          }

          console.log('SMOKE_DB_MIGRATIONS_SUCCESS');
          app.quit();
        } catch (err) {
          console.error('SMOKE_DB_ERROR:', err);
          process.exit(1);
        }
      });
    `

    fs.writeFileSync(tmpScript, scriptCode, 'utf-8')

    try {
      const result = spawnSync(electronPath, [tmpScript, '--no-sandbox'], {
        encoding: 'utf-8',
        timeout: 15000
      })

      expect(result.status).toBe(0)
      expect(result.stdout).toContain('SMOKE_DB_MIGRATIONS_SUCCESS')
    } finally {
      if (fs.existsSync(tmpScript)) fs.unlinkSync(tmpScript)
    }
  })

  it('verifies that electron-vite build artifacts exist, are non-empty, and preload exposes the contract', () => {
    const outDir = path.resolve(__dirname, '../../out')
    const mainJs = path.join(outDir, 'main/index.js')
    const preloadJs = path.join(outDir, 'preload/index.js')
    const rendererHtml = path.join(outDir, 'renderer/index.html')

    expect(fs.existsSync(mainJs)).toBe(true)
    expect(fs.statSync(mainJs).size).toBeGreaterThan(1000)

    expect(fs.existsSync(preloadJs)).toBe(true)
    expect(fs.statSync(preloadJs).size).toBeGreaterThan(500)

    expect(fs.existsSync(rendererHtml)).toBe(true)
    expect(fs.statSync(rendererHtml).size).toBeGreaterThan(100)

    // Preload must expose the contextBridge api object
    const preloadContent = fs.readFileSync(preloadJs, 'utf-8')
    expect(preloadContent).toContain('contextBridge')
    expect(preloadContent).toContain('getAllStock')
    expect(preloadContent).toContain('adjustQuantity')
    expect(preloadContent).toContain('importStock')
    expect(preloadContent).toContain('getSalesReport')
  })
})
