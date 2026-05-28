import { redirect } from "next/navigation"
import { auth } from "@/server/auth/config"
import {
  getDashboardStats,
  getDashboardProjects,
  getFocusSprint,
  getVelocityData,
  getRecentActivity,
  getActiveTeamMembers,
} from "@/server/repositories/dashboard"
import { DashboardClock } from "@/components/dashboard/DashboardClock"
import { BurndownChart } from "@/components/dashboard/BurndownChart"
import { VelocityChart } from "@/components/dashboard/VelocityChart"
import { PainelFullscreenWrapper } from "@/components/dashboard/PainelFullscreenWrapper"
import { AutoRefresh } from "@/components/dashboard/AutoRefresh"
import { getInitials } from "@/lib/project-colors"

export const revalidate = 30 // revalidate every 30s

const ACTION_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  CREATE: { icon: "+", color: "text-emerald-500", label: "criou" },
  MOVE: { icon: "→", color: "text-blue-500", label: "moveu" },
  COMMENT: { icon: "□", color: "text-amber-500", label: "comentou em" },
  UPDATE: { icon: "✎", color: "text-purple-500", label: "atualizou" },
  ASSIGN: { icon: "→", color: "text-blue-500", label: "atribuiu" },
  DELETE: { icon: "×", color: "text-red-500", label: "removeu" },
  START_SPRINT: { icon: "▶", color: "text-emerald-500", label: "iniciou sprint" },
  END_SPRINT: { icon: "■", color: "text-slate-500", label: "encerrou sprint" },
}

function getUserAvatarStyle(name: string) {
  const colors = [
    { bg: "#6366f1", text: "#fff" },
    { bg: "#f59e0b", text: "#fff" },
    { bg: "#10b981", text: "#fff" },
    { bg: "#3b82f6", text: "#fff" },
    { bg: "#ec4899", text: "#fff" },
    { bg: "#8b5cf6", text: "#fff" },
    { bg: "#14b8a6", text: "#fff" },
    { bg: "#f97316", text: "#fff" },
  ]
  const idx = name.charCodeAt(0) % colors.length
  return colors[idx]
}

