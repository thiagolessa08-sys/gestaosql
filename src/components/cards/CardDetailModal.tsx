"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { UserPicker } from "@/components/shared/UserPicker"
import { TagPicker } from "@/components/shared/TagPicker"
import { updateCardAction, archiveCardAction } from "@/server/actions/cards"

interface Tag {
  id: string
  name: string
  color: string
}

interface Member {
  id: string
  user: { id: string; name: string }
}

interface Card {
  id: string
  projectId: string
  title: string
  description: string | null
  status: string
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  storyPoints: number | null
  dueDate: Date | null
  assigneeId: string | null
  tags: { tag: Tag }[]
}

interface Props {
  card: Card
  members: Member[]
  allTags: Tag[]
  open: boolean
  onClose: () => void
}

const STATUS_LABELS: Record<string, string> = {
  BACKLOG: "Backlog",
  DOING: "Em andamento",
  VALIDATION: "Validação",
  DONE: "Concluído",
}

export function CardDetailModal({ card, members, allTags, open, onClose }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description ?? "")
  const [priority, setPriority] = useState<string>(card.priority)
  const [assigneeId, setAssigneeId] = useState<string>(card.assigneeId ?? "none")
  const [storyPoints, setStoryPoints] = useState<string>(card.storyPoints?.toString() ?? "")
  const [dueDate, setDueDate] = useState<string>(
    card.dueDate ? new Date(card.dueDate).toISOString().split("T")[0] : ""
  )
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(card.tags.map((ct) => ct.tag.id))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    const formData = new FormData()
    formData.set("title", title)
    if (description) formData.set("description", description)
    if (assigneeId !== "none") formData.set("assigneeId", assigneeId)
    else formData.set("assigneeId", "")
    formData.set("priority", priority)
    if (storyPoints) formData.set("storyPoints", storyPoints)
    if (dueDate) formData.set("dueDate", dueDate)
    formData.set("tagIds", JSON.stringify(selectedTagIds))

    const result = await updateCardAction(card.id, formData)
    setSaving(false)
    if (!result.success) {
      setError(result.error)
      return
    }
    router.refresh()
    onClose()
  }

  async function handleArchive() {
    if (!confirm("Arquivar este card?")) return
    const result = await archiveCardAction(card.id)
    if (!result.success) {
      setError(result.error)
      return
    }
    router.refresh()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-semibold border-none shadow-none p-0 h-auto focus-visible:ring-0"
              placeholder="Título do card"
            />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status (read-only, moved via board) */}
          <div className="flex items-center gap-2">
            <Badge variant="outline">{STATUS_LABELS[card.status] ?? card.status}</Badge>
            <span className="text-xs text-muted-foreground">Mova o card no board para alterar o status</span>
          </div>

          <Separator />

          {/* Description */}
          <div className="space-y-1">
            <Label>Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={5000}
              placeholder="Adicione uma descrição..."
            />
          </div>

          {/* Priority + Story Points */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Baixa</SelectItem>
                  <SelectItem value="MEDIUM">Média</SelectItem>
                  <SelectItem value="HIGH">Alta</SelectItem>
                  <SelectItem value="CRITICAL">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Story points</Label>
              <Input
                type="number"
                value={storyPoints}
                onChange={(e) => setStoryPoints(e.target.value)}
                min={0}
                max={100}
                placeholder="0"
              />
            </div>
          </div>

          {/* Assignee */}
          <div className="space-y-1">
            <Label>Responsável</Label>
            <UserPicker members={members} value={assigneeId} onChange={setAssigneeId} />
          </div>

          {/* Due date */}
          <div className="space-y-1">
            <Label>Prazo</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {/* Tags */}
          <div className="space-y-1">
            <Label>Tags</Label>
            <TagPicker
              projectId={card.projectId}
              allTags={allTags}
              selectedTagIds={selectedTagIds}
              onChange={setSelectedTagIds}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Separator />

          <div className="flex justify-between">
            <Button variant="destructive" size="sm" onClick={handleArchive}>
              Arquivar
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
