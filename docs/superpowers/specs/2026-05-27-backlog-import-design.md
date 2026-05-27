# Backlog do projeto + importar do backlog para sprint

**Status:** Design aprovado, aguardando review do spec
**Autor:** thiago.lessa08@gmail.com
**Data:** 2026-05-27

## Visão geral

O projeto já tem dois conceitos de "backlog":

- **Backlog do projeto**: cards do projeto que não estão atribuídos a nenhuma sprint (`sprintId IS NULL`). Funcionam como inventário de ideias/atividades à espera de planejamento. Acessível em `/projetos/[slug]/backlog`.
- **Coluna BACKLOG da sprint**: primeira coluna do kanban de uma sprint específica. Cards aqui já pertencem àquela sprint (`sprintId = X`, `status = "BACKLOG"`).

Hoje a página `/backlog` é muito básica (lista linha-a-linha sem ações, só permite criar novos cards via form lateral). A coluna BACKLOG do kanban só permite criar novos cards diretamente; não há forma visual de puxar um card já existente do backlog do projeto para a sprint.

**Este spec entrega:**

1. **Página `/backlog` aprimorada** — inventário utilizável: filtros, abrir/editar via modal, mover para sprint (single e bulk), arquivar.
2. **"Importar do backlog"** na coluna BACKLOG do kanban — botão com menu de 2 opções (Criar novo / Importar do backlog), abrindo um modal de seleção múltipla.

## Não-objetivos

- Não vai reorganizar o sistema de permissões existente.
- Não vai mudar a estrutura de dados (`Card`, `Sprint`).
- Não vai adicionar reordenação drag-and-drop dentro do backlog do projeto (cards no backlog não têm posição relevante; ordenação é por filtro).
- Não vai criar uma "fila priorizada" ou conceito separado de "icebox".

## Arquitetura

### Estrutura de arquivos

**Novos:**

- `src/components/backlog/BacklogList.tsx` — client; recebe cards + sprints + members + tags; gerencia estado de filtros, seleção em massa e modal de edição.
- `src/components/backlog/BacklogCardRow.tsx` — client; renderiza uma linha (checkbox + título + metadados + menu ⋯).
- `src/components/backlog/BacklogFilters.tsx` — client; campo de busca + dropdowns de prioridade e responsável.
- `src/components/backlog/MoveToSprintMenu.tsx` — client; dropdown reutilizável "Mover para sprint…" usado tanto na página backlog quanto possivelmente no menu ⋯ do CardDetailModal no futuro.
- `src/components/backlog/ImportBacklogDialog.tsx` — client; modal de seleção múltipla aberto pela coluna BACKLOG do kanban.
- `src/components/board/AddCardMenu.tsx` — client; substitui o botão "+ Adicionar card" na coluna BACKLOG do kanban com um dropdown (Criar novo / Importar do backlog).

**Modificados:**

- `src/app/(app)/projetos/[slug]/backlog/page.tsx` — server; busca cards + members + tags + sprints; passa para `BacklogList`.
- `src/server/repositories/cards.ts` — `findBacklogCards` passa a incluir `tags` e `mainActivity`.
- `src/server/actions/cards.ts` — adiciona `bulkAddCardsToSprintAction(cardIds, sprintId)`.
- `src/components/board/KanbanColumn.tsx` — quando `id === "BACKLOG"`, renderiza `AddCardMenu` em vez do botão simples; passa cards do backlog do projeto para o dialog de importação.
- `src/components/board/KanbanBoard.tsx` — busca cards do backlog do projeto (server-side, via `findBacklogCards` ou via fetch lazy quando o menu abre) e passa para a coluna BACKLOG.
- `src/components/cards/CardDetailModal.tsx` — esconde a seção "SPRINT" da sidebar quando `sprintName` não estiver definido (modal usável fora de contexto de sprint).

### Fluxo de dados

**Página `/backlog`:**

```
page.tsx (server)
  ├── findBacklogCards(projectId, assigneeFilter) → cards
  ├── findMembersByProjectId(projectId) → members
  ├── findTagsByProjectId(projectId) → allTags
  └── findSprintsByProjectId(projectId) → sprints (filtra PLANNED + ACTIVE no client)
       └─> BacklogList (client)
             ├─ filtros locais (busca/prioridade/responsável)
             ├─ seleção em massa (Set<string>)
             ├─ BacklogCardRow × N
             │     └─ menu ⋯: Abrir / Mover / Arquivar
             ├─ MoveToSprintMenu (single e bulk)
             ├─ Barra de ações em massa (quando há seleção)
             └─ CardDetailModal (quando há card selecionado)
```

**Coluna BACKLOG do kanban (sprint):**

```
KanbanBoard (client)
  └─ KanbanColumn id="BACKLOG"
       └─ AddCardMenu
             ├─ "Criar novo card" → input inline (igual hoje)
             └─ "Importar do backlog" → ImportBacklogDialog
                   ├─ busca cards via getProjectBacklogCardsAction (lazy quando abre)
                   ├─ filtro local de busca
                   ├─ checkboxes
                   └─ "Importar X cards" → bulkAddCardsToSprintAction(ids, sprintId)
```

