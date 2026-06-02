# Módulo Comercial — Kanban de Oportunidades — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar módulo Comercial standalone com kanban de 7 colunas (Suspect → Perdido), drag-and-drop entre colunas e CRUD completo de oportunidades.

**Architecture:** Server Component na página carrega dados; Client Components gerenciam DnD e modal; Server Actions fazem mutações e chamam `revalidatePath`. Padrão idêntico ao restante do projeto: repository → service → action.

**Tech Stack:** Next.js 15 App Router, Prisma ORM, TypeScript, Tailwind CSS, shadcn/ui (Dialog, Button, Input, Select, Textarea, Label), Lucide React, Zod, @dnd-kit/core, @dnd-kit/sortable, Vitest.

---

## Mapa de Arquivos

| Arquivo | Operação | Responsabilidade |
|---|---|---|
| `prisma/schema.prisma` | Modificar | Enum `EtapaComercial` + model `Oportunidade` + relações no User |
| `src/lib/comercial.ts` | Criar | Config das 7 colunas + helper `getEtapaConfig` |
| `src/lib/schemas/oportunidades.ts` | Criar | Schema Zod para criar/editar oportunidade |
| `src/server/repositories/oportunidades.ts` | Criar | CRUD Prisma + moveEtapa |
| `src/server/services/oportunidades.ts` | Criar | Camada de serviço |
| `src/server/actions/oportunidades.ts` | Criar | Server Actions + revalidatePath |
| `src/components/layout/SidebarNav.tsx` | Modificar | Adicionar item "Comercial" |
| `src/app/(app)/comercial/page.tsx` | Criar | Server Component — carrega dados |
| `src/components/comercial/ComercialCard.tsx` | Criar | Card visual com useSortable |
| `src/components/comercial/ComercialColumn.tsx` | Criar | Coluna com useDroppable + SortableContext |
| `src/components/comercial/OportunidadeModal.tsx` | Criar | Modal criar/editar/excluir |
| `src/components/comercial/ComercialKanban.tsx` | Criar | DndContext + estado + orquestração |
| `tests/unit/comercial.test.ts` | Criar | Testes unitários para helpers de comercial.ts |

---

## Task 1: Schema Prisma + Migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Adicionar enum EtapaComercial ao schema**

Abra `prisma/schema.prisma`. Localize o bloco de enums (procure por `enum CardStatus`). Adicione logo após todos os enums existentes, antes dos models:

```prisma
enum EtapaComercial {
  SUSPECT
  LEAD
  PROSPECT_C
  PROSPECT_B
  PROSPECT_A
  CONCLUIDO
  PERDIDO
}
```

- [ ] **Step 2: Adicionar model Oportunidade**

Adicione ao final do arquivo, após o último model (`MainActivity`):

```prisma
model Oportunidade {
  id              String         @id @default(cuid())
  cliente         String
  produto         String?
  origemLead      String?        @map("origem_lead")
  descricao       String?
  valor           Decimal?       @db.Decimal(14, 2)
  prazoFechamento DateTime?      @map("prazo_fechamento")
  etapa           EtapaComercial @default(SUSPECT)
  responsavelId   String?        @map("responsavel_id")
  responsavel     User?          @relation("OportunidadeResponsavel", fields: [responsavelId], references: [id])
  createdById     String         @map("created_by_id")
  createdBy       User           @relation("OportunidadeCriador", fields: [createdById], references: [id])
  createdAt       DateTime       @default(now()) @map("created_at")
  updatedAt       DateTime       @updatedAt @map("updated_at")

  @@map("oportunidades")
}
```

- [ ] **Step 3: Adicionar relações inversas no model User**

No model `User` (linha 66), adicione as duas linhas abaixo junto às outras relações, antes de `@@map("users")`:

```prisma
  oportunidadesCriadas     Oportunidade[] @relation("OportunidadeCriador")
  oportunidadesResponsavel Oportunidade[] @relation("OportunidadeResponsavel")
```

- [ ] **Step 4: Executar migration**

```bash
npx prisma migrate dev --name add_comercial_oportunidades
```

Saída esperada:
```
✔ Your database is now in sync with your schema.
Generated Prisma Client
```

- [ ] **Step 5: Verificar geração do client**

