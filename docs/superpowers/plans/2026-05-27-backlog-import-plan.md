# Backlog do projeto + importar do backlog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aprimorar a página `/projetos/[slug]/backlog` para ser um inventário utilizável (filtros, abrir/editar, mover pra sprint, arquivar) e permitir importar cards do backlog do projeto para a coluna BACKLOG do kanban da sprint via menu com modal de seleção múltipla.

**Architecture:** Reutiliza `CardDetailModal` existente, repositório `findBacklogCards` enriquecido com tags/mainActivity, nova action `bulkAddCardsToSprintAction` para mover múltiplos cards de uma vez. Página de backlog renderizada por server component que delega filtros e seleção em massa a componente client `BacklogList`. Modal de importação no kanban faz fetch lazy via nova action `getProjectBacklogCardsAction`.

**Tech Stack:** Next.js 16 App Router, React server components, NextAuth v5, Prisma 7, Zod, shadcn/ui, Tailwind CSS, @dnd-kit (já existente no board), TypeScript.

**Spec:** `docs/superpowers/specs/2026-05-27-backlog-import-design.md`

---

## Visão geral das tarefas

1. **Backend** (3 tasks): enriquece `findBacklogCards`, adiciona schema + action de bulk move, adiciona action de fetch backlog.
2. **Componentes da página /backlog** (4 tasks): `BacklogFilters`, `MoveToSprintMenu`, `BacklogCardRow`, `BacklogList`.
3. **Wire-up da página** (1 task): atualiza `page.tsx`.
4. **Coluna BACKLOG do kanban** (3 tasks): `ImportBacklogDialog`, `AddCardMenu`, integração no `KanbanColumn`.
5. **Verificação final** (1 task).

**Total: 12 tasks.** Cada commit deixa o código compilando.

---

### Task 1: Enriquecer `findBacklogCards` com tags e mainActivity

**Files:**
- Modify: `src/server/repositories/cards.ts:32-47`

A página `/backlog` redesenhada precisa mostrar tags e atividade principal por card. O `_count` já está lá; só falta incluir `tags` e `mainActivity`.

- [ ] **Step 1: Substituir o include da função `findBacklogCards`**

Em `src/server/repositories/cards.ts`, localizar a função `findBacklogCards` (linhas 32-47) e substituir TODO o bloco pelo abaixo:

```ts
export async function findBacklogCards(projectId: string, assigneeId?: string) {
  return db.card.findMany({
    where: {
      projectId,
      sprintId: null,
      archivedAt: null,
      ...(assigneeId ? { assigneeId } : {}),
    },
    include: {
      assignee: { select: { id: true, name: true, avatarUrl: true } },
      tags: { include: { tag: true } },
      mainActivity: { select: { id: true, name: true, color: true } },
      _count: { select: { comments: true, checklists: true } },
    },
    orderBy: { position: "asc" },
  })
}
```

- [ ] **Step 2: Verificar compilação TypeScript**

Run: `npx tsc --noEmit`
Expected: nenhuma saída (sem erros)

> Se aparecer erro em algum consumidor (`backlog/page.tsx`), é porque o consumidor está usando uma forma do retorno que mudou. Hoje só a `backlog/page.tsx` consome essa função e ela acessa apenas `card.id, card.title, card.assignee, card.priority, card.storyPoints, card._count.comments` — todos preservados. Não deve haver erro.

- [ ] **Step 3: Commit**

```bash
git add src/server/repositories/cards.ts
git commit -m "feat: enriquecer findBacklogCards com tags e mainActivity"
```

---

### Task 2: Adicionar schema Zod para bulk move

**Files:**
- Modify: `src/lib/schemas/cards.ts:1-35`

Antes de criar a action de bulk move, precisamos do schema para validar entrada.

- [ ] **Step 1: Adicionar o schema ao fim do arquivo**

Em `src/lib/schemas/cards.ts`, adicionar ao final (depois da declaração `MoveCardInput`):

```ts
export const bulkAddCardsToSprintSchema = z.object({
  cardIds: z.array(z.string().uuid()).min(1, "Selecione ao menos um card").max(100, "Máximo de 100 cards por vez"),
  sprintId: z.string().uuid(),
})

export type BulkAddCardsToSprintInput = z.infer<typeof bulkAddCardsToSprintSchema>
```

- [ ] **Step 2: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/lib/schemas/cards.ts
git commit -m "feat: schema Zod para bulk add cards a sprint"
```

---

### Task 3: Adicionar `bulkAddCardsToSprintAction`

**Files:**
- Modify: `src/server/actions/cards.ts` (adicionar import e função no final)
- Modify: `src/server/repositories/sprints.ts` (garantir export de `findSprintById`)

Esta action recebe N cards e um sprintId, valida permissões e move todos atomicamente.

- [ ] **Step 1: Verificar import de `findSprintById`**

Em `src/server/actions/cards.ts`, no bloco de imports, adicionar (se já não existir):

```ts
import { findSprintById } from "@/server/repositories/sprints"
import { bulkAddCardsToSprintSchema } from "@/lib/schemas/cards"
import { writeAudit } from "@/server/services/audit"
```

- [ ] **Step 2: Adicionar a action no final do arquivo**

Em `src/server/actions/cards.ts`, ANTES da seção de "Collaboration data fetchers" (linha 221, marcador `// ----`), adicionar:

