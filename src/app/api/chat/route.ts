import Anthropic from "@anthropic-ai/sdk"
import { auth } from "@/server/auth/config"
import { db } from "@/server/db"
import { EtapaComercial, PerfilAcesso } from "@prisma/client"
import { getEtapaConfig, getAtividadeConfig } from "@/lib/comercial"
import { isAdminTotal } from "@/lib/acesso"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Tools definitions ──────────────────────────────────────────────────────
const TOOLS: Anthropic.Tool[] = [
  {
    name: "buscar_oportunidades",
    description: "Busca oportunidades do pipeline comercial. Retorna todos os campos: cliente, produto, origem do lead, acompanhamento (etapa detalhada + %), responsável, valor, prazo de fechamento, descrição e quantidade de atividades realizadas.",
    input_schema: {
      type: "object" as const,
      properties: {
        etapa: { type: "string", description: "Filtrar por coluna do kanban: SUSPECT, LEAD, PROSPECT_C, PROSPECT_B, PROSPECT_A, CONCLUIDO, PERDIDO" },
        responsavel_nome: { type: "string", description: "Filtrar por nome do responsável (parcial, case-insensitive)" },
        cliente_nome: { type: "string", description: "Filtrar por nome do cliente (parcial)" },
        com_descricao: { type: "boolean", description: "Se true, retorna apenas oportunidades com descrição preenchida" },
        com_atividades: { type: "boolean", description: "Se true, retorna apenas oportunidades com atividades realizadas cadastradas" },
        prazo_ate: { type: "string", description: "Filtrar por prazo de fechamento até esta data (ISO: YYYY-MM-DD)" },
        limite: { type: "number", description: "Máximo de registros (padrão 20, máx 100)" },
        detalhado: { type: "boolean", description: "Se true, inclui descrição e lista de atividades realizadas na resposta" },
      },
    },
  },
  {
    name: "buscar_projetos",
    description: "Lista projetos com membros, sprints ativas e progresso de cards.",
    input_schema: {
      type: "object" as const,
      properties: {
        incluir_arquivados: { type: "boolean", description: "Incluir projetos arquivados (padrão false)" },
      },
    },
  },
  {
    name: "buscar_cards",
    description: "Busca cards de sprints com status, prioridade, responsável e sprint.",
    input_schema: {
      type: "object" as const,
      properties: {
        projeto_slug: { type: "string", description: "Slug do projeto (opcional)" },
        status: { type: "string", description: "Filtrar por status: BACKLOG, DOING, VALIDATION, DONE" },
        limite: { type: "number", description: "Máximo de registros (padrão 30)" },
      },
    },
  },
  {
    name: "buscar_usuarios",
    description: "Lista usuários do sistema com seus perfis de acesso.",
    input_schema: {
      type: "object" as const,
      properties: {
        perfil: { type: "string", description: "Filtrar por perfil: MEMBRO_PROJETO, MEMBRO_COMERCIAL, ADMIN_PROJETO, ADMIN_COMERCIAL" },
      },
    },
  },
  {
    name: "resumo_dashboard",
    description: "Retorna KPIs consolidados: pipeline comercial, ganhos, projetos ativos, sprints e cards.",
    input_schema: { type: "object" as const, properties: {} },
  },
]