```bash
npx prisma generate
```

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: schema Prisma para módulo comercial"
```

---

## Task 2: Config de Colunas + Testes

**Files:**
- Create: `src/lib/comercial.ts`
- Create: `tests/unit/comercial.test.ts`

- [ ] **Step 1: Escrever o teste antes da implementação**

Crie `tests/unit/comercial.test.ts`:

```typescript
import { describe, it, expect } from "vitest"
import { COLUNAS_COMERCIAL, getEtapaConfig } from "@/lib/comercial"
import { EtapaComercial } from "@prisma/client"

describe("COLUNAS_COMERCIAL", () => {
  it("deve ter 7 colunas", () => {
    expect(COLUNAS_COMERCIAL).toHaveLength(7)
  })

  it("deve ter as colunas na ordem correta", () => {
    const ids = COLUNAS_COMERCIAL.map((c) => c.enum)
    expect(ids).toEqual([
      EtapaComercial.SUSPECT,
      EtapaComercial.LEAD,
      EtapaComercial.PROSPECT_C,
      EtapaComercial.PROSPECT_B,
      EtapaComercial.PROSPECT_A,
      EtapaComercial.CONCLUIDO,
      EtapaComercial.PERDIDO,
    ])
  })
})

describe("getEtapaConfig", () => {
  it("retorna config correta para SUSPECT", () => {
    const config = getEtapaConfig(EtapaComercial.SUSPECT)
    expect(config.label).toBe("Suspect")
    expect(config.enum).toBe(EtapaComercial.SUSPECT)
  })

  it("retorna config correta para CONCLUIDO", () => {
    const config = getEtapaConfig(EtapaComercial.CONCLUIDO)
    expect(config.label).toBe("Concluído")
  })

  it("retorna config correta para PERDIDO", () => {
    const config = getEtapaConfig(EtapaComercial.PERDIDO)
    expect(config.label).toBe("Perdido")
  })
})
```

- [ ] **Step 2: Rodar teste para confirmar que falha**

```bash
npx vitest run tests/unit/comercial.test.ts
```

Esperado: FAIL — `Cannot find module '@/lib/comercial'`

- [ ] **Step 3: Criar `src/lib/comercial.ts`**

```typescript
import { EtapaComercial } from "@prisma/client"

export interface EtapaConfig {
  enum: EtapaComercial
  label: string
}

export const COLUNAS_COMERCIAL: EtapaConfig[] = [
  { enum: EtapaComercial.SUSPECT,   label: "Suspect" },
  { enum: EtapaComercial.LEAD,      label: "Lead" },
  { enum: EtapaComercial.PROSPECT_C, label: "Prospect C" },
  { enum: EtapaComercial.PROSPECT_B, label: "Prospect B" },
  { enum: EtapaComercial.PROSPECT_A, label: "Prospect A" },
  { enum: EtapaComercial.CONCLUIDO, label: "Concluído" },
  { enum: EtapaComercial.PERDIDO,   label: "Perdido" },
]

export function getEtapaConfig(etapa: EtapaComercial): EtapaConfig {
  const config = COLUNAS_COMERCIAL.find((c) => c.enum === etapa)
  if (!config) throw new Error(`Etapa desconhecida: ${etapa}`)
  return config
}
```

- [ ] **Step 4: Rodar teste para confirmar que passa**

```bash
npx vitest run tests/unit/comercial.test.ts
```

Esperado: `Tests 5 passed (5)`

- [ ] **Step 5: Commit**

```bash
git add src/lib/comercial.ts tests/unit/comercial.test.ts
git commit -m "feat: config de colunas do kanban comercial com testes"
```

---

## Task 3: Schema Zod

**Files:**
- Create: `src/lib/schemas/oportunidades.ts`

- [ ] **Step 1: Criar `src/lib/schemas/oportunidades.ts`**

```typescript
import { z } from "zod"
import { EtapaComercial } from "@prisma/client"

export const oportunidadeSchema = z.object({
  cliente: z.string().min(1, "Cliente é obrigatório").max(255),
  produto: z.string().max(255).optional(),
  origemLead: z.string().max(255).optional(),
  descricao: z.string().max(5000).optional(),
  etapa: z.nativeEnum(EtapaComercial),
  valor: z.coerce.number().positive("Valor deve ser positivo").optional().nullable(),
  prazoFechamento: z.coerce.date().optional().nullable(),
  responsavelId: z.string().optional().nullable(),
})

