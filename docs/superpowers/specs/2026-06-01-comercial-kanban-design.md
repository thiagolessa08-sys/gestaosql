# Módulo Comercial — Kanban de Oportunidades

**Data:** 2026-06-01  
**Status:** Aprovado

## Objetivo

Criar um módulo comercial standalone (sem vínculo com projetos ou sprints) com kanban de 7 colunas, drag-and-drop entre colunas e CRUD de oportunidades.

## Colunas

| Enum | Label |
|---|---|
| `SUSPECT` | Suspect |
| `LEAD` | Lead |
| `PROSPECT_C` | Prospect C |
| `PROSPECT_B` | Prospect B |
| `PROSPECT_A` | Prospect A |
| `CONCLUIDO` | Concluído |
| `PERDIDO` | Perdido |

## Banco de Dados

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

model Oportunidade {
  id              String         @id @default(cuid())
  cliente         String
  produto         String?
  origemLead      String?
  descricao       String?
  valor           Decimal?       @db.Decimal(14, 2)
  prazoFechamento DateTime?
  etapa           EtapaComercial @default(SUSPECT)
  responsavelId   String?
  responsavel     User?          @relation("OportunidadeResponsavel", fields: [responsavelId], references: [id])
  createdById     String
  createdBy       User           @relation("OportunidadeCriador", fields: [createdById], references: [id])
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
}
```

Relação inversa no model `User`:
```prisma
oportunidadesCriadas     Oportunidade[] @relation("OportunidadeCriador")
oportunidadesResponsavel Oportunidade[] @relation("OportunidadeResponsavel")
```

## Arquitetura

Padrão idêntico ao restante do projeto: repository → service → action → page.

### Mapa de arquivos

| Arquivo | Operação |
|---|---|
| `prisma/schema.prisma` | Modificar — enum + model + relações no User |
| `src/lib/comercial.ts` | Criar — config das 7 colunas |
| `src/lib/schemas/oportunidades.ts` | Criar — schema Zod |
| `src/server/repositories/oportunidades.ts` | Criar — CRUD Prisma |
| `src/server/services/oportunidades.ts` | Criar — camada de serviço |
| `src/server/actions/oportunidades.ts` | Criar — server actions |
| `src/app/(app)/comercial/page.tsx` | Criar — Server Component |
| `src/components/comercial/ComercialKanban.tsx` | Criar — DndContext + estado |
| `src/components/comercial/ComercialColumn.tsx` | Criar — useDroppable |
| `src/components/comercial/ComercialCard.tsx` | Criar — useSortable |
| `src/components/comercial/OportunidadeModal.tsx` | Criar — modal criar/editar |

## Fluxo de Dados

1. `ComercialPage` (Server Component) carrega todas as oportunidades e lista de usuários via repository
2. Passa os dados para `ComercialKanban` (Client Component)
3. `ComercialKanban` gerencia estado local, DnD e estado do modal
4. Drag entre colunas → `moveEtapaAction(id, novaEtapa)` com otimistic UI
5. Salvar modal → `createOportunidadeAction` ou `updateOportunidadeAction` → `revalidatePath("/comercial")`

## Card Visual

Exibe (quando preenchido):
- Nome do cliente (destaque)
- Produto/serviço (texto menor)
- Valor em verde formatado (`R$ 120k`)
- Prazo de fechamento
- Avatar inicial do responsável

## Modal Criar/Editar

Campos em ordem:

| Campo | Tipo | Obrigatório |
|---|---|---|
| Cliente | texto | Sim |
| Produto/serviço | texto | Não |
| Origem do lead | texto | Não |
| Etapa | select 7 opções | Sim |
| Valor (R$) | número | Não |
| Prazo de fechamento | date | Não |
| Responsável | select usuários | Não |
| Descrição/observações | textarea | Não |

Botão **Excluir** com confirmação dupla disponível no modo edição.

## Comportamento DnD

- `PointerSensor` com `activationConstraint: { distance: 8 }` (igual ao sprint board)
- Otimistic UI: etapa atualiza localmente antes da resposta do servidor
- `DragOverlay` mostra preview do card arrastado
- Sem reordenação dentro da coluna (sem campo `position`)

## Sidebar

Adicionar item "Comercial" com ícone `Briefcase` ao `SidebarNav.tsx`, entre Projetos e Painel:

```typescript
{ href: "/comercial", activePath: "/comercial", label: "Comercial", icon: Briefcase }
```
