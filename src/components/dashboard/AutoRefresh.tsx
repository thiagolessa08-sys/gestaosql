"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"

interface Props {
  intervalSeconds?: number
}

export function AutoRefresh({ intervalSeconds = 60 }: Props) {
  const router = useRouter()
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [countdown, setCountdown] = useState(intervalSeconds)

  const refresh = useCallback(() => {
    router.refresh()
    setLastUpdated(new Date())
    setCountdown(intervalSeconds)
  }, [router, intervalSeconds])

  // Countdown tick every second
  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          refresh()
          return intervalSeconds
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(tick)
  }, [refresh, intervalSeconds])

  const fmt = lastUpdated.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })

  return (
    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
      <span
        className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"
      />
      <span>Atualiza em {countdown}s · última vez {fmt}</span>
    </div>
  )
}
