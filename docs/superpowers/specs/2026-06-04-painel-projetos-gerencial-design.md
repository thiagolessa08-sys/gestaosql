# Painel Projetos Gerencial

**Data:** 2026-06-04
**Status:** Aprovado

## Alterações no menu

- "Painel Projetos" → renomear para **"Painel Projetos TV"** (rota `/painel` mantida)
- Novo item **"Painel Projetos Gerencial"** → rota `/painel-projetos` (acesso Admin Projeto + Admin Total)

## Seções do Painel Gerencial

### KPIs (4 cards)
- Total de cards ativos (não arquivados)
- Em andamento (DOING)
- Em validação (VALIDATION)
- Concluídos (DONE)

### Atividades por usuário (clicável)
Tabela por responsável: total, DOING, VALIDATION, DONE. Clicar abre modal com todos os cards do usuário em detalhe.

### Atividades por projeto (clicável)
Tabela por projeto: total cards, progressão %, em validação, concluídos. Clicar abre modal com cards do projeto.

### Distribuição por status e prioridade
Barras de % por status (BACKLOG/DOING/VALIDATION/DONE) e por prioridade (LOW/MEDIUM/HIGH/CRITICAL).

### Atividades atrasadas
Lista de cards com `dueDate < hoje` e status != DONE: título, responsável, projeto, sprint, dias de atraso. Ordenado por mais atrasado.

## Arquitetura

### Serviço
`src/server/services/projetosDashboard.ts` — `getProjetosDashboard()` agrega tudo via Prisma, sem chamadas N+1.

### Server actions
`getCardsPorUsuarioAction(usuarioId)` e `getCardsPorProjetoAction(projetoId)` — retornam cards com projeto, sprint, responsável.

### Modal reutilizável
`RelatorioCardsModal` — mesmo padrão do comercial: avatar, KPIs (total/andamento/validação/concluídos), lista de cards com status colorido, prioridade, projeto, sprint, prazo.

### Tabelas client clicáveis
`UsuariosCardsTable` e `ProjetosCardsTable` — mesmos padrões de `RankingTable` do comercial.

### Sidebar
- Renomear item existente
- Novo item com ícone `BarChart3` (acesso `podeVerPainelProjetos`)
