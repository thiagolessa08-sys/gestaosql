"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { MarkdownEditor } from "./MarkdownEditor"
import { MarkdownRenderer } from "./MarkdownRenderer"
import {
  createCommentAction,
  updateCommentAction,
  deleteCommentAction,
} from "@/server/actions/comments"

interface CommentAuthor {
  id: string
  name: string | null
  avatarUrl: string | null
}

interface Comment {
  id: string
  body: string
  createdAt: Date
  authorId: string
  author: CommentAuthor
}

interface Props {
  cardId: string
  projectId: string
  currentUserId: string
  initialComments: Comment[]
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - new Date(date).getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" })
  if (diffDay > 0) return rtf.format(-diffDay, "day")
  if (diffHr > 0) return rtf.format(-diffHr, "hour")
  if (diffMin > 0) return rtf.format(-diffMin, "minute")
  return rtf.format(-diffSec, "second")
}

function AuthorAvatar({ author }: { author: CommentAuthor }) {
  const initials = author.name ? author.name.charAt(0).toUpperCase() : "?"
  if (author.avatarUrl) {
    return (
      <img
        src={author.avatarUrl}
        alt={author.name ?? "Avatar"}
        className="h-8 w-8 rounded-full object-cover flex-shrink-0"
      />
    )
  }
  return (
    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold flex-shrink-0">
      {initials}
    </div>
  )
}

export function CommentList({ cardId, currentUserId, initialComments }: Props) {
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [newBody, setNewBody] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editBody, setEditBody] = useState("")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleStartEdit(comment: Comment) {
    setEditingId(comment.id)
    setEditBody(comment.body)
  }

  function handleCancelEdit() {
    setEditingId(null)
    setEditBody("")
  }

  async function handleSubmitNew() {
    if (!newBody.trim()) return
    setErrorMsg(null)

    const formData = new FormData()
    formData.set("body", newBody)

    startTransition(async () => {
      const result = await createCommentAction(cardId, formData)
      if (!result.success) {
        setErrorMsg(result.error)
        return
      }
      // Optimistically append a placeholder comment
      const tempComment: Comment = {
        id: result.data?.id ?? crypto.randomUUID(),
        body: newBody,
        createdAt: new Date(),
        authorId: currentUserId,
        author: { id: currentUserId, name: "Você", avatarUrl: null },
      }
      setComments((prev) => [...prev, tempComment])
      setNewBody("")
    })
  }

  async function handleSaveEdit(commentId: string) {
    if (!editBody.trim()) return
    setErrorMsg(null)

    const formData = new FormData()
    formData.set("body", editBody)

    startTransition(async () => {
      const result = await updateCommentAction(commentId, formData)
      if (!result.success) {
        setErrorMsg(result.error)
        return
      }
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, body: editBody } : c))
      )
      setEditingId(null)
      setEditBody("")
    })
  }

  async function handleDelete(commentId: string) {
    if (!confirm("Excluir este comentário?")) return
    setErrorMsg(null)

    startTransition(async () => {
      const result = await deleteCommentAction(commentId)
      if (!result.success) {
        setErrorMsg(result.error)
        return
      }
      setComments((prev) => prev.filter((c) => c.id !== commentId))
    })
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Comentários ({comments.length})</h3>

      {comments.length > 0 && (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <AuthorAvatar author={comment.author} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">{comment.author.name ?? "Usuário"}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(comment.createdAt)}
                  </span>
                </div>

                {editingId === comment.id ? (
                  <div className="space-y-2">
                    <MarkdownEditor
                      value={editBody}
                      onChange={setEditBody}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSaveEdit(comment.id)}
                        disabled={isPending || !editBody.trim()}
                      >
                        Salvar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                        disabled={isPending}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <MarkdownRenderer content={comment.body} />
                    <div className="flex gap-2 mt-1">
                      {comment.authorId === currentUserId && (
                        <button
                          type="button"
                          onClick={() => handleStartEdit(comment)}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Editar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(comment.id)}
                        className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Separator />

      {/* New comment */}
      <div className="space-y-2">
        <MarkdownEditor
          value={newBody}
          onChange={setNewBody}
          placeholder="Escreva um comentário..."
          rows={3}
        />
        {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}
        <Button
          size="sm"
          onClick={handleSubmitNew}
          disabled={isPending || !newBody.trim()}
        >
          {isPending ? "Enviando..." : "Comentar"}
        </Button>
      </div>
    </div>
  )
}