export type OportunidadeInput = z.infer<typeof oportunidadeSchema>
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/schemas/oportunidades.ts
git commit -m "feat: schema Zod para oportunidade comercial"
```

---

## Task 4: Repository

**Files:**
- Create: `src/server/repositories/oportunidades.ts`

- [ ] **Step 1: Criar `src/server/repositories/oportunidades.ts`**

```typescript
import { db } from "@/server/db"
import type { OportunidadeInput } from "@/lib/schemas/oportunidades"
import type { EtapaComercial } from "@prisma/client"

const includeResponsavel = {
  responsavel: {
    select: { id: true, name: true, email: true },
  },
} as const

export async function findAllOportunidades() {
  return db.oportunidade.findMany({
    orderBy: { createdAt: "desc" },
    include: includeResponsavel,
  })
}

export async function findOportunidadeById(id: string) {
  return db.oportunidade.findUnique({
    where: { id },
    include: includeResponsavel,
  })
}

export async function createOportunidade(
  data: OportunidadeInput & { createdById: string }
) {
  return db.oportunidade.create({
    data,
    include: includeResponsavel,
  })
}

export async function updateOportunidade(id: string, data: OportunidadeInput) {
  return db.oportunidade.update({
    where: { id },
    data,
    include: includeResponsavel,
  })
}

export async function moveOportunidadeEtapa(id: string, etapa: EtapaComercial) {
  return db.oportunidade.update({ where: { id }, data: { etapa } })
}

