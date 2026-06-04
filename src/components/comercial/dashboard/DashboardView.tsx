import type { ComercialDashboardData } from "@/server/services/comercialDashboard"
import { RankingTable } from "./RankingTable"
import { FunilEtapas } from "./FunilEtapas"
import { PrevisaoMeses } from "./PrevisaoMeses"
import { BarListClicavel } from "./BarListClicavel"
import { formatBRL, formatBRLCompact } from "@/lib/money"
import { EtapaComercial } from "@prisma/client"

/* ── helpers ────────────────────────────────────────────── */
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

/* ── sparkline ───────────────────────────────────────────── */
function Spark({ color }: { color: string }) {
  return (
    <svg className="absolute right-0 bottom-0 w-[118px] h-[46px] opacity-50" viewBox="0 0 118 46" preserveAspectRatio="none">
      <path d="M0 38 L20 34 L40 36 L60 26 L80 28 L98 16 L118 12" fill="none" stroke={color} strokeWidth="2.4"/>
      <path d="M0 38 L20 34 L40 36 L60 26 L80 28 L98 16 L118 12 V46 H0 Z" fill={color} fillOpacity=".08"/>
    </svg>
  )
}

/* ── KPI card ────────────────────────────────────────────── */
interface KpiProps {
  label: string; value: string; caption: string
  chipColor: string; sparkColor: string; gradientFrom: string; gradientTo: string
  valueColor?: string
  icon: React.ReactNode
}
function KpiCard({ label, value, caption, chipColor, sparkColor, gradientFrom, gradientTo, valueColor, icon }: KpiProps) {
  return (
    <div
      className="rounded-2xl p-5 relative overflow-hidden shadow-[0_1px_2px_rgba(20,28,48,.04),0_6px_20px_rgba(20,28,48,.06)]"
      style={{ background: `linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%)`, border: `1.5px solid ${chipColor}` }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 text-white" style={{ background: chipColor }}>
        {icon}
      </div>
      <p className="text-[13px] text-[#586079] font-semibold">{label}</p>
      <p className="text-3xl font-extrabold tracking-tight mt-1.5 leading-tight" style={{ color: valueColor ?? "#141c30" }}>{value}</p>
      <p className="text-xs text-[#929bb2] font-semibold mt-2">{caption}</p>
      <Spark color={sparkColor} />
    </div>
  )
}

/* ── donut ───────────────────────────────────────────────── */
function Donut({ pct }: { pct: number }) {
  const dash = (pct / 100) * 99.9
  return (
    <div className="relative w-[168px] h-[168px] shrink-0">
      <svg viewBox="0 0 42 42" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
        <circle cx="21" cy="21" r="15.9" fill="none" stroke="#eef1f7" strokeWidth="5"/>
        <circle cx="21" cy="21" r="15.9" fill="none" stroke="url(#dg)" strokeWidth="5"
          strokeLinecap="round" strokeDasharray={`${dash} 100`} strokeDashoffset="0"/>
        <defs>
          <linearGradient id="dg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#11a06a"/><stop offset="1" stopColor="#2cc187"/>
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[34px] font-extrabold tracking-tight leading-none">{pct.toFixed(0)}%</span>
        <span className="text-[11.5px] text-[#929bb2] font-bold uppercase tracking-[.1em] mt-1.5">Conversão</span>
      </div>
    </div>
  )
}

/* ── main component ──────────────────────────────────────── */
export function DashboardView({ data }: { data: ComercialDashboardData }) {
  const { kpis, funil, ganhosPerdidos: gp, ranking, previsaoMeses, estagnadas, top, porProduto, porOrigem } = data


  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiCard label="Oportunidades abertas" value={String(kpis.abertasCount)} caption="em etapas do funil"
          chipColor="#4361ee" sparkColor="#4361ee"
          gradientFrom="#dce8ff" gradientTo="#eef4ff"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M3 3v18h18"/><path d="M7 14l3-3 3 3 5-6"/></svg>} />
        <KpiCard label="Valor do pipeline" value={formatBRLCompact(kpis.pipelineValor)} caption="soma das oportunidades abertas"
          chipColor="#0ea5c9" sparkColor="#0ea5c9"
          gradientFrom="#cff0fb" gradientTo="#e8f9fd"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>} />
        <KpiCard label="Forecast ponderado" value={formatBRLCompact(kpis.forecast)} caption="valor × probabilidade"
          chipColor="#7c3aed" sparkColor="#7c3aed"
          gradientFrom="#ede9ff" gradientTo="#f5f3ff"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 12 22 4"/><path d="M12 12V2"/></svg>} />
        <KpiCard label="Ganhos no mês" value={formatBRLCompact(kpis.ganhosMesValor)}
          caption={`${kpis.ganhosMesCount} ${kpis.ganhosMesCount === 1 ? "negócio fechado" : "negócios fechados"}`}
          chipColor="#059669" sparkColor="#059669" valueColor="#065f46"
          gradientFrom="#d1fae5" gradientTo="#ecfdf5"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M20 6 9 17l-5-5"/></svg>} />
      </div>

      {/* Funil + Ganhos×Perdidos */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.32fr_1fr] gap-5">
        <Card>
          <SectionHeader title="Funil por etapa" hint="clique para ver oportunidades" />
          <FunilEtapas funil={funil} />
        </Card>

        <Card>
          <SectionHeader title="Ganhos × Perdidos" hint="histórico total" />
          <div className="px-5 py-5 flex items-center gap-6">
            <Donut pct={Math.round(gp.taxaConversao * 100)} />
            <div className="flex flex-col gap-3 flex-1">
              <div className="flex items-center gap-3 p-3 rounded-[13px] border border-[#eef0f6] bg-[#fbfcfe]">
                <div className="w-[38px] h-[38px] rounded-[11px] bg-[#e4f6ee] text-[#11a06a] flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-5 h-5"><path d="M20 6 9 17l-5-5"/></svg>
                </div>
                <div className="flex-1">
                  <span className="text-[12.5px] text-[#586079] font-semibold">Ganhos</span>
                  <b className="block text-[22px] font-extrabold tracking-tight mt-0.5">{gp.ganhosCount}</b>
                </div>
                <span className="text-[13px] font-bold text-[#0c8a5b]">{formatBRLCompact(gp.ganhosValor)}</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-[13px] border border-[#eef0f6] bg-[#fbfcfe]">
                <div className="w-[38px] h-[38px] rounded-[11px] bg-[#fcebe9] text-[#e0524a] flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-5 h-5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </div>
                <div className="flex-1">
                  <span className="text-[12.5px] text-[#586079] font-semibold">Perdidos</span>
                  <b className="block text-[22px] font-extrabold tracking-tight mt-0.5">{gp.perdidosCount}</b>
                </div>
                <span className="text-[13px] font-bold text-[#586079]">{formatBRLCompact(gp.perdidosValor)}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Ranking */}
      <Card>
        <SectionHeader title="Desempenho por responsável" hint={`${ranking.length} responsável${ranking.length !== 1 ? "is" : ""} · clique para ver relatório`} />
        <RankingTable ranking={ranking} />
      </Card>

      {/* Forecast + Top */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <SectionHeader title="Previsão por mês de fechamento" hint="clique para ver oportunidades" />
          <PrevisaoMeses previsaoMeses={previsaoMeses} />
        </Card>

        <Card>
          <SectionHeader title="Top oportunidades em aberto" hint="maior valor" />
          <div className="px-3 py-2">
            {top.length === 0 ? (
              <p className="px-3 py-4 text-sm text-[#929bb2]">Sem dados.</p>
            ) : top.map((t, i) => (
              <div key={t.id} className="flex items-center gap-3.5 px-3 py-3 rounded-[13px] hover:bg-[#f7f9fd] transition-colors">
                <div className="w-[30px] h-[30px] rounded-[9px] bg-[#e9eeff] text-[#2f4bd9] flex items-center justify-center font-extrabold text-[12.5px] shrink-0">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <b className="block text-[14.5px] font-bold text-[#141c30] truncate">{t.cliente}</b>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#e9eeff] text-[#2843c9]">{t.etapaLabel}</span>
                    {t.responsavel && (
                      <span className="flex items-center gap-1.5 text-[12.5px] text-[#586079] font-semibold">
                        <span className="w-[18px] h-[18px] rounded-[6px] bg-gradient-to-br from-[#3a55e6] to-[#6b46f2] flex items-center justify-center text-white text-[9.5px] font-extrabold">{t.responsavel.charAt(0).toUpperCase()}</span>
                        {t.responsavel}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[15px] font-extrabold text-[#0c8a5b] whitespace-nowrap">{formatBRLCompact(t.valor)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Produto + Origem */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card>
          <SectionHeader title="Valor por produto" hint="clique para ver oportunidades" />
          <div className="px-5 py-4">
            <BarListClicavel items={porProduto} tipo="produto" />
          </div>
        </Card>
        <Card>
          <SectionHeader title="Valor por origem do lead" hint="clique para ver oportunidades" />
          <div className="px-5 py-4">
            <BarListClicavel items={porOrigem} tipo="origem" />
          </div>
        </Card>
      </div>

      {/* Estagnadas */}
      <Card>
        <SectionHeader title="Oportunidades estagnadas" hint="+14 dias sem atualização" />
        {estagnadas.length === 0 ? (
          <p className="px-5 py-6 text-sm text-[#929bb2]">Nenhuma oportunidade estagnada. 🎉</p>
        ) : (
          <table className="w-full border-collapse mt-1">
            <thead>
              <tr>
                {["Cliente","Etapa / Atividade","Valor","Parado","Responsável"].map((h, i) => (
                  <th key={h} className={`py-2 px-5 text-[11.5px] tracking-[.06em] uppercase text-[#929bb2] font-bold ${i >= 2 ? "text-right" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {estagnadas.map(e => (
                <tr key={e.id} className="border-t border-[#f0f2f8] hover:bg-[#fafbfe]">
                  <td className="px-5 py-3.5 font-bold text-[14px] text-[#141c30]">{e.cliente}</td>
                  <td className="px-5 py-3.5 text-[13px] text-[#586079]">{e.etapaLabel}{e.atividadeLabel ? ` · ${e.atividadeLabel}` : ""}</td>
                  <td className="px-5 py-3.5 text-right text-[14px] font-semibold text-[#141c30]">{e.valor ? formatBRL(e.valor) : "—"}</td>
                  <td className="px-5 py-3.5 text-right font-extrabold text-[#e9a23b]">{e.diasParado}d</td>
                  <td className="px-5 py-3.5 text-[13px] text-[#586079]">{e.responsavel ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
