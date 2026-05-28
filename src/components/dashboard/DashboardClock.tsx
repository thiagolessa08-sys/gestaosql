"use client"

import { useState, useEffect } from "react"

export function DashboardClock() {
  const [time, setTime] = useState("")
  const [dateStr, setDateStr] = useState("")

  useEffect(() => {
    function update() {
      const now = new Date()
      setTime(now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }))
      setDateStr(
        now
          .toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })
          .replace(",", "")
          .replace(/\b\w/g, (c) => c.toUpperCase())
      )
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="text-right">
      <div className="flex items-center gap-2 justify-end">
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-3xl font-bold tabular-nums">{time}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-0.5">{dateStr}</p>
    </div>
  )
}
