import type { ComercialDashboardData } from "@/server/services/comercialDashboard"
import { formatBRL, formatBRLCompact } from "@/lib/money"
import { KpiCard } from "./KpiCard"
import { BarList } from "./BarList"

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <h2 className="text-sm font-semibold mb-4">{title}</h2>
      {children}
    </div>
  )
}

export function DashboardView({ data }: { data: ComercialDashboardData }) {
  const { kpis, funil, ganhosPerdidos: gp, ranking, previsaoMeses, estagnadas, top, porProduto, porOrigem } = data

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Oportunidades abertas" value={String(kpis.abertasCount)} />
        <KpiCard label="Valor do pipeline" value={formatBRLCompact(kpis.pipelineValor)} />
        <KpiCard label="Forecast ponderado" value={formatBRLCompact(kpis.forecast)} sub="valor × probabilidade" />
        <KpiCard
          label="Ganhos no mês"
          value={formatBRLCompact(kpis.ganhosMesValor)}
          sub={`${kpis.ganhosMesCount} ${kpis.ganhosMesCount === 1 ? "negócio" : "negócios"}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funil */}
        <Section title="Funil por etapa">
          <BarList
            items={funil.map((f) => ({
              label: f.label,
              valor: f.valor,
              sub: `${f.count} · ${formatBRLCompact(f.valor)}`,
            }))}
          />
        </Section>

        {/* Ganhos x Perdidos */}
        <Section title="Ganhos × Perdidos">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Ganhos</p>
              <p className="text-xl font-bold text-green-600">{gp.ganhosCount}</p>
              <p className="text-xs text-muted-foreground">{formatBRLCompact(gp.ganhosValor)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Perdidos</p>
              <p className="text-xl font-bold text-red-600">{gp.perdidosCount}</p>
              <p className="text-xs text-muted-foreground">{formatBRLCompact(gp.perdidosValor)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Conversão</p>
              <p className="text-xl font-bold">{(gp.taxaConversao * 100).toFixed(0)}%</p>
            </div>
          </div>
        </Section>
      </div>

      {/* Ranking por responsável */}
      <Section title="Desempenho por responsável">
        {ranking.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem dados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b">
                  <th className="py-2 pr-4">Responsável</th>
                  <th className="py-2 px-2 text-right">Abertas</th>
                  <th className="py-2 px-2 text-right">Valor aberto</th>
                  <th className="py-2 px-2 text-right">Forecast</th>
                  <th className="py-2 pl-2 text-right">Ganhos</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((r) => (
                  <tr key={r.responsavel} className="border-b last:border-0">
                    <td className="py-2 pr-4">{r.responsavel}</td>
                    <td className="py-2 px-2 text-right">{r.abertasCount}</td>
                    <td className="py-2 px-2 text-right">{formatBRLCompact(r.valorAberto)}</td>
                    <td className="py-2 px-2 text-right">{formatBRLCompact(r.forecast)}</td>
                    <td className="py-2 pl-2 text-right text-green-600">{formatBRLCompact(r.ganhosValor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Previsão por mês */}
        <Section title="Previsão por mês de fechamento">
          <BarList
            items={previsaoMeses.map((m) => ({
              label: m.label,
              valor: m.valor,
              sub: formatBRLCompact(m.valor),
            }))}
          />
        </Section>

        {/* Top oportunidades */}
        <Section title="Top oportunidades em aberto">
          {top.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados.</p>
          ) : (
            <div className="space-y-2">
              {top.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{t.cliente}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.etapaLabel}{t.responsavel ? ` · ${t.responsavel}` : ""}
                    </p>
                  </div>
                  <span className="font-semibold text-green-600 shrink-0 ml-2">{formatBRLCompact(t.valor)}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Por produto */}
        <Section title="Valor por produto">
          <BarList
            items={porProduto.map((p) => ({ label: p.label, valor: p.valor, sub: formatBRLCompact(p.valor) }))}
          />
        </Section>

        {/* Por origem */}
        <Section title="Valor por origem do lead">
          <BarList
            items={porOrigem.map((o) => ({ label: o.label, valor: o.valor, sub: formatBRLCompact(o.valor) }))}
          />
        </Section>
      </div>

      {/* Estagnadas */}
      <Section title="Oportunidades estagnadas (+14 dias sem atualização)">
        {estagnadas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma oportunidade estagnada. 🎉</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b">
                  <th className="py-2 pr-4">Cliente</th>
                  <th className="py-2 px-2">Etapa / Atividade</th>
                  <th className="py-2 px-2 text-right">Valor</th>
                  <th className="py-2 px-2 text-right">Parado</th>
                  <th className="py-2 pl-2">Responsável</th>
                </tr>
              </thead>
              <tbody>
                {estagnadas.map((e) => (
                  <tr key={e.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">{e.cliente}</td>
                    <td className="py-2 px-2 text-muted-foreground">
                      {e.etapaLabel}{e.atividadeLabel ? ` · ${e.atividadeLabel}` : ""}
                    </td>
                    <td className="py-2 px-2 text-right">{e.valor ? formatBRL(e.valor) : "—"}</td>
                    <td className="py-2 px-2 text-right text-orange-600">{e.diasParado}d</td>
                    <td className="py-2 pl-2">{e.responsavel ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  )
}