// ── Tool executors ─────────────────────────────────────────────────────────
async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  try {
    if (name === "buscar_oportunidades") {
      const limite = Math.min((input.limite as number) ?? 20, 100)
      const etapa = input.etapa as EtapaComercial | undefined
      const ops = await db.oportunidade.findMany({
        where: {
          ...(etapa ? { etapa } : {}),
          ...(input.responsavel_nome ? { responsavel: { name: { contains: input.responsavel_nome as string, mode: "insensitive" } } } : {}),
          ...(input.cliente_nome ? { cliente: { contains: input.cliente_nome as string, mode: "insensitive" } } : {}),
          ...(input.com_descricao ? { descricao: { not: null } } : {}),
          ...(input.com_atividades ? { subitens: { some: {} } } : {}),
          ...(input.prazo_ate ? { prazoFechamento: { lte: new Date(input.prazo_ate as string) } } : {}),
        },
        include: {
          responsavel: { select: { name: true } },
          subitens: input.detalhado ? { orderBy: { criadoEm: "asc" } } : false,
        },
        orderBy: { updatedAt: "desc" },
        take: limite,
      })
      if (!ops.length) return "Nenhuma oportunidade encontrada."

      // Pre-fetch subitem counts when not in detailed mode
      const subCounts = input.detalhado ? null : await Promise.all(
        ops.map(op => db.oportunidadeSubitem.count({ where: { oportunidadeId: op.id } }))
      )

      return ops.map((op, idx) => {
        const etapaLabel = getEtapaConfig(op.etapa).label
        const acompanhamento = op.atividade
          ? `${getEtapaConfig(getAtividadeConfig(op.atividade).etapa).label} — ${getAtividadeConfig(op.atividade).label} (${getAtividadeConfig(op.atividade).pct}%)`
          : etapaLabel
        const valor = op.valor ? `R$ ${Number(op.valor).toLocaleString("pt-BR")}` : "—"
        const prazo = op.prazoFechamento ? new Date(op.prazoFechamento).toLocaleDateString("pt-BR") : "—"
        const linhas = [
          `**${op.cliente}**`,
          `  Produto: ${op.produto ?? "—"} | Origem: ${op.origemLead ?? "—"}`,
          `  Acompanhamento: ${acompanhamento}`,
          `  Responsável: ${op.responsavel?.name ?? "—"} | Valor: ${valor} | Prazo: ${prazo}`,
        ]
        if (input.detalhado && op.descricao) linhas.push(`  Descrição: ${op.descricao}`)
        if (input.detalhado && Array.isArray((op as { subitens?: unknown[] }).subitens) && (op as { subitens?: unknown[] }).subitens!.length) {
          const subs = (op as { subitens: { texto: string; feito: boolean; criadoEm: Date }[] }).subitens
          linhas.push(`  Atividades: ${subs.map(s => `${s.feito ? "✓" : "○"} ${s.texto} (${new Date(s.criadoEm).toLocaleDateString("pt-BR")})`).join("; ")}`)
        } else if (subCounts && subCounts[idx]) {
          linhas.push(`  Atividades realizadas: ${subCounts[idx]}`)
        }
        return linhas.join("\n")
      }).join("\n\n")
    }

    if (name === "buscar_projetos") {
      const where = input.incluir_arquivados ? {} : { archivedAt: null }
      const projetos = await db.project.findMany({
        where,
        include: {
          _count: { select: { members: true, cards: true } },
          sprints: { where: { status: "ACTIVE" }, select: { name: true, status: true }, take: 1 },
          cards: { where: { status: "DONE" }, select: { id: true } },
        },
        orderBy: { updatedAt: "desc" },
      })
      if (!projetos.length) return "Nenhum projeto encontrado."
      return projetos.map(p => {
        const sprint = p.sprints[0]
        const pct = p._count.cards > 0 ? Math.round((p.cards.length / p._count.cards) * 100) : 0
        const status = p.archivedAt ? "[arquivado]" : sprint ? `sprint: ${sprint.name}` : "sem sprint ativa"
        return `• ${p.name} | ${p._count.members} membros | ${p._count.cards} cards | progresso: ${pct}% | ${status}`
      }).join("\n")
    }

    if (name === "buscar_cards") {
      const limite = (input.limite as number) ?? 30
      const cards = await db.card.findMany({
        where: {
          archivedAt: null,
          ...(input.projeto_slug ? { project: { slug: input.projeto_slug as string } } : {}),
          ...(input.status ? { status: input.status as "BACKLOG" | "DOING" | "VALIDATION" | "DONE" } : {}),
        },
        include: {
          project: { select: { name: true } },
          sprint: { select: { name: true } },
          assignee: { select: { name: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: limite,
      })
      if (!cards.length) return "Nenhum card encontrado."
      return cards.map(c =>
        `• [${c.status}] ${c.title} | proj: ${c.project.name} | sprint: ${c.sprint?.name ?? "backlog"} | resp: ${c.assignee?.name ?? "-"} | prioridade: ${c.priority}`
      ).join("\n")
    }

    if (name === "buscar_usuarios") {
      const usuarios = await db.user.findMany({
        where: {
          deletedAt: null,
          ...(input.perfil ? { perfil: input.perfil as PerfilAcesso } : {}),
        },
        select: { name: true, email: true, isSystemAdmin: true, perfil: true },
        orderBy: { name: "asc" },
      })
      if (!usuarios.length) return "Nenhum usuário encontrado."
      return usuarios.map(u => {
        const tipo = u.isSystemAdmin ? "Admin Total" : u.perfil.replace("_", " ").toLowerCase()
        return `• ${u.name} (${u.email}) | ${tipo}`
      }).join("\n")
    }

    if (name === "resumo_dashboard") {
      const [
        totalOps, pipeline, ganhosCount, perdidosCount,
        totalProjetos, sprintsAtivas, totalCards, cardsDone
      ] = await Promise.all([
        db.oportunidade.count(),
        db.oportunidade.aggregate({ where: { etapa: { notIn: [EtapaComercial.CONCLUIDO, EtapaComercial.PERDIDO] } }, _sum: { valor: true } }),
        db.oportunidade.count({ where: { etapa: EtapaComercial.CONCLUIDO } }),
        db.oportunidade.count({ where: { etapa: EtapaComercial.PERDIDO } }),
        db.project.count({ where: { archivedAt: null } }),
        db.sprint.count({ where: { status: "ACTIVE" } }),
        db.card.count({ where: { archivedAt: null } }),
        db.card.count({ where: { archivedAt: null, status: "DONE" } }),
      ])
      const valorPipeline = pipeline._sum.valor ? `R$ ${Number(pipeline._sum.valor).toLocaleString("pt-BR")}` : "R$ 0"
      const taxaConv = ganhosCount + perdidosCount > 0 ? Math.round(ganhosCount / (ganhosCount + perdidosCount) * 100) : 0
      return [
        `📊 RESUMO DO SISTEMA`,
        `Comercial: ${totalOps} oportunidades | Pipeline: ${valorPipeline} | Ganhos: ${ganhosCount} | Perdidos: ${perdidosCount} | Taxa conversão: ${taxaConv}%`,
        `Projetos: ${totalProjetos} ativos | ${sprintsAtivas} sprints ativas | ${totalCards} cards (${cardsDone} concluídos, ${Math.round(cardsDone/Math.max(totalCards,1)*100)}%)`,
      ].join("\n")
    }

    return `Tool desconhecida: ${name}`
  } catch (err) {
    return `Erro ao consultar ${name}: ${err instanceof Error ? err.message : String(err)}`
  }
}

// ── System prompt ──────────────────────────────────────────────────────────
const SYSTEM = `Você é um assistente de gestão da SQLTech que responde perguntas sobre dados do sistema.

O sistema possui dois módulos:

---
## MÓDULO COMERCIAL

Cada **oportunidade** possui os seguintes campos:

| Campo | Descrição |
|---|---|
| **Cliente** | Nome da empresa ou pessoa (obrigatório) |
| **Produto / Serviço** | O que está sendo vendido (ex: "Projetos de BI") |
| **Origem do Lead** | Como o cliente chegou (ex: "Indicação", "Robinson") |
| **Acompanhamento** | Etapa detalhada do funil com % de probabilidade (ver abaixo) |
| **Responsável** | Vendedor responsável pela oportunidade |
| **Valor (R$)** | Valor financeiro estimado do negócio |
| **Prazo de Fechamento** | Data prevista para fechar o contrato |
| **Descrição / Observações** | Texto livre com contexto, histórico e notas |
| **Atividades Realizadas** | Lista de atividades feitas (checklist com data de criação e conclusão) |

### Campo "Acompanhamento" — etapas do funil com probabilidade:

**Coluna: Suspect**
- Mapeamento — 0%
- Apresentação — 0%

**Coluna: Lead**
- Despertou Interesse — 1%

**Coluna: Prospect C**
- Abordagem — 2%
- Dor Admitida — 5%
- Budget Identificado — 5%
- Diagrama de Poder — 5%

**Coluna: Prospect B**
- Levantamento do Ambiente — 10%
- TR / ETP — 15%
- Avaliação da Concorrência — 16%
- Proposta Emitida — 20%
- Short List — 33%
- Decisão Definida — 50%

**Coluna: Prospect A**
- Licitação — 70%
- Termos de Aceite — 90%
- Negociação de Contrato — 98%
- Assinatura de Contrato — 100%

**Colunas terminais:**
- Concluído (negócio ganho)
- Perdido (negócio perdido)

### Atividades Realizadas:
São subitens de uma oportunidade — tarefas ou reuniões registradas pelo vendedor. Cada uma tem: texto descritivo, data de criação e (se concluída) data de conclusão. Exemplo: "Apresentação da Solução BI SAP — criado 03/06/26".

---
## MÓDULO PROJETOS

- **Projetos**: nome, slug, descrição, status (ativo/arquivado), membros, sprints, cards
- **Cards**: título, status (BACKLOG/DOING/VALIDATION/DONE), prioridade (LOW/MEDIUM/HIGH/CRITICAL), responsável, sprint, story points, data de vencimento
- **Sprints**: nome, status (PLANNED/ACTIVE/COMPLETED), datas, cards associados

---
## USUÁRIOS

Perfis disponíveis: Membro Projeto, Membro Comercial, Admin Projeto, Admin Comercial, Admin Total.

---
Use as ferramentas disponíveis sempre que precisar de dados específicos. Responda sempre em português brasileiro.

## Formatação obrigatória:

**Quando houver lista de registros** (oportunidades, projetos, cards, usuários), use tabela markdown:
\`\`\`
| Coluna 1 | Coluna 2 | Coluna 3 |
|----------|----------|----------|
| valor    | valor    | valor    |
\`\`\`

**Quando houver dados numéricos comparativos** (valores por etapa, progresso, contagens), adicione um gráfico de barras APÓS a tabela usando este formato exato — cada linha é uma barra proporcional ao valor:
\`\`\`chart
Etapa A | 1200000 | ██████████ R$ 1,2M
Etapa B | 500000  | ████ R$ 500k
Etapa C | 0       |  R$ 0
\`\`\`

Regras do gráfico:
- Formato: \`Label | ValorNumerico | Barras Rótulo\`
- Barras: use █ proporcionalmente (máx 20 █ para o maior valor)
- Para porcentagens: use % no rótulo
- Inclua o gráfico sempre que tiver 2+ valores numéricos comparáveis`

// ── Route handler ─────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user || !isAdminTotal(session.user)) {
    return Response.json({ error: "Acesso negado." }, { status: 403 })
  }

  const { messages } = await req.json() as { messages: Anthropic.MessageParam[] }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        let currentMessages = [...messages]

        // Tool use loop
        while (true) {
          const response = await client.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 4096,
            system: SYSTEM,
            tools: TOOLS,
            messages: currentMessages,
          })

          // Stream text blocks
          for (const block of response.content) {
            if (block.type === "text" && block.text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", text: block.text })}\n\n`))
            }
          }

          if (response.stop_reason === "end_turn") break

          if (response.stop_reason === "tool_use") {
            const toolUseBlocks = response.content.filter(
              (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
            )

            // Signal tool calls to client
            for (const tool of toolUseBlocks) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "tool_call", name: tool.name })}\n\n`))
            }

            // Execute tools
            const toolResults: Anthropic.ToolResultBlockParam[] = []
            for (const tool of toolUseBlocks) {
              const result = await executeTool(tool.name, tool.input as Record<string, unknown>)
              toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: result })
            }

            currentMessages = [
              ...currentMessages,
              { role: "assistant", content: response.content },
              { role: "user", content: toolResults },
            ]
            continue
          }

          break
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"))
        controller.close()
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro interno"
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message: msg })}\n\n`))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
