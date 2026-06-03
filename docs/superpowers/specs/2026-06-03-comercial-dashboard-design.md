# Dashboard Comercial

**Data:** 2026-06-03
**Status:** Aprovado

## Objetivo

Página `/comercial/dashboard` com indicadores e análises do pipeline de vendas. Acesso: Admin e perfil Comercial (já garantido pelo middleware em `/comercial*`).

## Métricas

Considerando o conjunto de oportunidades. "Aberta" = etapa ∉ {CONCLUIDO, PERDIDO}.
Forecast de uma oportunidade aberta = `valor × (pct da atividade / 100)`. Sem atividade ou sem valor → contribui 0.

### KPIs (4 cards)
- **Oportunidades abertas**: contagem das abertas
- **Valor do pipeline**: soma de `valor` das abertas
- **Forecast ponderado**: soma de `valor × pct/100` das abertas
- **Ganhos no mês**: contagem e soma de `valor` das oportunidades em CONCLUIDO cujo `updatedAt` está no mês corrente

### 1. Funil por etapa
Para cada etapa de `COLUNAS_COMERCIAL` (as 7): contagem e soma de `valor`. Barra proporcional ao valor (ou contagem) da maior etapa.

### 2. Ganhos × Perdidos
- Ganhos: count + valor de CONCLUIDO (todos)
- Perdidos: count + valor de PERDIDO (todos)
- Taxa de conversão: `ganhosCount / (ganhosCount + perdidosCount)` (0 se denominador 0)

### 3. Ranking por responsável
Agrupa por `responsavelId` (inclui "Sem responsável"). Por grupo:
- nº de oportunidades abertas
- valor em aberto
- forecast
- ganhos (valor de CONCLUIDO)
Ordenado por valor em aberto desc.

### 4. Previsão por mês de fechamento
Oportunidades abertas agrupadas pelo mês (YYYY-MM) de `prazoFechamento`. Soma de `valor` por mês, ordenado cronologicamente. Abertas sem `prazoFechamento` agrupadas em "Sem prazo".

### 5. Oportunidades estagnadas
Abertas com `updatedAt < hoje - 14 dias`. Lista: cliente, etapa (label) + atividade (label), valor, dias parado (hoje − updatedAt), responsável. Ordenado por dias parado desc. Limite de exibição: 15.

### 6. Top oportunidades + produto + origem
- **Top 5** oportunidades abertas por `valor` desc: cliente, etapa, valor, responsável
- **Por produto**: soma de valor das abertas agrupado por `produto` (null → "Sem produto"), top 5
- **Por origem**: soma de valor das abertas agrupado por `origemLead` (null → "Sem origem"), top 5

## Arquitetura

### Serviço — `src/server/services/comercialDashboard.ts`
- `getComercialDashboard()`: busca todas as oportunidades (campos: id, cliente, produto, origemLead, valor, prazoFechamento, etapa, atividade, updatedAt, responsavel {id,name}) e calcula todas as métricas acima usando `ATIVIDADES_COMERCIAL`/`getAtividadeConfig` para os percentuais. Retorna um objeto tipado `ComercialDashboardData`.
- Repositório: adicionar `findOportunidadesParaDashboard()` em `repositories/oportunidades.ts` (select enxuto + responsavel).

### Página — `src/app/(app)/comercial/dashboard/page.tsx`
- Server Component. `getRequiredSession()` + guarda: `if (!isSystemAdmin && perfil !== "COMERCIAL") redirect("/projetos")`.
- Chama `getComercialDashboard()` e renderiza as seções.

### Componentes — `src/components/comercial/dashboard/`
- `KpiCard.tsx` — card de KPI reutilizável (label, valor, sublabel opcional)
- `BarList.tsx` — lista de barras horizontais proporcionais (label, valor formatado, largura %)
- `DashboardView.tsx` — monta a página a partir de `ComercialDashboardData` (server component, sem estado)
Demais seções (ranking, estagnadas, top) são renderizadas como tabelas/listas simples dentro de `DashboardView`.

### Navegação
- Em `ComercialKanban` (topo, ao lado de "Nova Oportunidade"): link "Dashboard" → `/comercial/dashboard`.
- No dashboard: link "Kanban" → `/comercial`.

## Formatação
- Moeda: `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 })` para valores grandes; valor cheio onde couber.
- Mês: rótulo "mmm/aa".

## Fora de escopo
- Filtros de período interativos (v1 usa mês corrente para "ganhos no mês" e todo o histórico para o resto)
- Auto-refresh
- Exportação
