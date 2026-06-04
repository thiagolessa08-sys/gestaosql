import type { ProjetosDashboardData } from "@/server/services/projetosDashboard"
import { UsuariosCardsTable } from "./UsuariosCardsTable"
import { ProjetosCardsTable } from "./ProjetosCardsTable"

const STATUS_COLORS: Record<string, string> = {
  BACKLOG: "#c7d0e8", DOING: "#2f4bd9", VALIDATION: "#e9a23b", DONE: "#11a06a",
}
const STATUS_LABELS: Record<string, string> = {
  BACKLOG: "Backlog", DOING: "Em andamento", VALIDATION: "Validação", DONE: "Concluído",
}
const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: "#e0524a", HIGH: "#e9a23b", MEDIUM: "#2f4bd9", LOW: "#929bb2",
}
const PRIORITY_LABELS: Record<string, string> = {
  CRITICAL: "Crítica", HIGH: "Alta", MEDIUM: "Média", LOW: "Baixa",
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-[#e7eaf2] rounded-2xl shadow-[0_1px_2px_rgba(20,28,48,.04),0_6px_20px_rgba(20,28,48,.05)] ${className}`}>
      {children}
    </div>
  )
}

function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-0">
      <h3 className="font-extrabold text-[15.5px] text-[#141c30] tracking-tight">{title}</h3>
      {hint && <span className="text-xs text-[#929bb2] font-semibold whitespace-nowrap">{hint}</span>}
    </div>
  )
}

export function GerencialView({ data }: { data: ProjetosDashboardData }) {
  const { kpis, porUsuario, porProjeto, porStatus, porPrioridade, atrasadas } = data

  const maxStatus = Math.max(1, ...porStatus.map(s => s.count))
  const maxPriority = Math.max(1, ...porPrioridade.map(p => p.count))

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Cards ativos", value: kpis.total, caption: "no quadro de projetos",
            color: "#4361ee", gradient: ["#dce8ff", "#eef4ff"],
            icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
          },
          {
            label: "Em andamento", value: kpis.doing, caption: kpis.doing === 1 ? "card em execução" : "cards em execução",
            color: "#7c3aed", gradient: ["#ede9ff", "#f5f3ff"],
            icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
          },
          {
            label: "Em validação", value: kpis.validation, caption: "aguardando aprovação",
            color: "#d97706", gradient: ["#fef3c7", "#fffbeb"],
            icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 12l2 2 4-4"/></svg>,
          },
          {
            label: "Concluídos", value: kpis.done, caption: "entregue no período",
            color: "#059669", gradient: ["#d1fae5", "#ecfdf5"],
            icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M20 6 9 17l-5-5"/></svg>,
          },
        ].map(k => (
          <div key={k.label} className="relative overflow-hidden rounded-2xl p-5 shadow-[0_1px_2px_rgba(20,28,48,.04),0_6px_20px_rgba(20,28,48,.06)]"
            style={{ background: `linear-gradient(135deg, ${k.gradient[0]} 0%, ${k.gradient[1]} 100%)`, border: `1.5px solid ${k.color}` }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-white" style={{ background: k.color }}>
              {k.icon}
            </div>
            <p className="text-[13px] text-[#586079] font-semibold">{k.label}</p>
            <p className="text-3xl font-extrabold tracking-tight mt-1 leading-tight" style={{ color: k.color }}>{k.value}</p>
            <p className="text-xs text-[#929bb2] font-semibold mt-2">{k.caption}</p>
            <svg className="absolute right-0 bottom-0 w-[118px] h-[46px] opacity-50" viewBox="0 0 118 46" preserveAspectRatio="none">
              <path d="M0 38 L20 34 L40 36 L60 26 L80 28 L98 16 L118 12" fill="none" stroke={k.color} strokeWidth="2.4"/>
              <path d="M0 38 L20 34 L40 36 L60 26 L80 28 L98 16 L118 12 V46 H0 Z" fill={k.color} fillOpacity=".08"/>
            </svg>
          </div>
        ))}
      </div>

      {/* Por usuário */}
      <Card>
        <SectionHeader title="Atividades por responsável" hint={`${porUsuario.length} pessoas · clique para ver cards`} />
        <UsuariosCardsTable porUsuario={porUsuario} />
      </Card>

      {/* Por projeto */}
      <Card>
        <SectionHeader title="Atividades por projeto" hint={`${porProjeto.length} projetos · clique para ver cards`} />
        <ProjetosCardsTable porProjeto={porProjeto} />
      </Card>

      {/* Distribuição */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <SectionHeader title="Distribuição por status" />
          <div className="px-5 py-4 space-y-3">
            {porStatus.map(s => (
              <div key={s.status}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-[#141c30]">{STATUS_LABELS[s.status]}</span>
                  <span className="text-[#586079]">{s.count}</span>
                </div>
                <div className="h-2.5 rounded-full bg-[#eef1f7] overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(s.count > 0 ? 2 : 0, (s.count / maxStatus) * 100)}%`, background: STATUS_COLORS[s.status] }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionHeader title="Distribuição por prioridade" />
          <div className="px-5 py-4 space-y-3">
            {porPrioridade.map(p => (
              <div key={p.prioridade}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-[#141c30]">{PRIORITY_LABELS[p.prioridade]}</span>
                  <span className="text-[#586079]">{p.count}</span>
                </div>
                <div className="h-2.5 rounded-full bg-[#eef1f7] overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(p.count > 0 ? 2 : 0, (p.count / maxPriority) * 100)}%`, background: PRIORITY_COLORS[p.prioridade] }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Atrasadas */}
      <Card>
        <SectionHeader title="Atividades atrasadas" hint={`${atrasadas.length} cards com prazo vencido`} />
        {atrasadas.length === 0 ? (
          <p className="px-5 py-6 text-sm text-[#929bb2]">Nenhuma atividade atrasada. 🎉</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {["Card", "Status", "Projeto", "Sprint", "Responsável", "Prazo", "Atraso"].map((h, i) => (
                    <th key={h} className={`py-2 px-4 text-[11px] tracking-[.06em] uppercase text-[#929bb2] font-bold ${i <= 2 ? "text-left" : "text-right"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {atrasadas.map(c => (
                  <tr key={c.id} className="border-t border-[#f0f2f8] hover:bg-[#fafbfe]">
                    <td className="px-4 py-3 text-sm font-medium text-[#141c30] max-w-[200px] truncate">{c.titulo}</td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: STATUS_COLORS[c.status] }}>{STATUS_LABELS[c.status]}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#586079]">{c.projeto}</td>
                    <td className="px-4 py-3 text-xs text-[#586079] text-right">{c.sprint ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-[#586079] text-right">{c.responsavel ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-right text-red-600">{new Date(c.dueDate).toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-3 text-right font-extrabold text-red-600">{c.diasAtraso}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
