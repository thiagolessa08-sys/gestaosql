"use client"

import { useState } from "react"
import { Maximize2, Minimize2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  children: React.ReactNode
}

export function PainelFullscreenWrapper({ children }: Props) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 overflow-auto bg-background">
        <div className="px-3 py-6 max-w-[1600px] mx-auto w-full">
          <div className="flex justify-end mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(false)}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <Minimize2 className="h-4 w-4" />
              Sair da tela cheia
            </Button>
          </div>
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="absolute top-0 right-52 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsFullscreen(true)}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <Maximize2 className="h-4 w-4" />
          Tela cheia
        </Button>
      </div>
      {children}
    </div>
  )
}
