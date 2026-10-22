# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this app is

EstoqueLentes ("lens stock") is a personal-use Electron desktop app for managing the physical inventory of optical lens blocks at the user's optical shop (ótica). Single user, local-first, no multi-tenant/auth concerns.

Stack: TypeScript, Electron + electron-vite, React + Tailwind v4 + hand-rolled shadcn/ui-style components, better-sqlite3 + Drizzle ORM.

## Debugging

**Never use screenshots or screen capture to verify the UI or debug an issue.** They're slow, only show the current frame, and don't reveal what actually happened. Use these instead, in order:

1. **Read the terminal.** `npm run dev`'s stdout is the single unified log for both processes: `electron-log` is initialized in `src/main/index.ts` (`log.initialize({ spyRendererConsole: true })` + `log.errorHandler.startCatching()`) and imported in `src/preload/index.ts` (`import 'electron-log/renderer'`), so every `console.log`/`warn`/`error` in the renderer and every uncaught exception/unhandled rejection in _either_ process prints to that same terminal — no DevTools needed. It's also persisted to `<userData>/logs/main.log` (e.g. `%APPDATA%\estoquelentes\logs\main.log` on Windows) if you need history after the process exits.
2. **Test logic in isolation instead of running the whole app.** Business logic is deliberately kept out of Electron-only code so it can run under plain Vitest/Node:
   - Pure functions (`src/renderer/src/lib/matrix.ts`) — `matrix.test.ts`.
   - Main-process DB logic (`src/main/db/queries.ts`) takes `db` as a parameter instead of importing the `client.ts` singleton (which needs `Electron.app`), so tests spin up a `better-sqlite3(':memory:')` + run the real migrations from `drizzle/` — no Electron process required. See `queries.test.ts` for the pattern.
   - React components — `vitest.config.ts` wires up `@testing-library/react` + jsdom (opt in per file with the `// @vitest-environment jsdom` pragma at the top, since the project default is the faster `node` environment). Render the component, query it with `screen`, and use `screen.debug()` to dump the DOM as text when you need to see structure — that's the "screenshot" replacement. See `MatrixCell.test.tsx` for the pattern.
   - Real Electron binary & runtime smoke tests (`src/main/electronSmoke.test.ts`) — validates that the platform Electron binary is downloaded at `node_modules/electron/path.txt`, can spawn, runs `app.whenReady()` with windows, and executes real native SQLite migrations.
   - Run everything with `npm test`.