```ts
export async function bulkAddCardsToSprintAction(
  cardIds: string[],
  sprintId: string
): Promise<ActionResult<{ count: number }>> {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Não autenticado." }

  const parsed = bulkAddCardsToSprintSchema.safeParse({ cardIds, sprintId })
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." }
  }

  const sprint = await findSprintById(sprintId)
  if (!sprint) return { success: false, error: "Sprint não encontrada." }

  try {
    await requirePermission(session.user.id, sprint.projectId, "card:move")
  } catch {
    return { success: false, error: "Sem permissão para mover cards." }
  }

  // Carrega todos os cards de uma vez para validar projeto + filtrar válidos
  const cards = await db.card.findMany({
    where: { id: { in: parsed.data.cardIds }, archivedAt: null },
    select: { id: true, projectId: true },
  })

  const validIds = cards
    .filter((c) => c.projectId === sprint.projectId)
    .map((c) => c.id)

  if (validIds.length === 0) {
    return { success: false, error: "Nenhum card válido para importar." }
  }

  await db.card.updateMany({
    where: { id: { in: validIds } },
    data: { sprintId: parsed.data.sprintId, status: "BACKLOG" },
  })

  // Audit log por card (preserva rastreabilidade individual)
  await Promise.all(
    validIds.map((cardId) =>
      writeAudit({
        projectId: sprint.projectId,
        actorId: session.user.id,
        entityType: "card",
        entityId: cardId,
        action: "MOVE",
        changes: { after: { sprintId: parsed.data.sprintId } },
      })
    )
  )

  revalidatePath("/", "layout")
  return { success: true, data: { count: validIds.length } }
}
```

> Nota: precisamos importar `db` no topo do arquivo se ainda não foi importado. Adicione `import { db } from "@/server/db"` se faltar.

- [ ] **Step 3: Verificar imports e adicionar `db` se faltar**

Run: `npx tsc --noEmit`
Expected: pode dar erro tipo `Cannot find name 'db'`. Se acontecer, adicionar no topo do arquivo:

```ts
import { db } from "@/server/db"
```

E rodar de novo `npx tsc --noEmit`. Esperado: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/server/actions/cards.ts
git commit -m "feat: action bulkAddCardsToSprintAction para importar do backlog"
```

---

### Task 4: Adicionar `getProjectBacklogCardsAction` (fetch lazy)

**Files:**
- Modify: `src/server/actions/cards.ts` (topo: ajustar imports; final: adicionar a action)

Esta action é chamada pelo `ImportBacklogDialog` quando ele abre — evita pré-carregar a lista do backlog no board.

- [ ] **Step 1: Atualizar os imports no topo do arquivo**

Em `src/server/actions/cards.ts`, localizar a linha:

```ts
import { findCardById, addCardToSprint } from "@/server/repositories/cards"
```

E substituir por:

```ts
import { findCardById, addCardToSprint, findBacklogCards } from "@/server/repositories/cards"
```

Localizar também a linha:

```ts
import { requirePermission, isMember } from "@/server/permissions"
```

E substituir por:

```ts
import { requirePermission, isMember, getMemberRole } from "@/server/permissions"
```

- [ ] **Step 2: Adicionar a action ao final do arquivo**

Em `src/server/actions/cards.ts`, ao final do arquivo (depois de `getCardAttachmentsAction`), adicionar:

```ts
type BacklogCardData = Awaited<ReturnType<typeof findBacklogCards>>[number]

export async function getProjectBacklogCardsAction(
  projectId: string
): Promise<ActionResult<BacklogCardData[]>> {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Não autenticado." }

  const canAccess = await isMember(session.user.id, projectId)
  if (!canAccess) return { success: false, error: "Sem permissão." }

  // Members só veem cards atribuídos a eles (consistente com a página /backlog)
  const role = await getMemberRole(session.user.id, projectId)
  const isMemberOnly = !session.user.isSystemAdmin && role === "MEMBER"

  const cards = await findBacklogCards(
    projectId,
    isMemberOnly ? session.user.id : undefined
  )

  return { success: true, data: cards }
}
```

- [ ] **Step 3: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/server/actions/cards.ts
git commit -m "feat: action getProjectBacklogCardsAction para fetch lazy no dialog de importar"
```

---

### Task 5: Criar `BacklogFilters` component

**Files:**
- Create: `src/components/backlog/BacklogFilters.tsx`

Componente isolado com busca + dois selects + botão limpar.

- [ ] **Step 1: Criar o componente**

Criar `src/components/backlog/BacklogFilters.tsx` com o conteúdo:

