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

Só para quem vai **rodar o código-fonte** (desenvolvimento). Quem só quer usar o app já empacotado (instalador `.exe`/`.dmg`/`.AppImage`) não precisa de nada disso.

- **Node.js 20+** e **npm 10+** (desenvolvido com Node v22.18.0 / npm 10.9.3)
- **Visual Studio Build Tools** (workload "Desktop development with C++") no Windows, ou Xcode Command Line Tools no macOS / build-essential no Linux, e **Python 3** — o `better-sqlite3` v13 já vem com binários pré-compilados e não precisa ser recompilado em uso normal, mas o `npm install` pode disparar uma recompilação nativa dele mesmo assim por uma peculiaridade conhecida do npm com pacotes que têm um `binding.gyp` no pacote ([npm/cli#5234](https://github.com/npm/cli/issues/5234)). Ter a toolchain instalada evita que isso quebre a instalação.

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

**Implementado (MVP):** navegação lateral com quatro seções.

- **Inventário** — matriz esférico×cilindro com visualização/edição, grade completa sempre visível (mesmo sem estoque), toggle de categoria positivo/negativo, status colorido por célula contra uma meta de estoque ajustável, leitura de código de barras (adicionar ou remover), cadastro manual de nova lente, crescimento dinâmico de linhas/colunas, auto-save imediato.
- **Relatório** — exportação de lista de compras (texto ou JSON) das lentes abaixo da meta, e exportação do estoque completo (JSON ou SQL).
- **Registro de auditoria** — toda alteração de estoque fica registrada, agrupada por dia, com rollback por dia (reversível só com confirmação).
- **Configurações** — alternância de tema claro/escuro.

**Ainda fora do escopo:** relatório de lentes mais vendidas (as ferramentas de exportação já existem, os dados de vendas ainda não), importação de estoque, desfazer um rollback. Veja [`EstoqueLentes.md`](./EstoqueLentes.md) para o spec original completo.
