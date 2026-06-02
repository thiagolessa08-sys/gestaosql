# Módulo Comercial — Atividades dentro do Card

**Data:** 2026-06-02
**Status:** Aprovado

## Objetivo

Adicionar atividades detalhadas do funil (17 atividades) dentro de cada card comercial, sincronizadas bidirecionalmente com as 7 colunas do kanban:
- Trocar a atividade no card move o card para a coluna dona daquela atividade.
- Arrastar o card para uma coluna define a atividade como a primeira daquela coluna.

## Mapeamento Atividade → Coluna → Percentual

| Atividade (enum) | Label | % | Coluna (etapa) |
|---|---|---|---|
| MAPEAMENTO | Mapeamento | 0 | SUSPECT |
| APRESENTACAO | Apresentação | 0 | SUSPECT |
| DESPERTOU_INTERESSE | Despertou Interesse | 1 | LEAD |
| ABORDAGEM | Abordagem | 2 | PROSPECT_C |
| DOR_ADMITIDA | Dor Admitida | 5 | PROSPECT_C |
| BUDGET_IDENTIFICADO | Budget Identificado | 5 | PROSPECT_C |
| DIAGRAMA_PODER | Diagrama de Poder | 5 | PROSPECT_C |
| LEVANTAMENTO_AMBIENTE | Levantamento do Ambiente | 10 | PROSPECT_B |
| TR_ETP | TR / ETP | 15 | PROSPECT_B |
| AVALIACAO_CONCORRENCIA | Avaliação da Concorrência | 16 | PROSPECT_B |
| PROPOSTA_EMITIDA | Proposta Emitida | 20 | PROSPECT_B |
| SHORT_LIST | Short List | 33 | PROSPECT_B |
| DECISAO_DEFINIDA | Decisão Definida | 50 | PROSPECT_B |
| LICITACAO | Licitação | 70 | PROSPECT_A |
| TERMOS_ACEITE | Termos de Aceite | 90 | PROSPECT_A |
| NEGOCIACAO_CONTRATO | Negociação de Contrato | 98 | PROSPECT_A |
| ASSINATURA_CONTRATO | Assinatura de Contrato | 100 | PROSPECT_A |

**Colunas terminais (sem atividade):**
- CONCLUIDO → exibe percentual fixo 100%, `atividade = null`
- PERDIDO → sem percentual, `atividade = null`

## Banco de Dados

Migration adiciona:

```prisma
enum AtividadeComercial {
  MAPEAMENTO
  APRESENTACAO
  DESPERTOU_INTERESSE
  ABORDAGEM
  DOR_ADMITIDA
  BUDGET_IDENTIFICADO
  DIAGRAMA_PODER
  LEVANTAMENTO_AMBIENTE
  TR_ETP
  AVALIACAO_CONCORRENCIA
  PROPOSTA_EMITIDA
  SHORT_LIST
  DECISAO_DEFINIDA
  LICITACAO
  TERMOS_ACEITE
  NEGOCIACAO_CONTRATO
  ASSINATURA_CONTRATO
}
```

No model `Oportunidade`:
```prisma
atividade  AtividadeComercial?  @map("atividade")
```

A migration SQL faz backfill: para cada card existente, define `atividade` = primeira atividade da `etapa` atual (exceto CONCLUIDO/PERDIDO que ficam null).

## Config Central — src/lib/comercial.ts

Adicionar (mantendo `COLUNAS_COMERCIAL` existente):

```typescript
export interface AtividadeConfig {
  enum: AtividadeComercial
  label: string
  pct: number
  etapa: EtapaComercial
}

export const ATIVIDADES_COMERCIAL: AtividadeConfig[] = [ /* 17 itens da tabela acima */ ]

export function getAtividadeConfig(a: AtividadeComercial): AtividadeConfig
export function getEtapaDaAtividade(a: AtividadeComercial): EtapaComercial
export function getAtividadesDaEtapa(e: EtapaComercial): AtividadeConfig[]
export function getPrimeiraAtividade(e: EtapaComercial): AtividadeComercial | null  // null p/ CONCLUIDO/PERDIDO
```

## Server Action

`moveOportunidadeAction(id, payload)` substitui/estende `moveOportunidadeEtapaAction`:

- `payload = { atividade }` → grava `atividade` + `etapa = getEtapaDaAtividade(atividade)`
- `payload = { etapa }` (drag) → grava `etapa` + `atividade = getPrimeiraAtividade(etapa)`

`revalidatePath("/comercial")` ao final.

## UI

### Card (ComercialCard)
- Novo `<select>` compacto entre o produto e a linha de valor, exibindo "Label · X%".
- `onChange` → chama `moveOportunidadeAction({ atividade })` com optimistic UI.
- O select chama `e.stopPropagation()` para não abrir o modal.
- CONCLUIDO: badge fixo "100%", sem select.
- PERDIDO: sem select/percentual.

### Drag (ComercialKanban)
- Soltar em coluna → `moveOportunidadeAction({ etapa })`; optimistic UI atualiza `etapa` e `atividade` (primeira da coluna) localmente.

### Modal (OportunidadeModal)
- Campo "Etapa" vira "Atividade": lista as 17 atividades (agrupadas por coluna) + 2 opções terminais "Concluído" e "Perdido".
- Selecionar atividade → etapa derivada no submit. Selecionar Concluído/Perdido → atividade null.

## Estado / Tipos

`OportunidadeComResponsavel` ganha `atividade: AtividadeComercial | null` (já vem do model). Optimistic UI no kanban atualiza ambos `etapa` e `atividade`.

## Testes

`tests/unit/comercial.test.ts` adiciona casos para:
- `ATIVIDADES_COMERCIAL` tem 17 itens
- `getEtapaDaAtividade(DOR_ADMITIDA)` === PROSPECT_C
- `getPrimeiraAtividade(PROSPECT_B)` === LEVANTAMENTO_AMBIENTE
- `getPrimeiraAtividade(CONCLUIDO)` === null
- `getAtividadesDaEtapa(PROSPECT_C)` tem 4 itens
