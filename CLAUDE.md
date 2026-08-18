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

There is no build tool chain requirement beyond Node — `better-sqlite3` ships prebuilt N-API binaries (ABI-stable across Node and Electron), so **do not** re-add an `electron-builder install-app-deps` postinstall rebuild step; it forces a node-gyp source build that fails without Visual Studio Build Tools and isn't needed for this dependency.

## Architecture

Three-process Electron split (`src/main`, `src/preload`, `src/renderer`), plus `src/shared` for the IPC contract used by all three:

- **`src/main/db/`** — the only place `better-sqlite3`/Drizzle runs. `schema.ts` defines `lens_variants` (one row per sphere×cylinder cell) and `stock_history` (schema exists, nothing reads/writes it yet — reserved for a future audit/rollback feature). `client.ts` opens the DB in `app.getPath('userData')` and runs migrations from `drizzle/` on startup. `queries.ts` has the core `adjustVariantQuantity` **upsert** — this single function is both "change a cell's quantity" and "grow the matrix" (inserting a not-yet-seen sphere/cylinder pair is exactly how a new row/column appears). Its functions take `db` as a parameter rather than importing the `client.ts` singleton, specifically so they're testable under plain Vitest without Electron (see `queries.test.ts` and the Debugging section below).
- **`src/main/ipc/stock.ts`** — registers the two `ipcMain.handle` channels (`stock:get-all`, `stock:adjust-quantity`) defined in `src/shared/ipc.ts`.
- **`src/preload/index.ts`** — exposes `window.api.{getAllStock,adjustQuantity}` via `contextBridge`. The renderer never touches Electron/Node APIs directly.
- **`src/renderer/src/lib/matrix.ts`** — pure functions only, no React/Electron deps. Values are stored and manipulated as **integer hundredths of a diopter** (0.25 → `25`) to avoid float drift on repeated 0.25 steps; `formatDiopter`/`toHundredths` convert at the render/input boundary only. `CATEGORY_RANGES` holds the known baseline grid extent per category (see Domain model); `deriveSphereRows`/`deriveCylinderColumns(variants, category)` union that baseline with whatever data currently exists for the category — this is both why the grid always shows placeholder cells for the full known range even with zero stock, _and_ why it still grows past the baseline for an out-of-range variant. Covered by `matrix.test.ts`; this is the file most worth testing carefully if you touch axis or arithmetic logic.
- **`src/renderer/src/components/StockMatrix.tsx`** — renders one category's matrix at a time (`category` prop), not both sphere signs together. `src/renderer/src/App.tsx` holds the active `category` in state and renders `CategoryToggle.tsx` (a `Switch`, top-right of the table) to flip between "Positivo"/"Negativo"; `AddVariantDialog`'s category field defaults to whichever is currently active (synced on open, not on mount — see its `onOpenChange`).
- **`src/renderer/src/components/MatrixCell.tsx`** — colors the quantity by `getStockStatus(quantity, target)` (`matrix.ts`): red = `outOfStock` (0), amber = `belowTarget` (below `target` but > 0), green = `atTarget`. `DEFAULT_STOCK_TARGET` (`matrix.ts`) is a single placeholder threshold used everywhere for now — there's no per-variant/per-category target yet (that's the spec's planned "adjustable target" shopping-list feature). The `—` placeholder for a cell with no `lens_variants` row at all is intentionally _not_ part of this status scheme (it means "never recorded," not "out of stock").
- **`src/renderer/src/hooks/useStock.ts`** — optimistic local state, reconciled with the IPC response; on error it falls back to a full refetch rather than a patch/undo (deliberately simple — data volume is small and single-user).

## Domain model

Lenses are identified by two numeric axes, each stepped in increments of **0.25**:

- **Sphere (esférico)**: sign/category is explicit (not purely derived) because `sphere = 0` belongs to the _positive_ category per the original spec.
- **Cylinder (cilindro)**: always ≤ 0.

Both constraints (quarter-step, cylinder ≤ 0, sphere sign matches category, quantity ≥ 0) are enforced twice: client-side in `AddVariantDialog.tsx`/`matrix.ts` for immediate feedback, and as SQLite `CHECK` constraints in `schema.ts` as the source of truth.

The shop's known lens range (`CATEGORY_RANGES` in `matrix.ts`) — the matrix always renders these as placeholders, stock or not:

- Positive: sphere 0 to +4, cylinder 0 to -2.
- Negative: sphere -0.25 to -3, cylinder 0 to -2.

This is the baseline extent, not a hard cap — a variant outside it still grows the grid (see `deriveSphereRows`/`deriveCylinderColumns` above).

### Barcode format (not yet implemented — parsing logic doesn't exist yet)

12-digit barcodes encode a lens variant as `LLLL S EEE I CCC`:

| Field  | Positions | Meaning                                            |
| ------ | --------- | -------------------------------------------------- |
| `LLLL` | 0-3       | Lot number — ignore                                |
| `S`    | 4         | Sign: `1` = positive sphere, `0` = negative sphere |
| `EEE`  | 5-7       | Sphere magnitude, e.g. `025` → 0.25                |
| `I`    | 8         | Ignore                                             |
| `CCC`  | 9-11      | Cylinder magnitude, e.g. `025` → 0.25              |

## Current scope

Implemented (MVP): matrix view/edit with manual +/- per cell, full baseline grid always shown as placeholders, positive/negative category toggle, color-coded stock status per cell, add-new-variant dialog, dynamic row/column growth past the baseline, auto-save (no explicit save step), view/edit mode toggle, dark mode.

Deliberately not yet implemented (see `EstoqueLentes.md` for the full original spec): barcode scanning, history/audit UI (schema exists), import/export (JSON/SQL), rollback, sales reports.