```tsx
"use client"

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Search, X } from "lucide-react"

interface Member {
  id: string
  user: { id: string; name: string }
}

interface Props {
  searchQuery: string
  priorityFilter: "ALL" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  assigneeFilter: string
  members: Member[]
  onSearchChange: (v: string) => void
  onPriorityChange: (v: "ALL" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL") => void
  onAssigneeChange: (v: string) => void
  onClear: () => void
}

export function BacklogFilters({
  searchQuery,
  priorityFilter,
  assigneeFilter,
  members,
  onSearchChange,
  onPriorityChange,
  onAssigneeChange,
  onClear,
}: Props) {
  const hasActive = searchQuery !== "" || priorityFilter !== "ALL" || assigneeFilter !== "ALL"

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por título..."
          className="pl-8 h-9"
        />
      </div>

      <Select value={priorityFilter} onValueChange={(v) => onPriorityChange(v as typeof priorityFilter)}>
        <SelectTrigger className="w-[150px] h-9">
          <SelectValue placeholder="Prioridade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Todas prioridades</SelectItem>
          <SelectItem value="LOW">Baixa</SelectItem>
          <SelectItem value="MEDIUM">Média</SelectItem>
          <SelectItem value="HIGH">Alta</SelectItem>
          <SelectItem value="CRITICAL">Crítica</SelectItem>
        </SelectContent>
      </Select>

      <Select value={assigneeFilter} onValueChange={onAssigneeChange}>
        <SelectTrigger className="w-[180px] h-9">
          <SelectValue placeholder="Responsável" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Todos responsáveis</SelectItem>
          {members.map((m) => (
            <SelectItem key={m.user.id} value={m.user.id}>
              {m.user.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActive && (
        <Button variant="ghost" size="sm" onClick={onClear} className="h-9 text-muted-foreground">
          <X className="h-3.5 w-3.5 mr-1" />
          Limpar
        </Button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/backlog/BacklogFilters.tsx
git commit -m "feat: componente BacklogFilters com busca, prioridade e responsável"
```

---

### Task 6: Criar `MoveToSprintMenu` component

**Files:**
- Create: `src/components/backlog/MoveToSprintMenu.tsx`

Dropdown reutilizável que dispara `onMove(sprintId)` quando o usuário escolhe uma sprint. Usado no bulk-actions bar.

- [ ] **Step 1: Criar o componente**

Criar `src/components/backlog/MoveToSprintMenu.tsx`:

```tsx
"use client"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ChevronDown } from "lucide-react"

interface SprintLite {
  id: string
  name: string
  status: string
}

interface Props {
  sprints: SprintLite[]
  onMove: (sprintId: string) => void
  triggerLabel?: string
  disabled?: boolean
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Ativa",
  PLANNED: "Planejada",
}

export function MoveToSprintMenu({ sprints, onMove, triggerLabel = "Mover para sprint", disabled }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled || sprints.length === 0}>
          {triggerLabel}
          <ChevronDown className="h-3.5 w-3.5 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[220px]">
        <DropdownMenuLabel>Escolha uma sprint</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {sprints.length === 0 ? (
          <DropdownMenuItem disabled>Nenhuma sprint disponível</DropdownMenuItem>
        ) : (
          sprints.map((s) => (
            <DropdownMenuItem key={s.id} onClick={() => onMove(s.id)}>
              <span className="flex-1 truncate">{s.name}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {STATUS_LABEL[s.status] ?? s.status}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

- [ ] **Step 2: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/backlog/MoveToSprintMenu.tsx
git commit -m "feat: componente MoveToSprintMenu reutilizável"
```

---

### Task 7: Criar `BacklogCardRow` component

**Files:**
- Create: `src/components/backlog/BacklogCardRow.tsx`

Linha individual de card no backlog. Checkbox + título/metadados + menu ⋯ com submenu de sprints.

- [ ] **Step 1: Criar o componente**

Criar `src/components/backlog/BacklogCardRow.tsx`:

```tsx
"use client"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Calendar } from "lucide-react"

interface Tag {
  id: string
  name: string
  color: string
}

interface SprintLite {
  id: string
  name: string
  status: string
}

interface Card {
  id: string
  title: string
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  storyPoints: number | null
  dueDate: Date | null
  assignee: { id: string; name: string; avatarUrl: string | null } | null
  tags: { tag: Tag }[]
  mainActivity: { id: string; name: string; color: string } | null
  _count: { comments: number; checklists: number }
}

interface Props {
  card: Card
  selected: boolean
  onToggleSelect: (id: string) => void
  onOpen: (id: string) => void
  sprints: SprintLite[]
  canMove: boolean
  canArchive: boolean
  onMoveToSprint: (cardId: string, sprintId: string) => void
  onArchive: (cardId: string) => void
}

const PRIORITY_CONFIG = {
  LOW: { label: "Baixa", className: "text-slate-600 bg-slate-100" },
  MEDIUM: { label: "Média", className: "text-blue-700 bg-blue-50" },
  HIGH: { label: "Alta", className: "text-orange-700 bg-orange-50" },
  CRITICAL: { label: "Crítica", className: "text-red-700 bg-red-50" },
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Ativa",
  PLANNED: "Planejada",
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("pt-BR", { day: "numeric", month: "short" }).replace(".", "")
}

export function BacklogCardRow({
  card,
  selected,
  onToggleSelect,
  onOpen,
  sprints,
  canMove,
  canArchive,
  onMoveToSprint,
  onArchive,
}: Props) {
  const prio = PRIORITY_CONFIG[card.priority]

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow ${
        selected ? "ring-2 ring-primary/30" : ""
      }`}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggleSelect(card.id)}
        className="h-4 w-4 rounded border-gray-300 cursor-pointer mt-1 flex-shrink-0"
        aria-label={`Selecionar ${card.title}`}
      />

      <button
        type="button"
        className="flex-1 min-w-0 text-left"
        onClick={() => onOpen(card.id)}
      >
        {card.mainActivity && (
          <div className="flex items-center gap-1 mb-1">
            <span
              className="h-1.5 w-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: card.mainActivity.color }}
            />
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground truncate">
              {card.mainActivity.name}
            </span>
          </div>
        )}

        <p className="text-sm font-medium truncate">{card.title}</p>

        <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs text-muted-foreground">
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${prio.className}`}>
            {prio.label}
          </span>
          {card.storyPoints != null && <span>{card.storyPoints} pts</span>}
          {card.assignee && (
            <span className="flex items-center gap-1">
              <span className="h-4 w-4 rounded-full bg-primary/15 flex items-center justify-center text-[9px] font-semibold text-primary">
                {getInitials(card.assignee.name)}
              </span>
              {card.assignee.name}
            </span>
          )}
          {card.dueDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(card.dueDate)}
            </span>
          )}
          {card.tags.length > 0 && (
            <span>· {card.tags.length} {card.tags.length === 1 ? "tag" : "tags"}</span>
          )}
          {card._count.comments > 0 && <span>· {card._count.comments} coment.</span>}
        </div>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 flex-shrink-0"
            aria-label="Ações"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onOpen(card.id)}>Abrir</DropdownMenuItem>

          {canMove && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Mover para sprint</DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuLabel>Escolha uma sprint</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {sprints.length === 0 ? (
                    <DropdownMenuItem disabled>Nenhuma sprint disponível</DropdownMenuItem>
                  ) : (
                    sprints.map((s) => (
                      <DropdownMenuItem key={s.id} onClick={() => onMoveToSprint(card.id, s.id)}>
                        <span className="flex-1 truncate">{s.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {STATUS_LABEL[s.status] ?? s.status}
                        </span>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          )}

          {canArchive && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onArchive(card.id)}
              >
                Arquivar
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
```

