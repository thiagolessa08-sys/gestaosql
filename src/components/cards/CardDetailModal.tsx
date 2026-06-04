"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserPicker } from "@/components/shared/UserPicker"
import { TagPicker } from "@/components/shared/TagPicker"
import { updateCardAction, archiveCardAction, getCardCommentsAction, getCardChecklistAction, getCardAttachmentsAction } from "@/server/actions/cards"
import { CommentList } from "@/components/collaboration/CommentList"
import { ChecklistSection } from "@/components/collaboration/ChecklistSection"
import { AttachmentSection } from "@/components/collaboration/AttachmentSection"

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
  dataInicio: Date | null
  dueDate: Date | null
  assigneeId: string | null
  tags: { tag: Tag }[]
  mainActivityId?: string | null
}

type CommentItem = {
  id: string
  body: string
  createdAt: Date
  authorId: string
  author: { id: string; name: string | null; avatarUrl: string | null }
}

type ChecklistItem = {
  id: string
  text: string
  isDone: boolean
  position: number
  dataInicio: Date | null
  dataFim: Date | null
  completedAt: Date | null
  completedById: string | null
}

type AttachmentItem = {
  id: string
  filename: string
  size: number
  mimeType: string
  uploadedAt: Date
  uploader: { name: string | null } | null
}

interface Props {
  card: Card
  members: Member[]
  allTags: Tag[]
  activities: { id: string; name: string; color: string }[]
  sprintName?: string
  open: boolean
  onClose: () => void
  currentUserId: string
}

const STATUS_CONFIG: Record<string, { label: string; dot: string }> = {
  BACKLOG: { label: "Backlog", dot: "bg-muted-foreground" },
  DOING: { label: "Em andamento", dot: "bg-orange-500" },
  VALIDATION: { label: "Validação", dot: "bg-blue-500" },
  DONE: { label: "Concluído", dot: "bg-emerald-500" },
}

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  CRITICAL: "Crítica",
}