### Backend

**`findBacklogCards` (modificado):**
Adiciona `tags: { include: { tag: true } }` e `mainActivity: { select: { id, name, color } }` ao include. Mantém assinatura e ordem (`{ position: "asc" }`).

**`bulkAddCardsToSprintAction(cardIds: string[], sprintId: string)` (nova):**

```ts
async function bulkAddCardsToSprintAction(
  cardIds: string[],
  sprintId: string
): Promise<ActionResult<{ count: number }>>
```

1. Auth check (`auth()`, retorna erro se não autenticado).
2. Lê o `sprint` para descobrir `projectId`.
3. Valida `requirePermission(userId, projectId, "card:move")`.
4. Para cada card: confirma que `card.projectId === sprint.projectId` (segurança).
5. `db.card.updateMany({ where: { id: { in: validIds } }, data: { sprintId, status: "BACKLOG" } })`.
6. Escreve audit log por card (`writeAudit({ action: "MOVE", ... })` em loop) — não em batch para preservar rastreabilidade.
7. `revalidatePath("/", "layout")`.
8. Retorna `{ success: true, data: { count } }`.

**`getProjectBacklogCardsAction(projectId: string)` (nova):**
Action chamada do client (lazy) quando o `ImportBacklogDialog` abre — evita buscar a lista no carregamento inicial do board.

```ts
async function getProjectBacklogCardsAction(
  projectId: string
): Promise<ActionResult<BacklogCardSummary[]>>
```

Faz `isMember` check e retorna `findBacklogCards(projectId, assigneeFilter)` com escopo de membros (se `MEMBER`, só vê os próprios).

**Permissões:**

- `card:create` — criar novo card (existente).
- `card:move` — mover card entre sprint/backlog (existente; cobre o singular e o bulk).
- `card:edit` — editar via CardDetailModal (existente).
- `card:archive` — arquivar (existente).

Members só veem cards atribuídos a eles na página backlog (já é o comportamento atual de `findBacklogCards` com `assigneeFilter`).

## Componentes

### `BacklogList`

**Props:** `cards`, `members`, `allTags`, `sprints` (já filtradas para PLANNED + ACTIVE), `canMove`, `canArchive`, `currentUserId`. (Não recebe `activities` — backlog não tem contexto de sprint.)

**Estado local:**
- `selectedIds: Set<string>`
- `searchQuery: string`
- `priorityFilter: Priority | "ALL"`
- `assigneeFilter: string | "ALL"`
- `openCardId: string | null`

**Comportamento:**
- Renderiza `BacklogFilters` no topo.
- Filtra `cards` em memória (busca por título substring case-insensitive, prioridade exata, responsável exato).
- Quando `selectedIds.size > 0`: renderiza barra "X selecionados · [Mover ▾] · [Arquivar]".
- Renderiza `BacklogCardRow` para cada card filtrado.
- Mantém `CardDetailModal` aberto quando `openCardId` está setado; ao fechar, dispara `router.refresh()`.

### `BacklogCardRow`

**Props:** `card`, `selected`, `onToggleSelect`, `onClick`, `members`, `sprints`, `canMove`, `canArchive`, `onRefresh`.

**Layout (mobile-first, dobra elegante em md):**

```
┌──────────────────────────────────────────────────────────────┐
│ ☐  ● ATIVIDADE                                       [⋯]     │
│    Título do card (1 linha truncada)                          │
│    [Prioridade]  5pts  FC  27 mai  · 3 tags                  │
└──────────────────────────────────────────────────────────────┘
```

- Checkbox à esquerda (`onCheckedChange` chama `onToggleSelect(card.id)`).
- Clique na área central do row dispara `onClick(card.id)` para abrir o modal.
- Menu `⋯` (DropdownMenu): Abrir / Mover pra sprint… / Arquivar.

### `BacklogFilters`

**Props:** `searchQuery`, `priorityFilter`, `assigneeFilter`, `members`, `onSearchChange`, `onPriorityChange`, `onAssigneeChange`, `onClear`.

Render: Input de busca + dois Selects + botão "Limpar" (aparece se algum filtro está ativo).

### `MoveToSprintMenu`

**Props:** `sprints` (lista de sprints PLANNED + ACTIVE), `onMove(sprintId)`, `triggerLabel?`, `disabled?`.

Render: `DropdownMenu` (shadcn) com:
- Cabeçalho "Mover para sprint:"
- Item por sprint (mostra nome + label status).
- Estado vazio: "Nenhuma sprint disponível".

Não faz a chamada server; só dispara `onMove(sprintId)` para o pai decidir (single → `addCardToSprintAction`; bulk → `bulkAddCardsToSprintAction`).

### `ImportBacklogDialog`

**Props:** `open`, `onClose`, `projectId`, `sprintId`, `currentUserId`.