- [ ] **Step 2: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/backlog/BacklogCardRow.tsx
git commit -m "feat: componente BacklogCardRow com checkbox e menu de ações"
```

---

### Task 8: Criar `BacklogList` orchestrator component

**Files:**
- Create: `src/components/backlog/BacklogList.tsx`

Orquestra filtros, seleção em massa, lista de rows e o CardDetailModal.

- [ ] **Step 1: Criar o componente**

Criar `src/components/backlog/BacklogList.tsx`:

```tsx
"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { BacklogFilters } from "./BacklogFilters"
import { BacklogCardRow } from "./BacklogCardRow"
import { MoveToSprintMenu } from "./MoveToSprintMenu"
import { CardDetailModal } from "@/components/cards/CardDetailModal"
import { Button } from "@/components/ui/button"
import { addCardToSprintAction, archiveCardAction, bulkAddCardsToSprintAction } from "@/server/actions/cards"

interface Tag {
  id: string
  name: string
  color: string
}

interface Member {
  id: string
  user: { id: string; name: string }
}

interface SprintLite {
  id: string
  name: string
  status: string
}

interface Card {
  id: string
  projectId: string
  title: string
  description: string | null
  status: string
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  storyPoints: number | null
  dueDate: Date | null
  assigneeId: string | null
  assignee: { id: string; name: string; avatarUrl: string | null } | null
  tags: { tag: Tag }[]
  mainActivity: { id: string; name: string; color: string } | null
  mainActivityId?: string | null
  _count: { comments: number; checklists: number }
}

interface Props {
  cards: Card[]
  members: Member[]
  allTags: Tag[]
  sprints: SprintLite[]
  canMove: boolean
  canArchive: boolean
  currentUserId: string
}

type PriorityFilter = "ALL" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"