export function CardDetailModal({ card, members, allTags, activities, sprintName, open, onClose, currentUserId }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description ?? "")
  const [priority, setPriority] = useState<string>(card.priority)
  const [assigneeId, setAssigneeId] = useState<string>(card.assigneeId ?? "none")
  const [storyPoints, setStoryPoints] = useState<string>(card.storyPoints?.toString() ?? "")
  const [dataInicio, setDataInicio] = useState<string>(
    card.dataInicio ? new Date(card.dataInicio).toISOString().split("T")[0] : ""
  )
  const [dueDate, setDueDate] = useState<string>(
    card.dueDate ? new Date(card.dueDate).toISOString().split("T")[0] : ""
  )
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(card.tags.map((ct) => ct.tag.id))
  const [mainActivityId, setMainActivityId] = useState<string>(card.mainActivityId ?? "none")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [comments, setComments] = useState<CommentItem[]>([])
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])
  const [attachments, setAttachments] = useState<AttachmentItem[]>([])
  const [loadingCollab, setLoadingCollab] = useState(false)
  const [collabError, setCollabError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoadingCollab(true)

    Promise.all([
      getCardCommentsAction(card.id),
      getCardChecklistAction(card.id),
      getCardAttachmentsAction(card.id),
    ]).then(([commentsRes, checklistRes, attachmentsRes]) => {
      if (cancelled) return
      if (commentsRes.success && commentsRes.data) {
        setComments(
          commentsRes.data.map((c) => ({
            id: c.id,
            body: c.body,
            createdAt: c.createdAt,
            authorId: c.authorId,
            author: { id: c.author.id, name: c.author.name ?? null, avatarUrl: c.author.avatarUrl ?? null },
          }))
        )
      }
      if (checklistRes.success && checklistRes.data) {
        setChecklistItems(
          checklistRes.data.map((i) => ({
            id: i.id,
            text: i.text,
            isDone: i.isDone,
            position: i.position,
            dataInicio: i.dataInicio ?? null,
            dataFim: i.dataFim ?? null,
            completedAt: i.completedAt ?? null,
            completedById: i.completedById ?? null,
          }))
        )
      }
      if (attachmentsRes.success && attachmentsRes.data) {
        setAttachments(
          attachmentsRes.data.map((a) => ({
            id: a.id,
            filename: a.filename,
            size: a.sizeBytes,
            mimeType: a.mimeType,
            uploadedAt: a.uploadedAt,
            uploader: a.uploadedBy ? { name: a.uploadedBy.name ?? null } : null,
          }))
        )
      }
      setLoadingCollab(false)
    }).catch(() => {
      if (!cancelled) {
        setLoadingCollab(false)
        setCollabError("Não foi possível carregar os dados de colaboração.")
      }
    })

    return () => { cancelled = true }
  }, [open, card.id])

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
    if (dataInicio) formData.set("dataInicio", dataInicio)
    else formData.set("dataInicio", "")
    if (dueDate) formData.set("dueDate", dueDate)
    else formData.set("dueDate", "")
    formData.set("tagIds", JSON.stringify(selectedTagIds))
    formData.set("mainActivityId", mainActivityId !== "none" ? mainActivityId : "")

    const result = await updateCardAction(card.id, formData)
    setSaving(false)
    if (!result.success) { setError(result.error); return }
    router.refresh()
    onClose()
  }

  async function handleArchive() {
    if (!confirm("Arquivar este card?")) return
    const result = await archiveCardAction(card.id)
    if (!result.success) { setError(result.error); return }
    router.refresh()
    onClose()
  }

  const statusCfg = STATUS_CONFIG[card.status] ?? { label: card.status, dot: "bg-muted-foreground" }

  // Find current tag for display
  const firstTag = selectedTagIds.length > 0
    ? allTags.find((t) => t.id === selectedTagIds[0])
    : null

  // Find current activity
  const currentActivity = activities.find((a) => a.id === mainActivityId) ?? null

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        {/* Visually hidden title for accessibility */}
        <DialogTitle className="sr-only">Detalhes do card</DialogTitle>

        {/* Header bar */}
        <div className="flex items-center gap-2 px-6 py-3 border-b shrink-0 pr-12">
          <span className="text-xs text-muted-foreground font-mono">
            {card.id.slice(-6).toUpperCase()}
          </span>
          {currentActivity && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span
                  className="h-2 w-2 rounded-full inline-block flex-shrink-0"
                  style={{ backgroundColor: currentActivity.color }}
                />
                {currentActivity.name}
              </span>
            </>
          )}
        </div>

        {/* Two-panel body */}
        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* ── Left panel ── */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* Editable title */}
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xl font-semibold border-none shadow-none p-0 h-auto focus-visible:ring-0 bg-transparent"
              placeholder="Título do card"
            />

            {/* Description */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Descrição
              </p>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                maxLength={5000}
                placeholder="Adicione uma descrição..."
                className="resize-none text-sm"
              />
            </div>

            {/* Datas */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Data Início
                </p>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Data Fim
                </p>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            {/* Subtasks / Checklist */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Subtarefas
              </p>
              {loadingCollab ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : (
                <ChecklistSection cardId={card.id} initialItems={checklistItems} />
              )}
            </div>

            {/* Comments */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Comentários
              </p>
              {collabError && <p className="text-xs text-destructive mb-2">{collabError}</p>}
              {!loadingCollab && (
                <CommentList
                  cardId={card.id}
                  currentUserId={currentUserId}
                  initialComments={comments}
                />
              )}
            </div>
          </div>

          {/* ── Right sidebar ── */}
          <div className="w-[220px] shrink-0 border-l overflow-y-auto px-4 py-5 space-y-4 bg-muted/20">

            {/* STATUS */}
            <div>
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </Label>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className={`h-2 w-2 rounded-full flex-shrink-0 ${statusCfg.dot}`} />
                <span className="text-sm">{statusCfg.label}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Mova no board para alterar
              </p>
            </div>

            {/* RESPONSÁVEL */}
            <div>
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Responsável
              </Label>
              <div className="mt-1.5">
                <UserPicker members={members} value={assigneeId} onChange={setAssigneeId} />
              </div>
            </div>

            {/* PRIORIDADE */}
            <div>
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Prioridade
              </Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="mt-1.5 h-8 text-sm">
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

            {/* SPRINT */}
            {sprintName && (
              <div>
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Sprint
                </Label>
                <p className="text-sm mt-1.5">{sprintName}</p>
              </div>
            )}

            {/* TAG */}
            <div>
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Tags
              </Label>
              <div className="mt-1.5">
                <TagPicker
                  projectId={card.projectId}
                  allTags={allTags}
                  selectedTagIds={selectedTagIds}
                  onChange={setSelectedTagIds}
                />
              </div>
            </div>

            {/* ATIVIDADE PRINCIPAL */}
            {activities.length > 0 && (
              <div>
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Atividade
                </Label>
                <Select value={mainActivityId} onValueChange={setMainActivityId}>
                  <SelectTrigger className="mt-1.5 h-8 text-sm">
                    <SelectValue placeholder="Nenhuma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {activities.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full inline-block flex-shrink-0"
                            style={{ backgroundColor: a.color }}
                          />
                          {a.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* STORY POINTS */}
            <div>
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Story points
              </Label>
              <Input
                type="number"
                value={storyPoints}
                onChange={(e) => setStoryPoints(e.target.value)}
                min={0}
                max={100}
                placeholder="—"
                className="mt-1.5 h-8 text-sm"
              />
            </div>

            {/* ANEXOS */}
            {!loadingCollab && (
              <div>
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Anexos
                </Label>
                <div className="mt-1.5">
                  <AttachmentSection cardId={card.id} initialAttachments={attachments} />
                </div>
              </div>
            )}

            {/* Error */}
            {error && <p className="text-xs text-destructive">{error}</p>}

            {/* Actions */}
            <div className="space-y-2 pt-2 border-t">
              <Button size="sm" className="w-full" onClick={handleSave} disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                onClick={handleArchive}
              >
                Arquivar card
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
