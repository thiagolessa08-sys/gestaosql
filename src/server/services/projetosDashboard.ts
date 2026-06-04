import { db } from "@/server/db"

export type CardStatus = "BACKLOG" | "DOING" | "VALIDATION" | "DONE"
export type CardPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"

export interface ProjetosDashboardData {
  kpis: { total: number; doing: number; validation: number; done: number }
  porUsuario: {
    usuarioId: string
    nome: string
    total: number
    doing: number
    validation: number
    done: number
  }[]
  porProjeto: {
    projetoId: string
    nome: string
    slug: string
    total: number
    doing: number
    validation: number
    done: number
    pct: number
  }[]
  porStatus: { status: CardStatus; count: number }[]
  porPrioridade: { prioridade: CardPriority; count: number }[]
  atrasadas: {
    id: string
    titulo: string
    status: CardStatus
    prioridade: CardPriority
    diasAtraso: number
    responsavel: string | null
    projeto: string
    sprint: string | null
    dueDate: Date
  }[]
}

export async function getProjetosDashboard(): Promise<ProjetosDashboardData> {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const cards = await db.card.findMany({
    where: { archivedAt: null },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      dueDate: true,
      assigneeId: true,
      projectId: true,
      assignee: { select: { id: true, name: true } },
      project: { select: { id: true, name: true, slug: true } },
      sprint: { select: { name: true } },
    },
  })

  // KPIs
  const kpis = {
    total: cards.length,
    doing: cards.filter(c => c.status === "DOING").length,
    validation: cards.filter(c => c.status === "VALIDATION").length,
    done: cards.filter(c => c.status === "DONE").length,
  }

  // Por usuário
  const usuarioMap = new Map<string, typeof cards>()
  const semResponsavel: typeof cards = []
  for (const c of cards) {
    if (!c.assigneeId) { semResponsavel.push(c); continue }
    if (!usuarioMap.has(c.assigneeId)) usuarioMap.set(c.assigneeId, [])
    usuarioMap.get(c.assigneeId)!.push(c)
  }
  if (semResponsavel.length) usuarioMap.set("__sem_responsavel__", semResponsavel)

  const porUsuario = [...usuarioMap.entries()].map(([uid, cs]) => ({
    usuarioId: uid,
    nome: uid === "__sem_responsavel__" ? "Sem responsável" : (cs[0].assignee?.name ?? uid),
    total: cs.length,
    doing: cs.filter(c => c.status === "DOING").length,
    validation: cs.filter(c => c.status === "VALIDATION").length,
    done: cs.filter(c => c.status === "DONE").length,
  })).sort((a, b) => b.total - a.total)

  // Por projeto
  const projetoMap = new Map<string, typeof cards>()
  for (const c of cards) {
    if (!projetoMap.has(c.projectId)) projetoMap.set(c.projectId, [])
    projetoMap.get(c.projectId)!.push(c)
  }
  const porProjeto = [...projetoMap.entries()].map(([pid, cs]) => {
    const done = cs.filter(c => c.status === "DONE").length
    return {
      projetoId: pid,
      nome: cs[0].project.name,
      slug: cs[0].project.slug,
      total: cs.length,
      doing: cs.filter(c => c.status === "DOING").length,
      validation: cs.filter(c => c.status === "VALIDATION").length,
      done,
      pct: cs.length > 0 ? Math.round((done / cs.length) * 100) : 0,
    }
  }).sort((a, b) => b.total - a.total)

  // Por status
  const statusOrder: CardStatus[] = ["BACKLOG", "DOING", "VALIDATION", "DONE"]
  const porStatus = statusOrder.map(status => ({
    status,
    count: cards.filter(c => c.status === status).length,
  }))

  // Por prioridade
  const prioridades: CardPriority[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
  const porPrioridade = prioridades.map(p => ({
    prioridade: p,
    count: cards.filter(c => c.priority === p).length,
  }))

  // Atrasadas
  const atrasadas = cards
    .filter(c => c.dueDate && c.dueDate < hoje && c.status !== "DONE")
    .map(c => ({
      id: c.id,
      titulo: c.title,
      status: c.status as CardStatus,
      prioridade: c.priority as CardPriority,
      diasAtraso: Math.floor((hoje.getTime() - new Date(c.dueDate!).getTime()) / (1000 * 60 * 60 * 24)),
      responsavel: c.assignee?.name ?? null,
      projeto: c.project.name,
      sprint: c.sprint?.name ?? null,
      dueDate: c.dueDate!,
    }))
    .sort((a, b) => b.diasAtraso - a.diasAtraso)
    .slice(0, 20)

  return { kpis, porUsuario, porProjeto, porStatus, porPrioridade, atrasadas }
}
