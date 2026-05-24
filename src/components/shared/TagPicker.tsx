"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createTagAction } from "@/server/actions/cards"

interface Tag {
  id: string
  name: string
  color: string
}

interface Props {
  projectId: string
  allTags: Tag[]
  selectedTagIds: string[]
  onChange: (tagIds: string[]) => void
}

const TAG_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"]

export function TagPicker({ projectId, allTags, selectedTagIds, onChange }: Props) {
  const [tags, setTags] = useState<Tag[]>(allTags)
  const [creating, setCreating] = useState(false)
  const [newTagName, setNewTagName] = useState("")
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0])
  const [createLoading, setCreateLoading] = useState(false)

  function toggleTag(tagId: string) {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId))
    } else {
      onChange([...selectedTagIds, tagId])
    }
  }

  async function handleCreateTag() {
    if (!newTagName.trim()) return
    setCreateLoading(true)
    const formData = new FormData()
    formData.set("name", newTagName.trim())
    formData.set("color", selectedColor)
    const result = await createTagAction(projectId, formData)
    setCreateLoading(false)
    if (result.success && result.data) {
      const newTag = result.data
      setTags((prev) => [...prev, newTag])
      onChange([...selectedTagIds, newTag.id])
      setNewTagName("")
      setCreating(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => (
          <button
            key={tag.id}
            type="button"
            onClick={() => toggleTag(tag.id)}
            className="focus:outline-none"
          >
            <Badge
              variant={selectedTagIds.includes(tag.id) ? "default" : "outline"}
              style={{
                borderColor: tag.color,
                color: selectedTagIds.includes(tag.id) ? "#fff" : tag.color,
                backgroundColor: selectedTagIds.includes(tag.id) ? tag.color : "transparent",
              }}
            >
              {tag.name}
            </Badge>
          </button>
        ))}
      </div>

      {creating ? (
        <div className="flex gap-1 items-center flex-wrap">
          <Input
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="Nome da tag"
            className="h-7 text-xs w-32"
            onKeyDown={(e) => e.key === "Enter" && handleCreateTag()}
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
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleCreateTag} disabled={createLoading}>
            {createLoading ? "..." : "Criar"}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setCreating(false)}>
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
