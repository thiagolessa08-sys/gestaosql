"use client"

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Search, X } from "lucide-react"

interface Member {
  id: string
  user: { id: string; name: string }
}

interface Props {
  searchQuery: string
  priorityFilter: "ALL" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  assigneeFilter: string
  members: Member[]
  onSearchChange: (v: string) => void
  onPriorityChange: (v: "ALL" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL") => void
  onAssigneeChange: (v: string) => void
  onClear: () => void
}

export function BacklogFilters({
  searchQuery,
  priorityFilter,
  assigneeFilter,
  members,
  onSearchChange,
  onPriorityChange,
  onAssigneeChange,
  onClear,
}: Props) {
  const hasActive = searchQuery !== "" || priorityFilter !== "ALL" || assigneeFilter !== "ALL"

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por título..."
          className="pl-8 h-9"
        />
      </div>

      <Select value={priorityFilter} onValueChange={(v) => onPriorityChange(v as typeof priorityFilter)}>
        <SelectTrigger className="w-[150px] h-9">
          <SelectValue placeholder="Prioridade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Todas prioridades</SelectItem>
          <SelectItem value="LOW">Baixa</SelectItem>
          <SelectItem value="MEDIUM">Média</SelectItem>
          <SelectItem value="HIGH">Alta</SelectItem>
          <SelectItem value="CRITICAL">Crítica</SelectItem>
        </SelectContent>
      </Select>

      <Select value={assigneeFilter} onValueChange={onAssigneeChange}>
        <SelectTrigger className="w-[180px] h-9">
          <SelectValue placeholder="Responsável" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Todos responsáveis</SelectItem>
          {members.map((m) => (
            <SelectItem key={m.user.id} value={m.user.id}>
              {m.user.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActive && (
        <Button variant="ghost" size="sm" onClick={onClear} className="h-9 text-muted-foreground">
          <X className="h-3.5 w-3.5 mr-1" />
          Limpar
        </Button>
      )}
    </div>
  )
}
