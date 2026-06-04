# Cadastro de Produtos no Comercial

**Data:** 2026-06-03
**Status:** Aprovado

## Objetivo

Permitir cadastrar produtos/serviços e usá-los como lista no campo "Produto / Serviço" das oportunidades.

## Banco de Dados

```prisma
model Produto {
  id        String   @id @default(cuid())
  nome      String   @unique
  createdAt DateTime @default(now()) @map("created_at")

  @@map("produtos")
}
```

O campo `produto` da `Oportunidade` continua `String?` (grava o nome) — sem migração de dados. O modal apenas restringe a escolha à lista cadastrada.

## Backend

- Repository (`src/server/repositories/produtos.ts`): `findAllProdutos`, `createProduto(nome)`, `deleteProduto(id)`.
- Actions (`src/server/actions/produtos.ts`): `criarProdutoAction`, `deletarProdutoAction`, `listarProdutosAction` — criar/excluir exigem `isAdminComercial(session.user)` (Admin Comercial ou Admin Total). `revalidatePath("/comercial")`.

## UI

### Botão "Produtos"
No `ComercialKanban`, ao lado de "Nova Oportunidade", visível só se `canManageProdutos` (Admin Comercial/Total). Abre `ProdutosModal`.

### ProdutosModal (novo)
- Lista os produtos com botão de excluir (confirmação simples).
- Input + botão para adicionar novo produto.
- Estado local otimista + revalidação.

### OportunidadeModal
- Campo "Produto / Serviço" vira `<select>` populado com os produtos cadastrados.
- Inclui opção "— Nenhum —" (vazio) e, se a oportunidade em edição tiver um `produto` que não está na lista, adiciona esse valor como opção extra para não perdê-lo.
- Recebe `produtos: string[]` via props.

### Página `/comercial`
Carrega `findAllProdutos()` e passa os nomes + `canManageProdutos` para o `ComercialKanban`, que repassa para o modal de oportunidade e o modal de produtos.

## Permissões
- Ver a lista (no select): qualquer um que acessa o comercial.
- Gerenciar (criar/excluir): Admin Comercial ou Admin Total.

## Fora de escopo
- Editar nome de produto existente (só criar/excluir por enquanto)
- Preço/categoria do produto
- Migrar o campo `produto` da oportunidade para FK
