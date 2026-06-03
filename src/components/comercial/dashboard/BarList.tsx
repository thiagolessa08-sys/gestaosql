interface Item {
  label: string
  valor: number
  sub?: string
}

interface Props {
  items: Item[]
  emptyText?: string
}

export function BarList({ items, emptyText = "Sem dados." }: Props) {
  const max = Math.max(1, ...items.map((i) => i.valor))
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>
  }
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i}>
          <div className="flex items-center justify-between text-xs mb-0.5">
            <span className="truncate text-foreground">{item.label}</span>
            <span className="text-muted-foreground shrink-0 ml-2">{item.sub}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-[#1e40af]"
              style={{ width: `${Math.max(2, (item.valor / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
