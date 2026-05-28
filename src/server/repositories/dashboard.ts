import { db } from "@/server/db"

/** Aggregate stats for the top header bar */
export async function getDashboardStats() {
  // Get active sprint IDs first for card filtering
  const activeSprints = await db.sprint.findMany({
    where: { status: "ACTIVE" },
    select: { id: true },
  })
  const activeSprintIds = activeSprints.map((s) => s.id)

  const [activeProjects, uniqueMembers, totalCards, doneCards] = await Promise.all([
    db.project.count({ where: { archivedAt: null } }),
    db.projectMember.findMany({
      where: { removedAt: null },
      select: { userId: true },
      distinct: ["userId"],
    }),
    db.card.count({
      where: {
        archivedAt: null,
        sprintId: { in: activeSprintIds },
      },
    }),
    db.card.count({
      where: {
        archivedAt: null,
        sprintId: { in: activeSprintIds },
        status: "DONE",
      },
    }),
  ])

  const overallPct = totalCards > 0 ? Math.round((doneCards / totalCards) * 100) : 0

  return {
    activeProjects,
    activeSprints: activeSprintIds.length,
    people: uniqueMembers.length,
    overallPct,
  }
}

/** All active projects with sprint + card status counts */
export async function getDashboardProjects() {
  const projects = await db.project.findMany({
    where: { archivedAt: null },
    orderBy: { updatedAt: "desc" },
    include: {
      sprints: {
        where: { status: "ACTIVE" },
        take: 1,
        include: {
          cards: {
            where: { archivedAt: null },
            select: { id: true, status: true },
          },
        },
      },
      cards: {
        where: { archivedAt: null },
        select: { id: true, status: true },
      },
    },
  })

  return projects.map((p) => {
    const sprint = p.sprints[0] ?? null

    // Use sprint cards when active, otherwise all project cards
    const cards = sprint ? sprint.cards : p.cards
    const total = cards.length
    const done = cards.filter((c) => c.status === "DONE").length
    const doing = cards.filter((c) => c.status === "DOING").length
    const validation = cards.filter((c) => c.status === "VALIDATION").length
    const backlog = cards.filter((c) => c.status === "BACKLOG").length
    const pct = total > 0 ? Math.round((done / total) * 100) : 0

    // Days calculation
    let dayLabel = ""
    let sprintLabel = ""
    if (sprint) {
      const start = new Date(sprint.plannedStartDate)
      const end = new Date(sprint.plannedEndDate)
      const today = new Date()
      const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
      const daysPassed = Math.max(0, Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
      const daysRemaining = Math.max(0, Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))

      const currentDay = Math.min(daysPassed + 1, totalDays)
      sprintLabel = sprint.name

      if (daysRemaining === 0) {
        dayLabel = `Dia ${currentDay}/${totalDays} · encerra hoje`
      } else {
        dayLabel = `Dia ${currentDay}/${totalDays} · ${daysRemaining}d restantes`
      }
    }

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      sprint: sprint ? { id: sprint.id, name: sprintLabel, dayLabel } : null,
      pct,
      total,
      done,
      doing,
      validation,
      backlog,
    }
  })
}

/** Focus sprint = the most recently started active sprint */
export async function getFocusSprint() {
  const sprint = await db.sprint.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { startedAt: "desc" },
    include: {
      project: { select: { id: true, name: true, slug: true } },
      cards: {
        where: { archivedAt: null },
        select: { id: true, status: true, mainActivityId: true },
      },
      mainActivities: { select: { id: true, name: true, color: true } },
    },
  })
  if (!sprint) return null

  const cards = sprint.cards
  const done = cards.filter((c) => c.status === "DONE").length
  const validation = cards.filter((c) => c.status === "VALIDATION").length
  const doing = cards.filter((c) => c.status === "DOING").length
  const backlog = cards.filter((c) => c.status === "BACKLOG").length

  // Simple burndown: ideal vs real (days into sprint)
  const start = new Date(sprint.plannedStartDate)
  const end = new Date(sprint.plannedEndDate)
  const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
  const today = new Date()
  const daysPassed = Math.max(0, Math.min(totalDays, Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))))

  const total = cards.length
  // Ideal line: from total at day 0 to 0 at totalDays
  // Real line: approximate remaining = total - done (simplification)
  const idealPoints = Array.from({ length: totalDays + 1 }, (_, i) => ({
    day: i,
    value: total - Math.round((total / totalDays) * i),
  }))
  const realPoints = Array.from({ length: daysPassed + 1 }, (_, i) => ({
    day: i,
    value: i === daysPassed ? total - done : total - Math.round((done / Math.max(1, daysPassed)) * i),
  }))

  // Area distribution
  const areaDistribution = sprint.mainActivities.map((a) => ({
    id: a.id,
    name: a.name,
    color: a.color,
    count: cards.filter((c) => c.mainActivityId === a.id && c.status === "DONE").length,
  }))

  return {
    id: sprint.id,
    name: sprint.name,
    project: sprint.project,
    done,
    validation,
    doing,
    backlog,
    total,
    idealPoints,
    realPoints,
    totalDays,
    areaDistribution,
  }
}

