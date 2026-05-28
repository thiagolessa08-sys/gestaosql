"use client"

interface Day {
  label: string
  count: number
}

interface Props {
  days: Day[]
  weekTotal: number
}

export function VelocityChart({ days, weekTotal: _weekTotal }: Props) {
  const max = Math.max(...days.map((d) => d.count), 1)

  return (
    <div>
      <div className="flex items-end justify-between gap-1 h-16">
        {days.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] font-medium text-foreground">{d.count > 0 ? d.count : ""}</span>
            <div
              className="w-full rounded-t-sm bg-primary/80 transition-all"
              style={{ height: `${(d.count / max) * 48}px`, minHeight: d.count > 0 ? "4px" : "2px" }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between gap-1 mt-1">
        {days.map((d, i) => (
          <div key={i} className="flex-1 text-center">
            <span className="text-[9px] text-muted-foreground uppercase">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
