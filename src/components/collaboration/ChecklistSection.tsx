"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  createChecklistItemAction,
  toggleChecklistItemAction,
  deleteChecklistItemAction,
} from "@/server/actions/checklists"

interface ChecklistItem {
  id: string
  text: string
  isDone: boolean
  position: number
  completedAt: Date | null
  completedById: string | null
}

interface Props {
  cardId: string
  initialItems: ChecklistItem[]
}

export function ChecklistSection({ cardId, initialItems }: Props) {
  const [items, setItems] = useState<ChecklistItem[]>(
    [...initialItems].sort((a, b) => a.position - b.position)
  )
  const [newText, setNewText] = useState("")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const doneCount = items.filter((i) => i.isDone).length
  const total = items.length
  const percent = total > 0 ? Math.round((doneCount / total) * 100) : 0

  function handleToggle(item: ChecklistItem) {
    // Optimistic update
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
        // Revert on failure
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? item : i))
        )
        setErrorMsg(result.error)
      }
    })
  }

  function handleDelete(itemId: string) {
    setErrorMsg(null)
    // Optimistic remove
    const removed = items.find((i) => i.id === itemId)
    setItems((prev) => prev.filter((i) => i.id !== itemId))

    startTransition(async () => {
      const result = await deleteChecklistItemAction(itemId)
      if (!result.success) {
        // Revert
        if (removed) {
          setItems((prev) => [...prev, removed].sort((a, b) => a.position - b.position))
        }
        setErrorMsg(result.error)
      }
    })
  }

  function handleAddItem() {
    if (!newText.trim()) return
    setErrorMsg(null)

    const formData = new FormData()
    formData.set("text", newText)

    startTransition(async () => {
      const result = await createChecklistItemAction(cardId, formData)
      if (!result.success) {
        setErrorMsg(result.error)
        return
      }
      const newItem: ChecklistItem = {
        id: result.data?.id ?? crypto.randomUUID(),
        text: newText,
        isDone: false,
        position: items.length,
        completedAt: null,
        completedById: null,
      }
      setItems((prev) => [...prev, newItem])
      setNewText("")
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddItem()
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Checklist</h3>
        {total > 0 && (
          <span className="text-xs text-muted-foreground">
            {doneCount} / {total} ({percent}%)
          </span>
        )}
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}

      {/* Items */}
      {items.length > 0 && (
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2 group">
              <input
                type="checkbox"
                checked={item.isDone}
                onChange={() => handleToggle(item)}
                className="h-4 w-4 rounded border-gray-300 cursor-pointer flex-shrink-0"
                disabled={isPending}
              />
              <span
                className={`flex-1 text-sm ${
                  item.isDone ? "line-through text-muted-foreground" : ""
                }`}
              >
                {item.text}
              </span>
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity text-xs px-1"
                disabled={isPending}
                aria-label="Remover item"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}

      {/* Add item */}
      <div className="flex gap-2">
        <Input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Adicionar item..."
          className="text-sm h-8"
          disabled={isPending}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={handleAddItem}
          disabled={isPending || !newText.trim()}
          className="h-8 flex-shrink-0"
        >
          Adicionar
        </Button>
      </div>
    </div>
  )
}
