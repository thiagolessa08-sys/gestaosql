"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  createChecklistItemAction,
  toggleChecklistItemAction,
  deleteChecklistItemAction,
  updateChecklistItemDatasAction,
} from "@/server/actions/checklists"
import { Calendar } from "lucide-react"

interface ChecklistItem {
  id: string
  text: string
  isDone: boolean
  position: number
  dataInicio: Date | null
  dataFim: Date | null
  completedAt: Date | null
  completedById: string | null
}

interface Props {
  cardId: string
  initialItems: ChecklistItem[]
}

function fmtDate(d: Date | null): string {
  if (!d) return ""
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })
}

function toInputVal(d: Date | null): string {
  if (!d) return ""
  return new Date(d).toISOString().split("T")[0]
}

export function ChecklistSection({ cardId, initialItems }: Props) {
  const [items, setItems] = useState<ChecklistItem[]>(
    [...initialItems].sort((a, b) => a.position - b.position)
  )
  const [newText, setNewText] = useState("")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [editingDatesId, setEditingDatesId] = useState<string | null>(null)

  const doneCount = items.filter((i) => i.isDone).length
  const total = items.length
  const percent = total > 0 ? Math.round((doneCount / total) * 100) : 0

  function handleToggle(item: ChecklistItem) {
    const newIsDone = !item.isDone
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? { ...i, isDone: newIsDone, completedAt: newIsDone ? new Date() : null }
          : i
      )
    )
    startTransition(async () => {
      const result = await toggleChecklistItemAction(item.id)
      if (!result.success) {
        setItems((prev) => prev.map((i) => (i.id === item.id ? item : i)))
        setErrorMsg(result.error)
      }
    })
  }

  function handleDelete(itemId: string) {
    setErrorMsg(null)
    const removed = items.find((i) => i.id === itemId)
    setItems((prev) => prev.filter((i) => i.id !== itemId))
    startTransition(async () => {
      const result = await deleteChecklistItemAction(itemId)
      if (!result.success) {
        if (removed) setItems((prev) => [...prev, removed].sort((a, b) => a.position - b.position))
        setErrorMsg(result.error)
      }
    })
  }

  function handleSaveDatas(itemId: string, dataInicio: string, dataFim: string) {
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? {
              ...i,
              dataInicio: dataInicio ? new Date(dataInicio) : null,
              dataFim: dataFim ? new Date(dataFim) : null,
            }
          : i
      )
    )
    setEditingDatesId(null)
    startTransition(async () => {
      await updateChecklistItemDatasAction(itemId, dataInicio || null, dataFim || null)
    })
  }

  function handleAddItem() {
    if (!newText.trim()) return
    setErrorMsg(null)
    const formData = new FormData()
    formData.set("text", newText)
    startTransition(async () => {
      const result = await createChecklistItemAction(cardId, formData)
      if (!result.success) { setErrorMsg(result.error); return }
      const newItem: ChecklistItem = {
        id: result.data?.id ?? crypto.randomUUID(),
        text: newText,
        isDone: false,
        position: items.length,
        dataInicio: null,
        dataFim: null,
        completedAt: null,
        completedById: null,
      }
      setItems((prev) => [...prev, newItem])
      setNewText("")
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Subitens</h3>
        {total > 0 && (
          <span className="text-xs text-muted-foreground">{doneCount} / {total} ({percent}%)</span>
        )}
      </div>

      {total > 0 && (
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${percent}%` }} />
        </div>
      )}

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="group">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={item.isDone}
                  onChange={() => handleToggle(item)}
                  className="h-4 w-4 rounded border-gray-300 cursor-pointer flex-shrink-0"
                  disabled={isPending}
                />
                <span className={`flex-1 text-sm ${item.isDone ? "line-through text-muted-foreground" : ""}`}>
                  {item.text}
                </span>
                {/* Botão de datas */}
                <button
                  type="button"
                  onClick={() => setEditingDatesId(editingDatesId === item.id ? null : item.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
                  title="Definir datas"
                >
                  <Calendar className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity text-xs px-1"
                  disabled={isPending}
                  aria-label="Remover item"
                >
                  ✕
                </button>
              </div>

              {/* Linha de datas */}
              {(item.dataInicio || item.dataFim) && editingDatesId !== item.id && (
                <div className="ml-6 mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                  {item.dataInicio && <span>Início: {fmtDate(item.dataInicio)}</span>}
                  {item.dataFim && <span>Fim: {fmtDate(item.dataFim)}</span>}
                </div>
              )}

              {/* Editor de datas inline */}
              {editingDatesId === item.id && (
                <DateEditor
                  item={item}
                  onSave={(ini, fim) => handleSaveDatas(item.id, ini, fim)}
                  onCancel={() => setEditingDatesId(null)}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}

      <div className="flex gap-2">
        <Input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddItem() } }}
          placeholder="Adicionar subitem..."
          className="text-sm h-8"
          disabled={isPending}
        />
        <Button size="sm" variant="outline" onClick={handleAddItem} disabled={isPending || !newText.trim()} className="h-8 flex-shrink-0">
          Adicionar
        </Button>
      </div>
    </div>
  )
}

function DateEditor({
  item,
  onSave,
  onCancel,
}: {
  item: ChecklistItem
  onSave: (dataInicio: string, dataFim: string) => void
  onCancel: () => void
}) {
  const [ini, setIni] = useState(toInputVal(item.dataInicio))
  const [fim, setFim] = useState(toInputVal(item.dataFim))

  return (
    <div className="ml-6 mt-1.5 flex items-center gap-2 flex-wrap">
      <label className="text-[11px] text-muted-foreground flex items-center gap-1">
        Início
        <input
          type="date"
          value={ini}
          onChange={(e) => setIni(e.target.value)}
          className="ml-1 h-6 text-xs rounded border border-input px-1.5 bg-background"
        />
      </label>
      <label className="text-[11px] text-muted-foreground flex items-center gap-1">
        Fim
        <input
          type="date"
          value={fim}
          onChange={(e) => setFim(e.target.value)}
          className="ml-1 h-6 text-xs rounded border border-input px-1.5 bg-background"
        />
      </label>
      <button onClick={() => onSave(ini, fim)} className="text-xs text-primary hover:underline">Salvar</button>
      <button onClick={onCancel} className="text-xs text-muted-foreground hover:underline">Cancelar</button>
    </div>
  )
}
