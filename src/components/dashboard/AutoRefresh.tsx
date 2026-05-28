"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

interface Props {
  intervalSeconds?: number
}

export function AutoRefresh({ intervalSeconds = 60 }: Props) {
  const router = useRouter()
  const [countdown, setCountdown] = useState(intervalSeconds)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const countdownRef = useRef(intervalSeconds)

  useEffect(() => {
    countdownRef.current = intervalSeconds
    setCountdown(intervalSeconds)

    const tick = setInterval(() => {
      countdownRef.current -= 1
      setCountdown(countdownRef.current)

      if (countdownRef.current <= 0) {
        countdownRef.current = intervalSeconds
        setCountdown(intervalSeconds)
        setLastUpdated(new Date())
        router.refresh()
      }
    }, 1000)

    return () => clearInterval(tick)
  }, [router, intervalSeconds])

  const fmt = lastUpdated.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })

  return (
    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      <span>Atualiza em {countdown}s · última vez {fmt}</span>
    </div>
  )
}