/** Cards completed per day for the last 7 days (for velocity chart) */
export async function getVelocityData() {
  const days: { label: string; shortLabel: string; date: string; count: number }[] = []
  const now = new Date()

  // Generate last 7 days
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split("T")[0]

    const start = new Date(dateStr + "T00:00:00.000Z")
    const end = new Date(dateStr + "T23:59:59.999Z")

    const count = await db.cardStatusTransition.count({
      where: {
        toStatus: "DONE",
        movedAt: { gte: start, lte: end },
      },
    })

    const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
    const shortLabel = dayNames[d.getDay()]

    days.push({ label: shortLabel, shortLabel, date: dateStr, count })
  }

  return days
}

/** Last 10 audit log entries with actor info */
export async function getRecentActivity() {
  const logs = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      actor: { select: { id: true, name: true } },
    },
  })

  return logs.map((log) => {
    const changes = log.changes as Record<string, unknown> | null
    const after = changes?.after as Record<string, unknown> | null
    const before = changes?.before as Record<string, unknown> | null
    const title = (after?.title as string | undefined) ?? (before?.title as string | undefined) ?? null

    const timeAgo = getTimeAgo(log.createdAt)

    return {
      id: log.id,
      actorName: log.actor.name,
      action: log.action as string,
      entityType: log.entityType,
      entityId: log.entityId,
      title,
      timeAgo,
      createdAt: log.createdAt,
    }
  })
}

/** Team members currently assigned to a DOING card in an active sprint */
export async function getActiveTeamMembers() {
  // Get active sprint IDs first
  const activeSprints = await db.sprint.findMany({
    where: { status: "ACTIVE" },
    select: { id: true },
  })
  const activeSprintIds = activeSprints.map((s) => s.id)

  const doingCards = await db.card.findMany({
    where: {
      status: "DOING",
      archivedAt: null,
      assigneeId: { not: null },
      sprintId: { in: activeSprintIds },
    },
    include: {
      assignee: { select: { id: true, name: true } },
    },
    take: 12,
  })

  // Group by assignee — take first card per person
  const byAssignee = new Map<string, typeof doingCards[0]>()
  for (const card of doingCards) {
    if (card.assigneeId && !byAssignee.has(card.assigneeId)) {
      byAssignee.set(card.assigneeId, card)
    }
  }

  // Get done card counts per assignee
  const assigneeIds = Array.from(byAssignee.keys())
  const doneCounts = await Promise.all(
    assigneeIds.map(async (userId) => {
      const count = await db.card.count({
        where: {
          assigneeId: userId,
          status: "DONE",
          archivedAt: null,
          sprintId: { in: activeSprintIds },
        },
      })
      const total = await db.card.count({
        where: {
          assigneeId: userId,
          archivedAt: null,
          sprintId: { in: activeSprintIds },
        },
      })
      return { userId, done: count, total }
    })
  )

  // Also get member roles
  const members = await db.projectMember.findMany({
    where: { userId: { in: assigneeIds }, removedAt: null },
    select: { userId: true, role: true },
    distinct: ["userId"],
  })
  const roleMap = new Map(members.map((m) => [m.userId, m.role]))
  const doneMap = new Map(doneCounts.map((d) => [d.userId, d]))

  const ROLE_LABELS: Record<string, string> = {
    ADMIN: "Admin",
    SCRUM_MASTER: "Scrum Master",
    MEMBER: "Membro",
  }

  return assigneeIds.map((userId) => {
    const card = byAssignee.get(userId)!
    const counts = doneMap.get(userId) ?? { done: 0, total: 0 }
    const role = roleMap.get(userId) ?? null

    return {
      userId,
      name: card.assignee!.name,
      role: role ? (ROLE_LABELS[role] ?? role) : "Membro",
      cardTitle: card.title,
      done: counts.done,
      total: counts.total,
    }
  })
}

function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return "agora"
  if (diffMins < 60) return `${diffMins}min atrás`
  if (diffHours < 24) return `${diffHours}h atrás`
  if (diffDays === 1) return "1d atrás"
  return `${diffDays}d atrás`
}