3. **Chrome DevTools Protocol, only for deep interactive debugging that 1 and 2 can't cover.** Dev builds only (`is.dev`-guarded in `src/main/index.ts`) open CDP on port 9222. No extra dependency needed — Node 22 has `fetch`/`WebSocket` built in:
   ```bash
   curl http://localhost:9222/json   # lists targets; grab webSocketDebuggerUrl for the "page" entry
   ```
   ```js
   const ws = new WebSocket(webSocketDebuggerUrl)
   await new Promise((r) => ws.addEventListener('open', r))
   ws.send(
     JSON.stringify({
       id: 1,
       method: 'Runtime.evaluate',
       params: { expression: '/* JS to run in the page */', returnByValue: true }
     })
   )
   // read the response from the next 'message' event
   ```

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`, etc.).

## Commands

```bash
npm run dev              # launch the app (electron-vite dev, HMR renderer)
npm run build             # typecheck + production build
npm run start              # preview a production build
npm run typecheck          # tsc --noEmit for both main/preload and renderer configs
npm run lint                # eslint
npm run format               # prettier --write .
npm run test                  # vitest run
npm run db:generate            # drizzle-kit generate — run after editing src/main/db/schema.ts, commit the output under drizzle/
npm run db:studio               # drizzle-kit studio, browse the schema/data
```

`better-sqlite3` ships prebuilt N-API binaries (ABI-stable across Node and Electron) and doesn't need compiling in normal use, so **do not** re-add an `electron-builder install-app-deps` postinstall rebuild step — it forces an explicit node-gyp source build that isn't needed for this dependency. That said, a plain `npm install` can _still_ trigger a native rebuild attempt for it anyway: this is a known npm CLI quirk where any package with a `binding.gyp` in its tarball gets an implicit, unconditional node-gyp rebuild attempt, independent of install scripts or `gypfile: false` (npm/cli#5234) — it's inconsistent (not every `npm install` hits it) and not something fixable from this project's config. A developer building from source needs Visual Studio Build Tools ("Desktop development with C++") + Python on hand for when it does fire; end users of a packaged build never touch npm at all, so this never affects them.

## Architecture

Three-process Electron split (`src/main`, `src/preload`, `src/renderer`), plus `src/shared` for the IPC contract used by all three:

- **`src/main/db/`** — the only place `better-sqlite3`/Drizzle runs. `schema.ts` defines `lens_variants` (one row per sphere×cylinder cell) and `stock_history` (one row per adjustment: `variantId`, `delta`, `resultingQuantity`, `source`). `client.ts` opens the DB in `app.getPath('userData')` and runs migrations from `drizzle/` on startup. `queries.ts`'s `adjustVariantQuantity` wraps the variant upsert (this single function is both "change a cell's quantity" and "grow the matrix" — inserting a not-yet-seen sphere/cylinder pair is exactly how a new row/column appears) and the matching `stock_history` insert in one `db.transaction(...)`, so a quantity change and its audit record can never diverge. `getStockHistory` joins history with `lens_variants` for display (sphere/cylinder/category aren't denormalized into `stock_history`, since variant rows are never deleted). `rollbackDay` reverses a whole day: aggregates each variant's net delta for that day, applies the inverse (clamped at 0, like `adjustVariantQuantity`), then **deletes** those history rows — a rolled-back day is undone, not recorded as a new action (matches the original spec's "se adicionado X, remova X"). `getMonthlySales` and `getTopSellingVariants` query negative delta adjustments to provide monthly sales volume and top seller rankings. `importStockVariants` applies bulk imports atomically with merge or replace semantics. All take `db` as a parameter rather than importing the `client.ts` singleton, so they're testable under plain Vitest without Electron (see `queries.test.ts` and the Debugging section).
- **`src/main/ipc/stock.ts`** — registers the stock `ipcMain.handle` channels (`stock:get-all`, `stock:adjust-quantity`, `stock:import`) defined in `src/shared/ipc.ts`.
- **`src/main/ipc/report.ts`** — registers report `ipcMain.handle` channels (`report:get-monthly-sales`, `report:get-top-selling`).
- **`src/main/ipc/history.ts`** — registers `history:get-all` / `history:rollback-day`.
- **`src/main/ipc/file.ts`** — registers `file:save` (`dialog.showSaveDialog` + `fs.writeFile`) and `file:open` (`dialog.showOpenDialog` + `fs.readFile`), resolved against `BrowserWindow.fromWebContents(event.sender)`. It backs every export download and file import button.
- **`src/main/ipc/storage.ts`** — registers `storage:backup-database` (online SQLite backup via `better-sqlite3`'s `backup()` API to a user-selected file), `storage:restore-database` (validates SQLite file and restores into the live DB), `storage:open-data-folder` (`shell.openPath` for `userData`), and `storage:get-data-path`.
- **`src/preload/index.ts`** — exposes `window.api.{getAllStock,adjustQuantity,saveFile,openFile,getStockHistory,rollbackDay,getSalesReport,importStock,backupDatabase,restoreDatabase,openDataFolder,getDataPath}` via `contextBridge`. The renderer never touches Electron/Node APIs directly, and `window.api` is deep-frozen by `contextBridge` — don't try to monkey-patch it from the live renderer (e.g. over CDP) to intercept a call for testing; it silently no-ops. Mock it in a Vitest/jsdom test instead (`window.api = createMockApi({...})` — see `src/renderer/src/test/mockApi.ts` and `ExportModal.test.tsx`).
- **`src/renderer/src/lib/matrix.ts`** — pure functions only, no React/Electron deps. Values are stored and manipulated as **integer hundredths of a diopter** (0.25 → `25`) to avoid float drift on repeated 0.25 steps; `formatDiopter`/`toHundredths` convert at the render/input boundary only. `CATEGORY_RANGES` holds the known baseline grid extent per category (see Domain model); `deriveSphereRows`/`deriveCylinderColumns(variants, category)` union that baseline with whatever data currently exists for the category — this is both why the grid always shows placeholder cells for the full known range even with zero stock, _and_ why it still grows past the baseline for an out-of-range variant. Covered by `matrix.test.ts`; this is the file most worth testing carefully if you touch axis or arithmetic logic.
- **`src/renderer/src/App.tsx`** — app shell only: `Sidebar` (left) + a view switch (`AppView` in `Sidebar.tsx`: `inventory`/`report`/`audit`/`settings`) rendering `InventoryView.tsx`, `ReportView.tsx`, `AuditView.tsx`, or `SettingsView.tsx` — all four views are built now. No global header/chrome — anything not specific to one view (like `ThemeToggle`) lives inside the view that owns it (`ThemeToggle` is in `SettingsView.tsx`, deliberately _not_ on the inventory screen).
- **`src/renderer/src/components/InventoryView.tsx`** — owns `editMode`/`category` state and composes the inventory toolbar (`BarcodeInput`, `StockTargetInput`, `EditModeToggle`, `AddVariantDialog`, `CategoryToggle`) with `StockMatrix`. A barcode scan both adjusts the quantity **and** switches `category` to match the scanned lens, so the just-scanned cell is always visible on the table you're looking at instead of silently updating an off-screen category. `BarcodeInput` passes `source: 'barcode'` on `AdjustQuantityRequest`; every other caller (matrix +/-, `AddVariantDialog`) omits it, defaulting to `'manual'` in `adjustVariantQuantity` — this is what lets the audit log distinguish how a change happened.
- **`src/renderer/src/components/AuditView.tsx`** / **`AuditDayCard.tsx`** / **`src/renderer/src/lib/auditLog.ts`** / **`hooks/useAuditLog.ts`** — the Registro de auditoria page. `auditLog.ts` (pure, tested in `auditLog.test.ts`) groups history entries by local calendar day via `groupHistoryByDay`, most-recent-day-first, and formats the day summary/entry lines. `AuditDayCard` renders one day: the `formatNetMovement` line color-coded green/red by net sign, a "Rollback" button behind a `ConfirmDialog` (`window.api.rollbackDay({dayStartMs, dayEndMs})` on confirm, then `refetch()`), and one row per entry — action label + icon + delta, colored green for additions / red for removals, alongside the muted lens description so color is reinforcement, not the only signal.
- **`src/renderer/src/components/StockMatrix.tsx`** — renders one category's matrix at a time (`category` prop), not both sphere signs together; `AddVariantDialog`'s category field defaults to whichever is currently active (synced on open, not on mount — see its `onOpenChange`).
- **`src/renderer/src/components/BarcodeInput.tsx`** — parses with `parseBarcode` (`matrix.ts`); a +/- toggle next to the input picks the scan direction (add stock vs. remove stock), defaulting to add. Includes keyboard shortcut `F2` to immediately focus the input from anywhere in the window.
- **`src/renderer/src/hooks/useStockTarget.ts`** + **`src/renderer/src/lib/stockTarget.ts`** — the stock-status target is a single adjustable number (`StockTargetInput` in the toolbar), persisted to `localStorage` the same way `useTheme`/`theme.ts` persist the theme; `DEFAULT_STOCK_TARGET` (`matrix.ts`) is only the fallback before any value has been saved.
- **`src/renderer/src/components/MatrixCell.tsx`** — colors the quantity by `getStockStatus(quantity, target)` (`matrix.ts`, `target` passed down from `useStockTarget`): red = `outOfStock` (0), amber = `belowTarget` (below `target` but > 0), green = `atTarget`. The `—` placeholder for a cell with no `lens_variants` row at all is intentionally _not_ part of this status scheme (it means "never recorded," not "out of stock").
- **`src/renderer/src/hooks/useStock.ts`** — optimistic local state, reconciled with the IPC response; on error it falls back to a full refetch rather than a patch/undo (deliberately simple — data volume is small and single-user).
- **`src/renderer/src/components/ReportView.tsx`** — renders monthly sales analytics and top-sellers ranking via `useSalesReport`, accompanied by export modals and an import button that opens `ImportModal`.
- **`src/renderer/src/components/ImportModal.tsx`** / **`src/renderer/src/lib/importStock.ts`** — stock import modal supporting file upload (`file:open`) or clipboard paste of JSON and SQL (`INSERT INTO lens_variants`) formats, with preview verification and toggle between `merge` and `replace` modes.
- **`src/renderer/src/components/ExportModal.tsx`** — the one reusable "show exportable content" modal (built on `components/ui/dialog.tsx`): takes `content` (string), an optional `copyable`/`download` ({fileName, filters}), shows the content or `emptyMessage`, and owns its own "Copiado!"/"Salvo!" transient feedback state. Every export button in the app is one `ExportModal` instance with different props — don't build a one-off dialog for a new export, add another `ExportModal` call.
- **`src/renderer/src/components/ConfirmDialog.tsx`** — the other reusable modal: generic yes/no confirmation (`trigger`, `title`, `description`, `onConfirm`, optional `destructive` for the confirm button's variant). Used by `AuditDayCard`'s rollback button; reach for it instead of a one-off dialog anywhere else a destructive/consequential action needs a confirmation step.
- **`src/renderer/src/lib/exportStock.ts`** — pure functions backing the report exports: `buildShoppingList(variants, target)` walks _both_ categories' full baseline grid (like `deriveSphereRows` does) and returns every cell under target, including untouched (quantity-0, no-DB-row) cells — `formatShoppingListLine` renders the exact `"ESF: ... | CIL: ... - N unidades"` line format; `shoppingListToJson` (sphere/cylinder/quantityToBuy only — no `category`/`quantity`, by request) /`stockToJson`/`stockToSql` are the other three export formats. Covered by `exportStock.test.ts`.

## Domain model

Lenses are identified by two numeric axes, each stepped in increments of **0.25**:

- **Sphere (esférico)**: sign/category is explicit (not purely derived) because `sphere = 0` belongs to the _positive_ category per the original spec.
- **Cylinder (cilindro)**: always ≤ 0.

Both constraints (quarter-step, cylinder ≤ 0, sphere sign matches category, quantity ≥ 0) are enforced twice: client-side in `AddVariantDialog.tsx`/`matrix.ts` for immediate feedback, and as SQLite `CHECK` constraints in `schema.ts` as the source of truth.

The shop's known lens range (`CATEGORY_RANGES` in `matrix.ts`) — the matrix always renders these as placeholders, stock or not:

- Positive: sphere 0 to +4, cylinder 0 to -2.
- Negative: sphere -0.25 to -3, cylinder 0 to -2.

This is the baseline extent, not a hard cap — a variant outside it still grows the grid (see `deriveSphereRows`/`deriveCylinderColumns` above).

### Barcode format

12-digit barcodes encode a lens variant as `LLLL S EEE I CCC`, parsed by `parseBarcode` in `matrix.ts`:

| Field  | Positions | Meaning                                            |
| ------ | --------- | -------------------------------------------------- |
| `LLLL` | 0-3       | Lot number — ignore                                |
| `S`    | 4         | Sign: `1` = positive sphere, `0` = negative sphere |
| `EEE`  | 5-7       | Sphere magnitude, e.g. `025` → 0.25                |
| `I`    | 8         | Ignore                                             |
| `CCC`  | 9-11      | Cylinder magnitude, e.g. `025` → 0.25              |

Sphere `0` always resolves to the positive category regardless of the sign bit (see above); both magnitudes must land on a 0.25 step or `parseBarcode` returns `null`. Watch for `-0`: negating a zero magnitude produces JS's `-0`, which is `!==`-equal but `toEqual`-unequal to `0` in tests — `parseBarcode` normalizes it with `|| 0`.

## Current scope

Implemented: sidebar navigation, all four pages built.

- Inventário: matrix view/edit with manual +/- per cell, full baseline grid always shown as placeholders, positive/negative category toggle, color-coded stock status per cell against an adjustable stock target, barcode scanning (add or remove) with `F2` focus shortcut, add-new-variant dialog, dynamic row/column growth past the baseline, auto-save.
- Relatório: sales and entrance metrics with standard `dd/mm/aaaa` date selector (day or interval filter), top-selling variants ranking with visual comparative bars, and shopping-list export (text or JSON) for everything below the stock target, with the adjustable stock target input directly integrated in the section.
- Registro de auditoria: every adjustment (manual, barcode, or import) is recorded to `stock_history` and shown grouped by day, color-coded add/remove, with month/day search (by text, month name, or native calendar picker) and per-day rollback (destructive — reverses the day's net change and deletes those history rows, doesn't create new ones).
- Configurações: dark mode toggle, stock import (JSON/SQL merge or replace) with native file picker or clipboard paste via `ImportModal`, full-stock export (JSON or SQL) via `ExportModal`, online SQLite database backup creation with native save dialog, database restore with validation and confirmation, and direct shortcut to open local user data folder in OS file manager.
- Distribuição & CI/CD: professional multi-platform packaging for Windows (NSIS installer with `deleteAppDataOnUninstall: false`, standalone portable `.exe`, and portable `.zip`) and Linux (`.AppImage`, `.deb`, and `.tar.xz` with desktop integration and icon themes), SHA256SUMS automated checksums, and two-tier GitHub Actions workflows (`.github/workflows/ci.yml` for pull requests/push and `.github/workflows/build_releases.yml` for tag-triggered releases).
- Testes & Qualidade: 14 test suites, 108 unit and integration tests including real Electron binary and native SQLite runtime smoke tests.

Deliberately not yet implemented: undo of a rollback itself (it's a hard, one-way undo by design — see the `db/` architecture note above).