**Estado local:**
- `cards: BacklogCardSummary[] | null` (null = carregando)
- `selectedIds: Set<string>`
- `searchQuery: string`
- `importing: boolean`
- `error: string | null`

**Comportamento:**
- `useEffect` quando `open` muda para true: chama `getProjectBacklogCardsAction(projectId)` e popula `cards`.
- Lista filtrada por título.
- Cada linha = checkbox + ícone atividade + título + prioridade.
- Estado vazio (sem cards): mensagem "Nenhum card no backlog do projeto."
- "Importar X cards" desabilitado quando `selectedIds.size === 0` ou `importing`.
- Ao clicar: chama `bulkAddCardsToSprintAction(Array.from(selectedIds), sprintId)`; sucesso → `onClose()` + `router.refresh()`; erro → mostra `error`.

### `AddCardMenu`

**Props:** `projectId`, `sprintId`, `onCreateNew()`, `onImport()`.

Render: `DropdownMenu` com trigger "+ Adicionar card ▾" e dois itens (Criar novo card / Importar do backlog do projeto).

Encapsula a UI; estados (input inline aberto, dialog aberto) ficam no `KanbanColumn` que é o pai.

## Mudanças no `KanbanColumn`

- Quando `id === "BACKLOG"`:
  - Substitui o `<Button>` "+ Adicionar card" pelo `<AddCardMenu>`.
  - Adiciona estado `importDialogOpen: boolean`.
  - Renderiza `<ImportBacklogDialog>` controlado por esse estado.
- Para outras colunas (DOING/VALIDATION/DONE): mantém comportamento atual.

## Mudanças no `CardDetailModal`

Não precisa alterar o componente. Já temos:

- Seção "SPRINT": só renderiza se `sprintName` for definido (`{sprintName && (...)}`). A página `/backlog` passa `sprintName={undefined}`.
- Seção "ATIVIDADE": só renderiza se `activities.length > 0`. A página `/backlog` passa `activities={[]}` (cards do backlog do projeto não têm contexto de sprint para escolher atividade principal). Isso esconde a seção automaticamente.

Resultado: o modal funciona naturalmente fora do contexto de sprint, sem mudanças.

## Tratamento de erros

- Erros de permissão (`requirePermission` lança) retornam mensagem em pt-BR.
- Falhas de rede no `ImportBacklogDialog` mostram `error` inline; usuário pode tentar de novo sem fechar o modal.
- Bulk parcial: se um card no `cardIds` não pertencer ao projeto, é silenciosamente ignorado pelo filtro `validIds` (não é erro porque a UI sempre passa cards do mesmo projeto).
- `revalidatePath("/", "layout")` é usado em todas as ações que mutam para manter o board e a página backlog sincronizados.

## Testes / verificação manual

Sem framework de testes automatizados no projeto. Verificação manual obrigatória após implementação:

1. **Página `/backlog`:**
   - [ ] Filtros funcionam isoladamente e combinados (busca + prioridade + responsável).
   - [ ] Botão "Limpar" só aparece quando há filtro ativo.
   - [ ] Clicar num card abre `CardDetailModal` sem seção SPRINT.
   - [ ] Editar/salvar card pelo modal atualiza a lista.
   - [ ] "Mover pra sprint…" no menu ⋯ envia o card e ele some da lista.
   - [ ] Bulk-select + "Mover X pra sprint…" funciona; barra de ações em massa some quando seleção fica vazia.
   - [ ] "Arquivar" remove o card da lista.
   - [ ] Members só veem cards próprios.

2. **Kanban — coluna BACKLOG:**
   - [ ] "+ Adicionar card ▾" abre menu com 2 opções.
   - [ ] "Criar novo card" mostra input inline igual antes; criar funciona.
   - [ ] "Importar do backlog" abre dialog com cards do backlog do projeto.
   - [ ] Estado vazio renderiza mensagem amigável.
   - [ ] Seleção múltipla + "Importar X cards" move os cards e fecha o dialog.
   - [ ] Cards importados aparecem na coluna BACKLOG da sprint.
   - [ ] Cards importados somem da página `/backlog`.
   - [ ] Sem permissão `card:move` (role MEMBER): opção "Importar do backlog" não aparece.

3. **Outras colunas (DOING/VALIDATION/DONE):**
   - [ ] Comportamento de "Adicionar card" inalterado.

## Riscos e mitigações

- **Performance**: `findBacklogCards` sem paginação. Mitigação: limitar busca/exibição a 200 mais recentes em uma iteração futura (não escopo agora — backlogs típicos têm dezenas).
- **Sincronização board ↔ backlog**: `revalidatePath("/", "layout")` invalida tudo, então qualquer navegação subsequente vai puxar dados frescos. Como ambos são server components em sub-rotas, isso é suficiente.
- **Bulk audit logs**: criar N registros em loop pode ser lento se importar muitos cards de uma vez. Aceitável até ~50 cards. Otimização (createMany) é futura.
- **Cards arquivados**: `findBacklogCards` já filtra `archivedAt: null`, então arquivados nunca aparecem no picker — correto.
