# Módulo Comercial — Subitens de Atividades no Card

**Data:** 2026-06-02
**Status:** Aprovado

## Objetivo

Permitir registrar, dentro de cada oportunidade, uma lista de atividades realizadas ao longo do processo de venda. Cada subitem combina checklist (marcar feito) + histórico (datas de criação e conclusão). Espelha o padrão de `ChecklistItem` dos cards de sprint.

## Banco de Dados

```prisma
model OportunidadeSubitem {
  id           String       @id @default(cuid())
  oportunidadeId String     @map("oportunidade_id")
  oportunidade Oportunidade @relation(fields: [oportunidadeId], references: [id], onDelete: Cascade)
  texto        String
  feito        Boolean      @default(false)
  criadoEm     DateTime     @default(now()) @map("criado_em")
  concluidoEm  DateTime?    @map("concluido_em")

  @@map("oportunidade_subitens")
}
```

Relação inversa em `Oportunidade`: `subitens OportunidadeSubitem[]`.

## Repository — src/server/repositories/oportunidades.ts

- `include` global passa a incluir `subitens` (orderBy criadoEm asc).
- `addSubitem(oportunidadeId, texto)` → cria
- `toggleSubitem(id)` → lê item, inverte `feito`, grava `concluidoEm = feito ? now : null`
- `deleteSubitem(id)` → remove

## Server Actions — src/server/actions/oportunidades.ts

- `addSubitemAction(oportunidadeId, texto)` — valida texto não-vazio
- `toggleSubitemAction(id)`
- `deleteSubitemAction(id)`

Todas chamam `revalidatePath("/comercial")`.

## Tipos

`OportunidadeComResponsavel` ganha `subitens: OportunidadeSubitem[]` (vem do include).

## UI — Modal (OportunidadeModal)

Nova seção "Atividades Realizadas" abaixo da Descrição, **somente no modo edição**:
- Lista de subitens: checkbox (toggle), texto, e datas em texto pequeno ("criado 02/06" + "· concluído 04/06" quando feito).
- Botão de excluir (X) por item.
- Campo de input + Enter para adicionar novo subitem.
- Modo criar: exibe aviso "Salve a oportunidade primeiro para adicionar atividades."
- As ações são persistidas imediatamente (não dependem do botão Salvar) e usam `router.refresh()` para atualizar.

## UI — Card (ComercialCard)

Quando `subitens.length > 0`, exibe contador de progresso: ícone de check + "feitos/total" (ex: "✓ 2/5"), na linha inferior do card.

## Fora de escopo

- Reordenação de subitens
- Atribuição de responsável por subitem
- Edição de texto de subitem existente (só add/toggle/delete)
