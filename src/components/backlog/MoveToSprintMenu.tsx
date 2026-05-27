"use client"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ChevronDown } from "lucide-react"

interface SprintLite {
  id: string
  name: string
  status: string
}

interface Props {
  sprints: SprintLite[]
  onMove: (sprintId: string) => void
  triggerLabel?: string
  disabled?: boolean
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Ativa",
  PLANNED: "Planejada",
}

export function MoveToSprintMenu({ sprints, onMove, triggerLabel = "Mover para sprint", disabled }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled || sprints.length === 0}>
          {triggerLabel}
          <ChevronDown className="h-3.5 w-3.5 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[220px]">
        <DropdownMenuLabel>Escolha uma sprint</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {sprints.length === 0 ? (
          <DropdownMenuItem disabled>Nenhuma sprint disponível</DropdownMenuItem>
        ) : (
          sprints.map((s) => (
            <DropdownMenuItem key={s.id} onClick={() => onMove(s.id)}>
              <span className="flex-1 truncate">{s.name}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {STATUS_LABEL[s.status] ?? s.status}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
