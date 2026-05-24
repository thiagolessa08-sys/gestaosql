"use client"

import { useRouter, useSearchParams } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Props {
  members: Array<{ userId: string; user: { name: string } }>
  currentEntityType?: string
  currentActorId?: string
  projectSlug: string
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  card: "Card",
  sprint: "Sprint",
  member: "Membro",
}

export function AuditFilters({
  members,
  currentEntityType,
  currentActorId,
  projectSlug,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === "__all__") {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    router.push(`/projetos/${projectSlug}/atividade?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Tipo:</span>
        <Select
          value={currentEntityType ?? "__all__"}
          onValueChange={(val) => updateParam("entityType", val)}
        >
          <SelectTrigger className="w-36 h-8 text-sm">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos</SelectItem>
            {Object.entries(ENTITY_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Responsável:</span>
        <Select
          value={currentActorId ?? "__all__"}
          onValueChange={(val) => updateParam("actorId", val)}
        >
          <SelectTrigger className="w-44 h-8 text-sm">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.userId} value={m.userId}>
                {m.user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
