Estou criando um app com Electron-vite e typescript chamado EstoqueLentes

É um app de uso pessoal para gerenciar o meu estoque fisico de blocos de lentes na minha ótica.

A funcionalidade principal do app é a tabela(matrix) com dois eixos mostrando a quantidade de cada lente no estoque, e a adição e subtração de lentes utilizando código de barras e o registro com auto-save das alterações no estoque

Stack inicial:

Typescript

Eléctron + Electron-vite
React + Tailwind + shadcn/ui

better-sqlite3 + Drizzle ORM

Objetivos:

Tabela de lentes em dois eixos, vertical(valor esferico) horizontal(valor cilindro).
Os valores são incrementados de 0.25 em 0.25
Existem duas categorias de lentes, lentes com o esferico positivo e lentes com o esferico negativo.

Atualmente, o meu estoque tem a seguinte extensão:

&#x09;Esférico positivo: valor esférico = 0 até +4, valor cilindro = 0 até -2

&#x09;Esférico positivo: valor esférico = -0.25 até -3, valor cilindro = 0 até -2

A tabela deve aumentar modularmente, há medida que o estoque sobe(por exemplo, criando uma nova linha caso apareça uma lente com o esferico "+4.25", ou uma nova coluna caso apareça uma lente com cilindro "-2.25")

Criação de um sistema de registro, com histórico de adição/remoção de lentes e as datas

Ferramentas (100% implementadas):

- [x] Importar um estoque (JSON, ou arquivo SQL)
- [x] Exportar um estoque (JSON, ou arquivo SQL)
- [x] Exportar uma lista de compras com uma meta ajustavel(em JSON e/ou texto normal)
- [x] Rollback para um estado antigo(integração com os registros. Se adicionado X, remova X)
- [x] Relatório de lentes mais vendidas/quantidade vendida por mês
- [x] Adição e remoção de lentes via tabela interativa(view mode / edit mode)
- [x] Adição e remoção de lentes via código de barras

Para o código de barras, use esta logica:

12 digits: LLLL S EEE I CCC

LLLL (0-3): Lot (ignore)

S (4): Sign (1 = positive, 0 = negative)

EEE (5-7): Sphere value (e.g. 025 -> 0.25)

I (8): Ignore

CCC (9-11): Cylinder value (e.g. 025 -> 0.25)