export async function deleteOportunidade(id: string) {
  return db.oportunidade.delete({ where: { id } })
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros relacionados a `oportunidades.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/server/repositories/oportunidades.ts
git commit -m "feat: repository de oportunidades comerciais"
```

---

## Task 5: Service

**Files:**
- Create: `src/server/services/oportunidades.ts`

- [ ] **Step 1: Criar `src/server/services/oportunidades.ts`**

```typescript
import * as repo from "@/server/repositories/oportunidades"
import type { OportunidadeInput } from "@/lib/schemas/oportunidades"
import type { EtapaComercial } from "@prisma/client"

export async function findAllOportunidades() {
  return repo.findAllOportunidades()
}

export async function createOportunidade(data: OportunidadeInput, createdById: string) {
  return repo.createOportunidade({ ...data, createdById })
}

export async function updateOportunidade(id: string, data: OportunidadeInput) {
  const existing = await repo.findOportunidadeById(id)
  if (!existing) throw new Error("Oportunidade não encontrada")
  return repo.updateOportunidade(id, data)
}

export async function moveOportunidadeEtapa(id: string, etapa: EtapaComercial) {
  return repo.moveOportunidadeEtapa(id, etapa)
}

export async function deleteOportunidade(id: string) {
  const existing = await repo.findOportunidadeById(id)
  if (!existing) throw new Error("Oportunidade não encontrada")
  return repo.deleteOportunidade(id)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/server/services/oportunidades.ts
git commit -m "feat: service de oportunidades comerciais"
```

---

## Task 6: Server Actions

**Files:**
- Create: `src/server/actions/oportunidades.ts`

- [ ] **Step 1: Criar `src/server/actions/oportunidades.ts`**

```typescript
"use server"

import { revalidatePath } from "next/cache"
import { getRequiredSession } from "@/server/auth/helpers"
import * as service from "@/server/services/oportunidades"
import { oportunidadeSchema } from "@/lib/schemas/oportunidades"
import { EtapaComercial } from "@prisma/client"

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

export async function createOportunidadeAction(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await getRequiredSession()
    const parsed = oportunidadeSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." }
    }
    const op = await service.createOportunidade(parsed.data, session.user.id)
    revalidatePath("/comercial")
    return { success: true, data: { id: op.id } }
  } catch {
    return { success: false, error: "Erro ao criar oportunidade." }
  }
}

export async function updateOportunidadeAction(
  id: string,
  input: unknown
): Promise<ActionResult> {
  try {
    await getRequiredSession()
    const parsed = oportunidadeSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." }
    }
    await service.updateOportunidade(id, parsed.data)
    revalidatePath("/comercial")
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: "Erro ao atualizar oportunidade." }
  }
}

export async function moveOportunidadeEtapaAction(
  id: string,
  etapa: EtapaComercial
): Promise<ActionResult> {
  try {
    await getRequiredSession()
    await service.moveOportunidadeEtapa(id, etapa)
    revalidatePath("/comercial")
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: "Erro ao mover oportunidade." }
  }
}

export async function deleteOportunidadeAction(
  id: string
): Promise<ActionResult> {
  try {
    await getRequiredSession()
    await service.deleteOportunidade(id)
    revalidatePath("/comercial")
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: "Erro ao excluir oportunidade." }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/server/actions/oportunidades.ts
git commit -m "feat: server actions para oportunidades comerciais"
```

---

## Task 7: Sidebar — Item Comercial

**Files:**
- Modify: `src/components/layout/SidebarNav.tsx`

- [ ] **Step 1: Adicionar Briefcase ao import e item Comercial ao NAV_LINKS**

Abra `src/components/layout/SidebarNav.tsx`. Faça as duas alterações:

Linha 4 — alterar import:
```typescript
import { LayoutGrid, Settings, BarChart3, Briefcase } from "lucide-react"
```

Dentro de `NAV_LINKS`, adicionar entre Projetos e Painel:
```typescript
const NAV_LINKS = [
  { href: "/projetos", activePath: "/projetos", label: "Projetos", icon: LayoutGrid },
  { href: "/comercial", activePath: "/comercial", label: "Comercial", icon: Briefcase },
  { href: "/painel", activePath: "/painel", label: "Painel", icon: BarChart3 },
  { href: "/configuracoes/perfil", activePath: "/configuracoes", label: "Configurações", icon: Settings },
]
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/SidebarNav.tsx
git commit -m "feat: adicionar item Comercial na sidebar"
```

---

## Task 8: Página `/comercial`

**Files:**
- Create: `src/app/(app)/comercial/page.tsx`

- [ ] **Step 1: Criar pasta e arquivo**

```bash
mkdir -p "src/app/(app)/comercial"
```

Crie `src/app/(app)/comercial/page.tsx`:

```typescript
import { getRequiredSession } from "@/server/auth/helpers"
import { findAllOportunidades } from "@/server/repositories/oportunidades"
import { db } from "@/server/db"
import { ComercialKanban } from "@/components/comercial/ComercialKanban"

export default async function ComercialPage() {
  await getRequiredSession()

  const [oportunidades, users] = await Promise.all([
    findAllOportunidades(),
    db.user.findMany({
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ])

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-6 py-4">
        <h1 className="text-xl font-semibold">Comercial</h1>
      </div>
      <div className="flex-1 overflow-hidden">
        <ComercialKanban oportunidades={oportunidades} users={users} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/(app)/comercial/page.tsx"
git commit -m "feat: página do módulo comercial"
```

---

## Task 9: ComercialCard

**Files:**
- Create: `src/components/comercial/ComercialCard.tsx`

- [ ] **Step 1: Criar pasta**

```bash
mkdir -p src/components/comercial
```

- [ ] **Step 2: Criar `src/components/comercial/ComercialCard.tsx`**

```typescript
"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { OportunidadeComResponsavel } from "@/components/comercial/ComercialKanban"

const AVATAR_COLORS = ["bg-blue-500", "bg-purple-500", "bg-green-500", "bg-orange-500", "bg-rose-500"]

interface Props {
  oportunidade: OportunidadeComResponsavel
  onClick: () => void
}

export function ComercialCard({ oportunidade, onClick }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: oportunidade.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const valorFormatado =
    oportunidade.valor != null
      ? new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
          notation: "compact",
          maximumFractionDigits: 1,
        }).format(Number(oportunidade.valor))
      : null

  const prazoFormatado =
    oportunidade.prazoFechamento != null
      ? new Date(oportunidade.prazoFechamento).toLocaleDateString("pt-BR", {
          month: "short",
          year: "2-digit",
        })
      : null

  const inicial = oportunidade.responsavel?.name.charAt(0).toUpperCase()

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="bg-white rounded-lg p-3 shadow-sm border border-border cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
    >
      <div className="font-semibold text-sm text-foreground mb-0.5 truncate">
        {oportunidade.cliente}
      </div>

      {oportunidade.produto && (
        <div className="text-xs text-muted-foreground mb-1 truncate">{oportunidade.produto}</div>
      )}

      {oportunidade.descricao && (
        <div className="text-xs text-foreground/70 mb-2 line-clamp-1">{oportunidade.descricao}</div>
      )}

      <div className="flex items-end justify-between mt-2">
        <div className="flex flex-col gap-0.5">
          {valorFormatado && (
            <span className="text-xs font-semibold text-green-600">{valorFormatado}</span>
          )}
          {prazoFormatado && (
            <span className="text-xs text-muted-foreground">{prazoFormatado}</span>
          )}
        </div>

        {inicial && (
          <div
            title={oportunidade.responsavel?.name}
            className={`w-6 h-6 rounded-full ${AVATAR_COLORS[oportunidade.cliente.charCodeAt(0) % AVATAR_COLORS.length]} flex items-center justify-center text-white text-[9px] font-bold`}
          >
            {inicial}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/comercial/ComercialCard.tsx
git commit -m "feat: ComercialCard — card de oportunidade"
```

---

## Task 10: ComercialColumn

**Files:**
- Create: `src/components/comercial/ComercialColumn.tsx`

- [ ] **Step 1: Criar `src/components/comercial/ComercialColumn.tsx`**

```typescript
"use client"

import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { ComercialCard } from "@/components/comercial/ComercialCard"
import type { EtapaConfig } from "@/lib/comercial"
import type { OportunidadeComResponsavel } from "@/components/comercial/ComercialKanban"

interface Props {
  etapa: EtapaConfig
  oportunidades: OportunidadeComResponsavel[]
  onCardClick: (op: OportunidadeComResponsavel) => void
}

export function ComercialColumn({ etapa, oportunidades, onCardClick }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: etapa.enum })

  return (
    <div className="flex flex-col w-[220px] shrink-0">
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide truncate">
          {etapa.label}
        </h3>
        <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5 shrink-0 ml-1">
          {oportunidades.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`flex flex-col gap-2 rounded-lg p-2 flex-1 min-h-[200px] transition-colors ${
          isOver ? "bg-accent" : "bg-muted/30"
        }`}
      >
        <SortableContext
          items={oportunidades.map((op) => op.id)}
          strategy={verticalListSortingStrategy}
        >
          {oportunidades.map((op) => (
            <ComercialCard key={op.id} oportunidade={op} onClick={() => onCardClick(op)} />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/comercial/ComercialColumn.tsx
git commit -m "feat: ComercialColumn — coluna do kanban"
```

---

## Task 11: OportunidadeModal

**Files:**
- Create: `src/components/comercial/OportunidadeModal.tsx`

- [ ] **Step 1: Criar `src/components/comercial/OportunidadeModal.tsx`**

```typescript
"use client"

import { useState, useTransition } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { EtapaComercial } from "@prisma/client"
import { COLUNAS_COMERCIAL } from "@/lib/comercial"
import {
  createOportunidadeAction,
  updateOportunidadeAction,
  deleteOportunidadeAction,
} from "@/server/actions/oportunidades"
import type { OportunidadeComResponsavel } from "@/components/comercial/ComercialKanban"

interface UserSimples { id: string; name: string; email: string }

interface Props {
  mode: "create" | "edit"
  oportunidade?: OportunidadeComResponsavel
  etapaInicial?: EtapaComercial
  users: UserSimples[]
  open: boolean
  onClose: () => void
}

export function OportunidadeModal({ mode, oportunidade, etapaInicial, users, open, onClose }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [form, setForm] = useState({
    cliente:         oportunidade?.cliente ?? "",
    produto:         oportunidade?.produto ?? "",
    origemLead:      oportunidade?.origemLead ?? "",
    etapa:           oportunidade?.etapa ?? etapaInicial ?? EtapaComercial.SUSPECT,
    valor:           oportunidade?.valor != null ? String(oportunidade.valor) : "",
    prazoFechamento: oportunidade?.prazoFechamento
      ? new Date(oportunidade.prazoFechamento).toISOString().split("T")[0]
      : "",
    responsavelId:   oportunidade?.responsavelId ?? "",
    descricao:       oportunidade?.descricao ?? "",
  })

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit() {
    setError(null)
    const input = {
      ...form,
      valor: form.valor ? Number(form.valor) : undefined,
      prazoFechamento: form.prazoFechamento ? new Date(form.prazoFechamento) : undefined,
      responsavelId: form.responsavelId || undefined,
      produto: form.produto || undefined,
      origemLead: form.origemLead || undefined,
      descricao: form.descricao || undefined,
    }
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createOportunidadeAction(input)
          : await updateOportunidadeAction(oportunidade!.id, input)
      if (!result.success) { setError(result.error); return }
      onClose()
    })
  }

  function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    startTransition(async () => {
      const result = await deleteOportunidadeAction(oportunidade!.id)
      if (!result.success) { setError(result.error); return }
      onClose()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Nova Oportunidade" : "Editar Oportunidade"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="op-cliente">Cliente *</Label>
            <Input id="op-cliente" value={form.cliente} onChange={(e) => set("cliente", e.target.value)} placeholder="Nome da empresa" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="op-produto">Produto / Serviço</Label>
            <Input id="op-produto" value={form.produto} onChange={(e) => set("produto", e.target.value)} placeholder="Ex: SQLTech Analytics" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="op-origem">Origem do Lead</Label>
            <Input id="op-origem" value={form.origemLead} onChange={(e) => set("origemLead", e.target.value)} placeholder="Ex: Indicação" />
          </div>

          <div className="space-y-1.5">
            <Label>Etapa</Label>
            <Select value={form.etapa} onValueChange={(v) => set("etapa", v as EtapaComercial)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COLUNAS_COMERCIAL.map((c) => (
                  <SelectItem key={c.enum} value={c.enum}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Responsável</Label>
            <Select value={form.responsavelId || "none"} onValueChange={(v) => set("responsavelId", v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="op-valor">Valor (R$)</Label>
            <Input id="op-valor" type="number" min={0} value={form.valor} onChange={(e) => set("valor", e.target.value)} placeholder="120000" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="op-prazo">Prazo de Fechamento</Label>
            <Input id="op-prazo" type="date" value={form.prazoFechamento} onChange={(e) => set("prazoFechamento", e.target.value)} />
          </div>

          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="op-descricao">Descrição / Observações</Label>
            <Textarea id="op-descricao" rows={3} value={form.descricao} onChange={(e) => set("descricao", e.target.value)} />
          </div>
        </div>

        {error && <p className="text-sm text-destructive mt-1">{error}</p>}

        <DialogFooter className="flex items-center justify-between gap-2 flex-row">
          {mode === "edit" && (
            <Button variant="destructive" size="sm" disabled={isPending} onClick={handleDelete}>
              {confirmDelete ? "Confirmar exclusão" : "Excluir"}
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={onClose} disabled={isPending}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/comercial/OportunidadeModal.tsx
git commit -m "feat: OportunidadeModal — criar e editar oportunidades"
```

---

## Task 12: ComercialKanban (integração final)

**Files:**
- Create: `src/components/comercial/ComercialKanban.tsx`

- [ ] **Step 1: Criar `src/components/comercial/ComercialKanban.tsx`**

```typescript
"use client"

import { useState, useEffect } from "react"
import {
  DndContext, DragEndEvent, DragOverEvent, DragStartEvent,
  PointerSensor, useSensor, useSensors, DragOverlay,
} from "@dnd-kit/core"
import {
  EtapaComercial, type Oportunidade, type User,
} from "@prisma/client"
import { COLUNAS_COMERCIAL } from "@/lib/comercial"
import { ComercialColumn } from "@/components/comercial/ComercialColumn"
import { OportunidadeModal } from "@/components/comercial/OportunidadeModal"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { moveOportunidadeEtapaAction } from "@/server/actions/oportunidades"

export type OportunidadeComResponsavel = Oportunidade & {
  responsavel: Pick<User, "id" | "name" | "email"> | null
}

type UserSimples = Pick<User, "id" | "name" | "email">

type ModalState =
  | { mode: "create"; etapaInicial: EtapaComercial }
  | { mode: "edit"; oportunidade: OportunidadeComResponsavel }
  | null

interface Props {
  oportunidades: OportunidadeComResponsavel[]
  users: UserSimples[]
}

export function ComercialKanban({ oportunidades: initial, users }: Props) {
  const [oportunidades, setOportunidades] = useState(initial)
  const [activeOp, setActiveOp] = useState<OportunidadeComResponsavel | null>(null)
  const [dragOrigin, setDragOrigin] = useState<EtapaComercial | null>(null)
  const [modal, setModal] = useState<ModalState>(null)

  useEffect(() => { setOportunidades(initial) }, [initial])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function findEtapa(id: string): EtapaComercial | null {
    return oportunidades.find((op) => op.id === id)?.etapa ?? null
  }

  function handleDragStart({ active }: DragStartEvent) {
    const op = oportunidades.find((o) => o.id === active.id) ?? null
    setActiveOp(op)
    setDragOrigin(op?.etapa ?? null)
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return
    const activeId = active.id as string
    const overId = over.id as string
    const activeEtapa = findEtapa(activeId)
    const overEtapa = COLUNAS_COMERCIAL.find((c) => c.enum === overId)?.enum ?? findEtapa(overId)
    if (!activeEtapa || !overEtapa || activeEtapa === overEtapa) return
    setOportunidades((prev) =>
      prev.map((op) => op.id === activeId ? { ...op, etapa: overEtapa } : op)
    )
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveOp(null)
    const origin = dragOrigin
    setDragOrigin(null)
    if (!over) return
    const activeId = active.id as string
    const overId = over.id as string
    const overEtapa =
      (COLUNAS_COMERCIAL.find((c) => c.enum === overId)?.enum ?? findEtapa(overId)) as EtapaComercial | null
    if (!overEtapa || origin === overEtapa) return
    await moveOportunidadeEtapaAction(activeId, overEtapa)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-end px-6 py-3 border-b shrink-0">
        <Button size="sm" onClick={() => setModal({ mode: "create", etapaInicial: EtapaComercial.SUSPECT })}>
          <Plus className="w-4 h-4 mr-1" />
          Nova Oportunidade
        </Button>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 p-4 overflow-x-auto flex-1 items-start">
          {COLUNAS_COMERCIAL.map((col) => (
            <ComercialColumn
              key={col.enum}
              etapa={col}
              oportunidades={oportunidades.filter((op) => op.etapa === col.enum)}
              onCardClick={(op) => setModal({ mode: "edit", oportunidade: op })}
            />
          ))}
        </div>

        <DragOverlay>
          {activeOp && (
            <div className="bg-white border rounded-lg p-3 shadow-lg rotate-1 opacity-90 w-[220px]">
              <p className="text-sm font-semibold truncate">{activeOp.cliente}</p>
              {activeOp.produto && <p className="text-xs text-muted-foreground truncate">{activeOp.produto}</p>}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {modal && (
        <OportunidadeModal
          key={modal.mode === "edit" ? modal.oportunidade.id : "new"}
          mode={modal.mode}
          oportunidade={modal.mode === "edit" ? modal.oportunidade : undefined}
          etapaInicial={modal.mode === "create" ? modal.etapaInicial : undefined}
          users={users}
          open={true}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verificar app no browser**

```bash
npm run dev
```

1. Acesse `http://localhost:3000`
2. Confirme que "Comercial" aparece na sidebar
3. Clique em Comercial — 7 colunas devem aparecer
4. Clique "Nova Oportunidade" — modal abre
5. Preencha cliente (obrigatório) e salve — card aparece na coluna Suspect
6. Arraste o card para outra coluna — move com feedback visual
7. Clique no card — modal de edição abre com dados preenchidos
8. Teste Excluir (requer duplo clique)

- [ ] **Step 3: Commit**

```bash
git add src/components/comercial/
git commit -m "feat: ComercialKanban — kanban comercial completo com DnD"
```

---

## Verificação Final

- [ ] **Rodar todos os testes:**

```bash
npx vitest run
```

Esperado: todos os testes passando (incluindo `tests/unit/comercial.test.ts`).

- [ ] **Verificar TypeScript:**

```bash
npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Commit do build script de deploy:**

Atualizar `package.json` para Railway rodar migrations automaticamente:

```json
"build": "prisma generate && prisma migrate deploy && next build"
```

```bash
git add package.json
git commit -m "feat: prisma generate e migrate deploy no build script"
```

- [ ] **Push para produção:**

```bash
git push origin master
```
