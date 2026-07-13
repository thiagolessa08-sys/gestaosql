"use client"

import { useState } from "react"
import { ChevronRight } from "lucide-react"

interface Props {
  count: number
  children: React.ReactNode
}

export function CollapsibleEncerradas({ count, children }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3 hover:text-foreground transition-colors"
      >
        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-90" : ""}`} />
        {open ? "Ocultar encerradas" : "Ver sprints encerradas"} ({count})
      </button>
      {open && children}
    </div>
  )
}
