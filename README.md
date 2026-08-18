# EstoqueLentes

App desktop pessoal (Electron) para gerenciar o estoque físico de blocos de lentes de uma ótica. A funcionalidade central é uma matriz de dois eixos — esférico × cilindro — mostrando a quantidade de cada lente em estoque, com adição/remoção manual e auto-save.

## Tech stack

- **TypeScript**
- **Electron + electron-vite** (processos main / preload / renderer)
- **React 19 + Tailwind CSS v4**
- Componentes estilo **shadcn/ui** sobre primitivos **Radix**
- **better-sqlite3 + Drizzle ORM** (SQLite local, migrations versionadas)
- **Vitest** para testes unitários

## Pré-requisitos

- **Node.js 20+** e **npm 10+** (desenvolvido com Node v22.18.0 / npm 10.9.3)
- Nenhuma toolchain de compilação nativa é necessária (sem Visual Studio Build Tools, Xcode Command Line Tools ou build-essential). O `better-sqlite3` v13 usa binários N-API pré-compilados, cujo ABI é estável entre Node e Electron — não há rebuild nativo no `postinstall`.

## Instalação

```bash
npm install
```

## Configuração

Não há `.env` nem chaves de API — o app é 100% local. O único "estado de configuração" é o próprio banco de dados: um arquivo SQLite criado automaticamente em `app.getPath('userData')` na primeira execução (no Windows, algo como `%APPDATA%\estoquelentes\estoquelentes.db`), com as migrations em `drizzle/` aplicadas automaticamente no startup — nenhum passo manual necessário.

## Scripts

| Script | Descrição |
|---|---|
| `npm run dev` | Roda o app em modo desenvolvimento, com HMR no renderer |
| `npm run build` | Typecheck + build de produção |
| `npm start` | Executa um build de produção (`electron-vite preview`) |
| `npm run build:win` / `build:mac` / `build:linux` | Build + empacotamento via electron-builder para a plataforma alvo |
| `npm run typecheck` | `tsc --noEmit` para as configs de main/preload e renderer |
| `npm run lint` | ESLint |
| `npm run format` | Prettier (`--write`) |
| `npm test` | Roda a suíte de testes (Vitest) |
| `npm run db:generate` | Gera uma nova migration a partir de `src/main/db/schema.ts` — rodar sempre que o schema mudar, e commitar o SQL gerado em `drizzle/` |
| `npm run db:studio` | Abre o Drizzle Studio para inspecionar o banco |

## Estrutura do projeto

Split padrão de três processos do Electron, mais uma pasta compartilhada:

```
src/
  main/       # único lugar onde better-sqlite3/Drizzle roda (schema, queries, migrations, IPC)
  preload/    # ponte contextBridge — expõe window.api ao renderer
  renderer/   # UI React (matriz, diálogos, componentes)
  shared/     # contrato de IPC (canais + tipos) usado pelos três processos
```

Detalhes de arquitetura, modelo de domínio (esférico/cilindro, formato do código de barras) e decisões de design estão documentados em [`CLAUDE.md`](./CLAUDE.md).

## Status atual

**Implementado (MVP):** matriz com visualização/edição, incremento e decremento manual por célula, auto-save imediato, crescimento dinâmico de linhas/colunas conforme novos valores de esférico/cilindro são cadastrados.

**Ainda fora do escopo:** leitura de código de barras, histórico/auditoria (schema já existe no banco, sem UI), importação/exportação (JSON/SQL), rollback, relatórios de vendas. Veja [`EstoqueLentes.md`](./EstoqueLentes.md) para o spec original completo.
