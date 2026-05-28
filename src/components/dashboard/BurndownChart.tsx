"use client"

interface Point {
  day: number
  value: number
}

interface Props {
  ideal: Point[]
  real: Point[]
  totalDays: number
  maxValue: number
}

export function BurndownChart({ ideal, real, totalDays, maxValue }: Props) {
  const W = 400
  const H = 120
  const PAD = { top: 8, right: 8, bottom: 24, left: 28 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  function x(day: number) {
    return PAD.left + (day / Math.max(1, totalDays)) * chartW
  }
  function y(val: number) {
    return PAD.top + chartH - (val / Math.max(1, maxValue)) * chartH
  }

  function toPath(points: Point[]) {
    if (points.length === 0) return ""
    return points
      .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.day).toFixed(1)},${y(p.value).toFixed(1)}`)
      .join(" ")
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
        const yPos = PAD.top + chartH * (1 - frac)
        return (
          <line
            key={frac}
            x1={PAD.left}
            y1={yPos}
            x2={W - PAD.right}
            y2={yPos}
            stroke="currentColor"
            strokeWidth={0.5}
            className="text-border"
          />
        )
      })}

      {/* Ideal line (dashed, muted) */}
      <path
        d={toPath(ideal)}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeDasharray="4 3"
        className="text-muted-foreground/50"
      />

      {/* Real line (solid, primary) */}
      <path
        d={toPath(real)}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Last real point dot */}
      {real.length > 0 && (
        <circle
          cx={x(real[real.length - 1].day)}
          cy={y(real[real.length - 1].value)}
          r={3}
          fill="hsl(var(--primary))"
        />
      )}
    </svg>
  )
}