export function BacklogList({
  cards,
  members,
  allTags,
  sprints,
  canMove,
  canArchive,
  currentUserId,
}: Props) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [openCardId, setOpenCardId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("ALL")
  const [assigneeFilter, setAssigneeFilter] = useState<string>("ALL")
  const [actionError, setActionError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return cards.filter((c) => {
      if (q && !c.title.toLowerCase().includes(q)) return false
      if (priorityFilter !== "ALL" && c.priority !== priorityFilter) return false
      if (assigneeFilter !== "ALL" && c.assigneeId !== assigneeFilter) return false
      return true
    })
  }, [cards, searchQuery, priorityFilter, assigneeFilter])

  const openCard = openCardId ? cards.find((c) => c.id === openCardId) ?? null : null

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function clearFilters() {
    setSearchQuery("")
    setPriorityFilter("ALL")
    setAssigneeFilter("ALL")
  }

  async function handleMoveSingle(cardId: string, sprintId: string) {
    setActionError(null)
    const result = await addCardToSprintAction(cardId, sprintId)
    if (!result.success) {
      setActionError(result.error)
      return
    }
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(cardId)
      return next
    })
    router.refresh()
  }

  async function handleMoveBulk(sprintId: string) {
    setActionError(null)
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    const result = await bulkAddCardsToSprintAction(ids, sprintId)
    if (!result.success) {
      setActionError(result.error)
      return
    }
    setSelectedIds(new Set())
    router.refresh()
  }

  async function handleArchive(cardId: string) {
    if (!confirm("Arquivar este card?")) return
    setActionError(null)
    const result = await archiveCardAction(cardId)
    if (!result.success) {
      setActionError(result.error)
      return
    }
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(cardId)
      return next
    })
    router.refresh()
  }

  return (
    <div>
      <BacklogFilters
        searchQuery={searchQuery}
        priorityFilter={priorityFilter}
        assigneeFilter={assigneeFilter}
        members={members}
        onSearchChange={setSearchQuery}
        onPriorityChange={setPriorityFilter}
        onAssigneeChange={setAssigneeFilter}
        onClear={clearFilters}
      />

      {selectedIds.size > 0 && canMove && (
        <div className="flex items-center justify-between gap-2 mb-3 p-2.5 rounded-lg bg-accent border">
          <span className="text-sm font-medium">
            {selectedIds.size} {selectedIds.size === 1 ? "card selecionado" : "cards selecionados"}
          </span>
          <div className="flex items-center gap-2">
            <MoveToSprintMenu
              sprints={sprints}
              onMove={handleMoveBulk}
              triggerLabel={`Mover ${selectedIds.size} para sprint`}
            />
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {actionError && (
        <p className="text-sm text-destructive mb-3">{actionError}</p>
      )}

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>{cards.length === 0 ? "Nenhum card no backlog." : "Nenhum card corresponde aos filtros."}</p>
          </div>
        ) : (
          filtered.map((card) => (
            <BacklogCardRow
              key={card.id}
              card={card}
              selected={selectedIds.has(card.id)}
              onToggleSelect={toggleSelect}
              onOpen={setOpenCardId}
              sprints={sprints}
              canMove={canMove}
              canArchive={canArchive}
              onMoveToSprint={handleMoveSingle}
              onArchive={handleArchive}
            />
          ))
        )}
      </div>

      {openCard && (
        <CardDetailModal
          card={{
            id: openCard.id,
            projectId: openCard.projectId,
            title: openCard.title,
            description: openCard.description,
            status: openCard.status,
            priority: openCard.priority,
            storyPoints: openCard.storyPoints,
            dueDate: openCard.dueDate,
            assigneeId: openCard.assigneeId,
            tags: openCard.tags,
            mainActivityId: openCard.mainActivityId,
          }}
          members={members}
          allTags={allTags}
          activities={[]}
          open={!!openCardId}
          onClose={() => setOpenCardId(null)}
          currentUserId={currentUserId}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/backlog/BacklogList.tsx
git commit -m "feat: componente BacklogList orquestrando filtros, seleção e modal"
```

---

### Task 9: Atualizar `/backlog/page.tsx` para usar `BacklogList`

**Files:**
- Modify: `src/app/(app)/projetos/[slug]/backlog/page.tsx`

A página passa de uma lista crua para usar o novo `BacklogList`. Também precisa buscar tags e calcular flags de permissão.

- [ ] **Step 1: Reescrever o arquivo inteiro**

Substituir TODO o conteúdo de `src/app/(app)/projetos/[slug]/backlog/page.tsx` por:

```tsx
import { notFound, redirect } from "next/navigation"
import { auth } from "@/server/auth/config"
import { findProjectBySlug } from "@/server/repositories/projects"
import { findBacklogCards } from "@/server/repositories/cards"
import { findMembersByProjectId } from "@/server/repositories/members"
import { findSprintsByProjectId } from "@/server/repositories/sprints"
import { findTagsByProjectId } from "@/server/repositories/tags"
import { getMemberRole } from "@/server/permissions"
import { BacklogList } from "@/components/backlog/BacklogList"
import { CardForm } from "@/components/cards/CardForm"

interface Props {
  params: Promise<{ slug: string }>
}

export default async function BacklogPage({ params }: Props) {
  const session = await auth()
  if (!session) redirect("/login")

  const { slug } = await params
  const project = await findProjectBySlug(slug)
  if (!project) notFound()

  const currentRole = await getMemberRole(session.user.id, project.id)
  const canCreate = !!currentRole
  const canMove = !!currentRole
  const canArchive =
    session.user.isSystemAdmin || currentRole === "ADMIN" || currentRole === "SCRUM_MASTER"

  const isMemberOnly =
    !session.user.isSystemAdmin && currentRole === "MEMBER"

  const [cards, members, allTags, sprints] = await Promise.all([
    findBacklogCards(project.id, isMemberOnly ? session.user.id : undefined),
    findMembersByProjectId(project.id),
    findTagsByProjectId(project.id),
    findSprintsByProjectId(project.id),
  ])

  const targetableSprints = sprints
    .filter((s) => s.status === "PLANNED" || s.status === "ACTIVE")
    .map((s) => ({ id: s.id, name: s.name, status: s.status }))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Backlog</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {project.name} · {cards.length} {cards.length === 1 ? "card" : "cards"} no backlog
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <BacklogList
            cards={cards}
            members={members}
            allTags={allTags}
            sprints={targetableSprints}
            canMove={canMove}
            canArchive={canArchive}
            currentUserId={session.user.id}
          />
        </div>

        {canCreate && (
          <div>
            <CardForm
              projectId={project.id}
              members={members}
            />
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Smoke test visual**

Run: `npm run dev` (em background)
Abra `http://localhost:3000/projetos/<algum-slug>/backlog`
Verificar:
- Lista de cards renderizada com formato novo (mainActivity, prioridade colorida, tags)
- Filtros funcionam
- Selecionar 1+ cards → barra "X selecionado(s)" aparece com "Mover para sprint"
- Clicar num card → abre `CardDetailModal` sem seção "Sprint" nem "Atividade"
- Form "Novo card" na sidebar continua funcionando

Encerrar `npm run dev` quando ok.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/projetos/[slug]/backlog/page.tsx"
git commit -m "feat: backlog do projeto com filtros, seleção em massa e abrir/editar"
```

---

### Task 10: Criar `ImportBacklogDialog` component

**Files:**
- Create: `src/components/backlog/ImportBacklogDialog.tsx`

Modal de seleção múltipla aberto pela coluna BACKLOG do kanban. Fetch lazy via `getProjectBacklogCardsAction`.

- [ ] **Step 1: Criar o componente**

Criar `src/components/backlog/ImportBacklogDialog.tsx`:

```tsx
"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"
import { getProjectBacklogCardsAction, bulkAddCardsToSprintAction } from "@/server/actions/cards"

interface Tag {
  id: string
  name: string
  color: string
}

interface BacklogCard {
  id: string
  title: string
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  mainActivity: { id: string; name: string; color: string } | null
  tags: { tag: Tag }[]
  assignee: { id: string; name: string; avatarUrl: string | null } | null
}

interface Props {
  open: boolean
  onClose: () => void
  projectId: string
  sprintId: string
}

const PRIORITY_CONFIG = {
  LOW: { label: "Baixa", className: "text-slate-600 bg-slate-100" },
  MEDIUM: { label: "Média", className: "text-blue-700 bg-blue-50" },
  HIGH: { label: "Alta", className: "text-orange-700 bg-orange-50" },
  CRITICAL: { label: "Crítica", className: "text-red-700 bg-red-50" },
}

export function ImportBacklogDialog({ open, onClose, projectId, sprintId }: Props) {
  const router = useRouter()
  const [cards, setCards] = useState<BacklogCard[] | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    let cancelled = false
    setCards(null)
    setSelectedIds(new Set())
    setSearchQuery("")
    setError(null)

    getProjectBacklogCardsAction(projectId).then((result) => {
      if (cancelled) return
      if (!result.success) {
        setError(result.error)
        setCards([])
        return
      }
      setCards(
        (result.data ?? []).map((c) => ({
          id: c.id,
          title: c.title,
          priority: c.priority,
          mainActivity: c.mainActivity,
          tags: c.tags,
          assignee: c.assignee,
        }))
      )
    }).catch(() => {
      if (!cancelled) {
        setError("Não foi possível carregar o backlog.")
        setCards([])
      }
    })

    return () => { cancelled = true }
  }, [open, projectId])

  const filtered = useMemo(() => {
    if (!cards) return []
    const q = searchQuery.trim().toLowerCase()
    if (!q) return cards
    return cards.filter((c) => c.title.toLowerCase().includes(q))
  }, [cards, searchQuery])

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleImport() {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    setImporting(true)
    setError(null)
    const result = await bulkAddCardsToSprintAction(ids, sprintId)
    setImporting(false)
    if (!result.success) {
      setError(result.error)
      return
    }
    onClose()
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar do backlog do projeto</DialogTitle>
          <DialogDescription>
            Selecione os cards que serão movidos para esta sprint (coluna Backlog).
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título..."
            className="pl-8 h-9"
            disabled={cards === null}
          />
        </div>

        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          {cards === null ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {cards.length === 0
                ? "Nenhum card no backlog do projeto."
                : "Nenhum card corresponde à busca."}
            </p>
          ) : (
            <div className="space-y-1">
              {filtered.map((card) => {
                const prio = PRIORITY_CONFIG[card.priority]
                const selected = selectedIds.has(card.id)
                return (
                  <label
                    key={card.id}
                    className={`flex items-start gap-3 p-2 rounded-md border cursor-pointer hover:bg-accent ${
                      selected ? "bg-accent border-primary/30" : "border-transparent"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggle(card.id)}
                      className="h-4 w-4 rounded border-gray-300 cursor-pointer mt-0.5 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      {card.mainActivity && (
                        <div className="flex items-center gap-1 mb-0.5">
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: card.mainActivity.color }}
                          />
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground truncate">
                            {card.mainActivity.name}
                          </span>
                        </div>
                      )}
                      <p className="text-sm font-medium truncate">{card.title}</p>
                    </div>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0 ${prio.className}`}>
                      {prio.label}
                    </span>
                  </label>
                )
              })}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={importing}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={selectedIds.size === 0 || importing}
          >
            {importing
              ? "Importando..."
              : `Importar ${selectedIds.size} ${selectedIds.size === 1 ? "card" : "cards"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/backlog/ImportBacklogDialog.tsx
git commit -m "feat: ImportBacklogDialog com seleção múltipla e fetch lazy"
```

---

### Task 11: Criar `AddCardMenu` component

**Files:**
- Create: `src/components/board/AddCardMenu.tsx`

Botão único com dropdown de 2 opções (Criar novo / Importar do backlog). Apenas a UI; o pai (`KanbanColumn`) controla o que acontece em cada ação.

- [ ] **Step 1: Criar o componente**

Criar `src/components/board/AddCardMenu.tsx`:

```tsx
"use client"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Plus, ChevronDown, ArrowDownToLine } from "lucide-react"

interface Props {
  onCreateNew: () => void
  onImport: () => void
  canImport: boolean
}

export function AddCardMenu({ onCreateNew, onImport, canImport }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground text-xs h-7 mt-1"
        >
          <Plus className="h-3 w-3 mr-1" />
          Adicionar card
          <ChevronDown className="h-3 w-3 ml-auto" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[220px]">
        <DropdownMenuItem onClick={onCreateNew}>
          <Plus className="h-3.5 w-3.5 mr-2" />
          Criar novo card
        </DropdownMenuItem>
        {canImport && (
          <DropdownMenuItem onClick={onImport}>
            <ArrowDownToLine className="h-3.5 w-3.5 mr-2" />
            Importar do backlog do projeto
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

- [ ] **Step 2: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/board/AddCardMenu.tsx
git commit -m "feat: AddCardMenu para coluna BACKLOG do kanban"
```

---

### Task 12: Integrar `AddCardMenu` + `ImportBacklogDialog` no `KanbanColumn`

**Files:**
- Modify: `src/components/board/KanbanColumn.tsx`

Apenas a coluna `BACKLOG` recebe o novo menu; as demais (DOING/VALIDATION/DONE) continuam exatamente como hoje.

- [ ] **Step 1: Reescrever o arquivo inteiro**

Substituir TODO o conteúdo de `src/components/board/KanbanColumn.tsx` por:

```tsx
"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CardItem } from "./CardItem"
import { AddCardMenu } from "./AddCardMenu"
import { ImportBacklogDialog } from "@/components/backlog/ImportBacklogDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createCardAction } from "@/server/actions/cards"
import { Plus, X } from "lucide-react"

interface Card {
  id: string
  title: string
  status: string
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  storyPoints: number | null
  dueDate: Date | null
  assignee: { id: string; name: string; avatarUrl: string | null } | null
  _count: { comments: number; checklists: number }
  checklistsDone: number
  mainActivity: { id: string; name: string; color: string } | null
}

interface Props {
  id: string
  title: string
  cards: Card[]
  onCardClick?: (cardId: string) => void
  projectId: string
  sprintId: string
}

export function KanbanColumn({ id, title, cards, onCardClick, projectId, sprintId }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [title_input, setTitleInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const isBacklog = id === "BACKLOG"

  async function handleAdd() {
    const t = title_input.trim()
    if (!t) return
    setLoading(true)
    const fd = new FormData()
    fd.set("title", t)
    fd.set("sprintId", sprintId)
    const result = await createCardAction(projectId, fd)
    setLoading(false)
    if (result.success) {
      setTitleInput("")
      setAdding(false)
      router.refresh()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleAdd()
    if (e.key === "Escape") { setAdding(false); setTitleInput("") }
  }

  return (
    <div className="flex flex-col gap-2 min-w-[260px] flex-1">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {title}
        </h3>
        <Badge variant="outline" className="text-xs">{cards.length}</Badge>
      </div>

      <div
        ref={setNodeRef}
        className={`flex flex-col gap-2 rounded-lg p-2 min-h-[200px] transition-colors ${
          isOver ? "bg-accent" : "bg-muted/30"
        }`}
      >
        <SortableContext
          items={cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((card) => (
            <CardItem key={card.id} card={card} onCardClick={onCardClick} />
          ))}
        </SortableContext>

        {adding ? (
          <div className="flex flex-col gap-1 mt-1">
            <Input
              ref={inputRef}
              autoFocus
              placeholder="Título do card..."
              value={title_input}
              onChange={(e) => setTitleInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              className="text-sm h-8"
            />
            <div className="flex gap-1">
              <Button size="sm" className="h-7 text-xs flex-1" onClick={handleAdd} disabled={loading || !title_input.trim()}>
                {loading ? "Criando..." : "Adicionar"}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setAdding(false); setTitleInput("") }}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ) : isBacklog ? (
          <AddCardMenu
            onCreateNew={() => setAdding(true)}
            onImport={() => setImportOpen(true)}
            canImport={true}
          />
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground text-xs h-7 mt-1"
            onClick={() => setAdding(true)}
          >
            <Plus className="h-3 w-3 mr-1" /> Adicionar card
          </Button>
        )}
      </div>

      {isBacklog && (
        <ImportBacklogDialog
          open={importOpen}
          onClose={() => setImportOpen(false)}
          projectId={projectId}
          sprintId={sprintId}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Smoke test visual**

Run: `npm run dev`
Abra `http://localhost:3000/projetos/<slug>/sprints/<id>/board`
Verificar:
- Coluna BACKLOG mostra "+ Adicionar card ▾" com chevron
- Clicar abre menu com "Criar novo card" e "Importar do backlog do projeto"
- "Criar novo card" mostra o input inline como antes
- "Importar do backlog" abre o dialog
- No dialog: lista cards do backlog do projeto, busca funciona, checkboxes
- Selecionar 1+ cards e clicar "Importar X cards" move os cards
- Cards importados aparecem na coluna BACKLOG da sprint
- Cards importados somem da página `/backlog`
- Demais colunas (DOING/VALIDATION/DONE) inalteradas

Encerrar `npm run dev`.

- [ ] **Step 4: Commit**

```bash
git add src/components/board/KanbanColumn.tsx
git commit -m "feat: coluna BACKLOG do kanban com menu \"importar do backlog\""
```

---

### Task 13: Verificação final + checklist manual

**Files:** nenhum.

Confirmação ponta-a-ponta de tudo que o spec especifica.

- [ ] **Step 1: Type-check completo**

Run: `npx tsc --noEmit`
Expected: sem nenhum erro.

- [ ] **Step 2: Verificar lista de arquivos novos/modificados**

Run: `git log --oneline --since="1 day ago" | head -20`
Expected (algo como):
```
<sha> feat: coluna BACKLOG do kanban com menu "importar do backlog"
<sha> feat: AddCardMenu para coluna BACKLOG do kanban
<sha> feat: ImportBacklogDialog com seleção múltipla e fetch lazy
<sha> feat: backlog do projeto com filtros, seleção em massa e abrir/editar
<sha> feat: componente BacklogList orquestrando filtros, seleção e modal
<sha> feat: componente BacklogCardRow com checkbox e menu de ações
<sha> feat: componente MoveToSprintMenu reutilizável
<sha> feat: componente BacklogFilters com busca, prioridade e responsável
<sha> feat: action getProjectBacklogCardsAction para fetch lazy no dialog
<sha> feat: action bulkAddCardsToSprintAction para importar do backlog
<sha> feat: schema Zod para bulk add cards a sprint
<sha> feat: enriquecer findBacklogCards com tags e mainActivity
```

- [ ] **Step 3: Verificação manual completa (checklist do spec)**

Run: `npm run dev`
Logar como ADMIN/SCRUM_MASTER e verificar:

**Página `/projetos/<slug>/backlog`:**
- [ ] Lista cards com mainActivity (dot+nome) e prioridade colorida
- [ ] Busca por título funciona (case-insensitive)
- [ ] Filtro de prioridade funciona
- [ ] Filtro de responsável funciona
- [ ] Filtros combinados funcionam
- [ ] Botão "Limpar" só aparece com filtro ativo e limpa tudo
- [ ] Clicar no card → abre CardDetailModal sem seção "Sprint" e sem seção "Atividade"
- [ ] Editar e salvar card pelo modal atualiza a lista
- [ ] Menu ⋯ → "Abrir" abre o modal
- [ ] Menu ⋯ → "Mover para sprint" → submenu lista sprints PLANNED + ACTIVE → ao escolher move
- [ ] Menu ⋯ → "Arquivar" pede confirmação e remove
- [ ] Selecionar checkbox → barra "X selecionado(s)" aparece
- [ ] Selecionar múltiplos + "Mover N para sprint" → escolher sprint → move todos
- [ ] Form "Novo card" na sidebar continua criando

**Coluna BACKLOG do kanban (`/projetos/<slug>/sprints/<id>/board`):**
- [ ] Botão "+ Adicionar card ▾" mostra chevron
- [ ] Clicar abre menu com "Criar novo card" e "Importar do backlog do projeto"
- [ ] "Criar novo card" mostra input inline como antes; cria card
- [ ] "Importar do backlog" abre dialog
- [ ] Dialog mostra "Carregando..." brevemente
- [ ] Cards listados com mainActivity + prioridade
- [ ] Busca no dialog funciona
- [ ] Selecionar cards habilita "Importar X cards"
- [ ] Importar move cards para a coluna BACKLOG da sprint
- [ ] Cards importados somem do `/backlog`
- [ ] Backlog vazio mostra mensagem "Nenhum card no backlog do projeto."
- [ ] Demais colunas (DOING/VALIDATION/DONE) sem mudança visual nem comportamental

**Como MEMBER (não admin):**
- [ ] Página `/backlog` só mostra cards atribuídos a ele
- [ ] Dialog "Importar do backlog" também só mostra cards próprios
- [ ] Opção "Arquivar" no menu ⋯ NÃO aparece (canArchive=false)
- [ ] Opção "Mover para sprint" continua aparecendo (canMove=true para MEMBER)

Encerrar `npm run dev`.

- [ ] **Step 4: Commit final (se houve ajustes inline)**

Se nenhum ajuste foi necessário, pular. Senão:

```bash
git add -A
git commit -m "fix: ajustes finais na feature backlog/import"
```

---

## Notas para o engenheiro

- **Mudanças no `CardDetailModal`:** intencionalmente nenhuma. As props `sprintName={undefined}` e `activities={[]}` já fazem o modal esconder as seções correspondentes (`{sprintName && (...)}` e `{activities.length > 0 && (...)}`).

- **Por que `revalidatePath("/", "layout")`?** Ações que mudam estado de cards devem invalidar tanto o `/backlog` quanto o `/sprints/[id]/board`. O escopo `"layout"` força revalidação em árvore inteira — é o mesmo padrão usado pelas demais actions de card no projeto.

- **Performance:** `findBacklogCards` não tem paginação. Para projetos com >200 cards de backlog isso pode pesar; está documentado no spec como aceitável para a primeira iteração.

- **Audit log do bulk move:** intencionalmente um INSERT por card (loop em `Promise.all`). Preservar rastreabilidade individual vale o custo, dado o limite de 100 cards por chamada definido no schema.

- **Permissões:** `card:move` é checada server-side por `bulkAddCardsToSprintAction` antes do `updateMany`. A UI esconde botões/menus quando `canMove=false`, mas confiar só no client seria inseguro — o backend valida sempre.