export default async function PainelPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const [stats, projects, focusSprint, velocity, activity, team] = await Promise.all([
    getDashboardStats(),
    getDashboardProjects(),
    getFocusSprint(),
    getVelocityData(),
    getRecentActivity(),
    getActiveTeamMembers(),
  ])

  const weekTotal = velocity.reduce((s, d) => s + d.count, 0)
  const activeProjectsWithSprint = projects.filter((p) => p.sprint !== null).length
  const activeProjectsNoSprint = projects.filter((p) => p.sprint === null).length

  return (
    <PainelFullscreenWrapper>
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between gap-6 pb-4 border-b">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-foreground text-background text-sm font-bold">
              SQ
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">SQLTech Gestão</h1>
              <p className="text-xs text-muted-foreground">Painel de operações · tempo real</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 text-center">
          <div>
            <p className="text-2xl font-bold">{stats.activeProjects}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Projetos ativos</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div>
            <p className="text-2xl font-bold">{stats.activeSprints}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Sprints em curso</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div>
            <p className="text-2xl font-bold">{stats.people}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pessoas</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div>
            <p className="text-2xl font-bold text-primary">{stats.overallPct}%</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Conclusão geral</p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <DashboardClock />
          <AutoRefresh intervalSeconds={60} />
        </div>
      </div>

      {/* ─── Main 3-column grid ─── */}
      <div className="grid grid-cols-[1fr_1fr_280px] gap-5">
        {/* ── LEFT: Projects ── */}
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold text-sm">Projetos</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            {activeProjectsWithSprint} com sprint ativa · {activeProjectsNoSprint} sem sprint
          </p>
          <div className="space-y-2">
            {projects.map((p) => {
              const initials = getInitials(p.name).slice(0, 2)
              const color = getUserAvatarStyle(p.name)
              const hasActive = !!p.sprint
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg border bg-background hover:bg-accent/40 transition-colors"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: color.bg, color: color.text }}
                  >
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {hasActive ? `${p.sprint!.name} · ${p.sprint!.dayLabel}` : "Sem sprint ativa"}
                    </p>
                    {hasActive && p.total > 0 && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden flex">
                          <div className="h-full bg-emerald-500" style={{ width: `${(p.done / p.total) * 100}%` }} />
                          <div className="h-full bg-orange-400" style={{ width: `${(p.doing / p.total) * 100}%` }} />
                          <div className="h-full bg-blue-400" style={{ width: `${(p.validation / p.total) * 100}%` }} />
                        </div>
                        <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                          <span>■{p.done}</span>
                          <span className="text-orange-500">■{p.doing}</span>
                          <span className="text-blue-500">■{p.validation}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold">{p.pct}%</p>
                  </div>
                </div>
              )
            })}
            {projects.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum projeto ativo.</p>
            )}
          </div>
        </div>

        {/* ── MIDDLE: Sprint focus ── */}
        <div className="space-y-4">
          {focusSprint ? (
            <>
              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <h2 className="font-semibold text-sm">
                      {focusSprint.name} · {focusSprint.project.name}
                    </h2>
                    <p className="text-[10px] text-muted-foreground">Burndown da sprint em foco</p>
                  </div>
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">
                    ● Em andamento
                  </span>
                </div>

                {/* Status boxes */}
                <div className="grid grid-cols-4 gap-2 my-3">
                  {[
                    { label: "CONCLUÍDO", value: focusSprint.done, color: "text-emerald-600" },
                    { label: "VALIDAÇÃO", value: focusSprint.validation, color: "text-blue-600" },
                    { label: "EM CURSO", value: focusSprint.doing, color: "text-orange-500" },
                    { label: "BACKLOG", value: focusSprint.backlog, color: "text-muted-foreground" },
                  ].map((s) => (
                    <div key={s.label} className="text-center p-2 rounded-lg border bg-muted/30">
                      <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wide">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Burndown chart */}
                <BurndownChart
                  ideal={focusSprint.idealPoints}
                  real={focusSprint.realPoints}
                  totalDays={focusSprint.totalDays}
                  maxValue={focusSprint.total}
                />
                <div className="flex items-center gap-4 mt-1 justify-end">
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span className="w-6 border-t border-dashed border-muted-foreground/50 inline-block" /> Ideal
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span className="w-6 border-t-2 border-primary inline-block" /> Real
                  </span>
                </div>
              </div>

              {/* Velocity */}
              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="font-semibold text-sm">Velocidade</h2>
                    <p className="text-[10px] text-muted-foreground">Cards concluídos · últimos 7 dias</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">{weekTotal}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">na semana</p>
                  </div>
                </div>

                <VelocityChart
                  days={velocity.map((d) => ({ label: d.label, count: d.count }))}
                  weekTotal={weekTotal}
                />

                {/* Area distribution */}
                {focusSprint.areaDistribution.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-[10px] text-muted-foreground">Distribuição por área</p>
                    {focusSprint.areaDistribution.slice(0, 4).map((a) => (
                      <div key={a.id} className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: a.color }}
                        />
                        <span className="text-xs flex-1 truncate">{a.name}</span>
                        <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              backgroundColor: a.color,
                              width: `${focusSprint.total > 0 ? (a.count / focusSprint.total) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-4 text-right">{a.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-xl border bg-card p-8 text-center">
              <p className="text-muted-foreground text-sm">Nenhuma sprint ativa no momento.</p>
            </div>
          )}
        </div>

        {/* ── RIGHT: Activity feed ── */}
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold text-sm">Atividade ao vivo</h2>
              <p className="text-[10px] text-muted-foreground">Últimas movimentações</p>
            </div>
            <span className="text-[10px] bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">
              ● AO VIVO
            </span>
          </div>

          <div className="space-y-3">
            {activity.map((a) => {
              const cfg = ACTION_CONFIG[a.action] ?? {
                icon: "·",
                color: "text-muted-foreground",
                label: a.action.toLowerCase(),
              }
              const avatarStyle = getUserAvatarStyle(a.actorName)
              return (
                <div key={a.id} className="flex items-start gap-2">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5"
                    style={{ background: avatarStyle.bg, color: avatarStyle.text }}
                  >
                    {getInitials(a.actorName).slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] leading-snug">
                      <span className="font-semibold">{a.actorName.split(" ")[0]}</span>{" "}
                      <span className="text-muted-foreground">{cfg.label}</span>
                      {a.title && (
                        <>
                          {" "}
                          <span className="font-medium">&ldquo;{a.title}&rdquo;</span>
                        </>
                      )}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{a.timeAgo}</p>
                  </div>
                  <span className={`text-xs font-bold shrink-0 mt-0.5 ${cfg.color}`}>{cfg.icon}</span>
                </div>
              )
            })}
            {activity.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhuma atividade recente.</p>
            )}
          </div>
        </div>
      </div>

      {/* ─── Team section ─── */}
      {team.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold text-sm">Equipe · executando agora</h2>
            <span className="text-xs text-muted-foreground">{team.length} ativos</span>
          </div>
          <p className="text-[10px] text-muted-foreground mb-4">Quem está em cada card</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {team.map((m) => {
              const avatarStyle = getUserAvatarStyle(m.name)
              const initials = getInitials(m.name).slice(0, 2)
              return (
                <div key={m.userId} className="border rounded-lg p-3 bg-background">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: avatarStyle.bg, color: avatarStyle.text }}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">{m.name.split(" ")[0]}</p>
                      <p className="text-[9px] text-muted-foreground truncate">{m.role}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full mb-1.5">
                    ● EM ANDAMENTO
                  </span>
                  <p className="text-[10px] text-muted-foreground line-clamp-2 mb-2">{m.cardTitle}</p>
                  <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                    <span>{m.done} conclu.</span>
                    <span>{m.total} total</span>
                  </div>
                  {m.total > 0 && (
                    <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${(m.done / m.total) * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
    </PainelFullscreenWrapper>
  )
}
