"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { criarTagComercialAction } from "@/server/actions/tagsComercial"

interface Tag {
  id: string
  nome: string
  cor: string
}

interface Props {
  allTags: Tag[]
  selectedTagIds: string[]
  onChange: (tagIds: string[]) => void
}

const TAG_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"]

export function ComercialTagPicker({ allTags, selectedTagIds, onChange }: Props) {
  const [tags, setTags] = useState<Tag[]>(allTags)
  const [creating, setCreating] = useState(false)
  const [newTagName, setNewTagName] = useState("")
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleTag(tagId: string) {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId))
    } else {
      onChange([...selectedTagIds, tagId])
    }
  }

  async function handleCreate() {
    const nome = newTagName.trim()
    if (!nome) return
    setLoading(true)
    setError(null)
    const result = await criarTagComercialAction(nome, selectedColor)
    setLoading(false)
    if (!result.success) { setError(result.error); return }
    const nova = result.data
    setTags((prev) => [...prev, nova].sort((a, b) => a.nome.localeCompare(b.nome)))
    onChange([...selectedTagIds, nova.id])
    setNewTagName("")
    setCreating(false)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {tags.length === 0 && !creating && (
          <span className="text-xs text-muted-foreground">Nenhuma tag ainda.</span>
        )}
        {tags.map((tag) => {
          const selected = selectedTagIds.includes(tag.id)
          return (
            <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)} className="focus:outline-none">
              <Badge
                variant={selected ? "default" : "outline"}
                style={{
                  borderColor: tag.cor,
                  color: selected ? "#fff" : tag.cor,
                  backgroundColor: selected ? tag.cor : "transparent",
                }}
              >
                {tag.nome}
              </Badge>
            </button>
          )
        })}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {creating ? (
        <div className="flex gap-1 items-center flex-wrap">
          <Input
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="Nome da tag"
            className="h-7 text-xs w-32"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreate() } }}
          />
          <div className="flex gap-1">
            {TAG_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                className="w-4 h-4 rounded-full border-2 transition-transform"
                style={{
                  backgroundColor: color,
                  borderColor: selectedColor === color ? "#000" : "transparent",
                  transform: selectedColor === color ? "scale(1.2)" : "scale(1)",
                }}
              />
            ))}
          </div>
          <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={handleCreate} disabled={loading}>
            {loading ? "..." : "Criar"}
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setCreating(false)}>
            Cancelar
          </Button>
        </div>
      ) : (
        <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setCreating(true)}>
          + Nova tag
        </Button>
      )}
    </div>
  )
}
