import { Badge } from "@/components/ui/badge"

const PRIORITY_CONFIG = {
  LOW: { label: "Baixa", className: "bg-slate-100 text-slate-700 hover:bg-slate-100" },
  MEDIUM: { label: "Média", className: "bg-blue-100 text-blue-700 hover:bg-blue-100" },
  HIGH: { label: "Alta", className: "bg-orange-100 text-orange-700 hover:bg-orange-100" },
  CRITICAL: { label: "Crítica", className: "bg-red-100 text-red-700 hover:bg-red-100" },
}

interface Props {
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
}

export function PriorityBadge({ priority }: Props) {
  const config = PRIORITY_CONFIG[priority]
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  )
}
