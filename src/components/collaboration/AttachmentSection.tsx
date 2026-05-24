"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"

interface Uploader {
  name: string | null
}

interface Attachment {
  id: string
  filename: string
  size: number
  mimeType: string
  uploadedAt: Date
  uploader: Uploader | null
}

interface Props {
  cardId: string
  initialAttachments: Attachment[]
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return (bytes / 1024 / 1024).toFixed(1) + " MB"
  }
  return Math.round(bytes / 1024) + " KB"
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date))
}

export function AttachmentSection({ cardId, initialAttachments }: Props) {
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    const formData = new FormData()
    formData.set("file", file)
    formData.set("cardId", cardId)

    try {
      const res = await fetch("/api/attachments/upload", {
        method: "POST",
        body: formData,
      })

      const json = await res.json() as { id?: string; filename?: string; error?: string }

      if (!res.ok || !json.id) {
        setError(json.error ?? "Erro ao fazer upload.")
        return
      }

      const newAttachment: Attachment = {
        id: json.id,
        filename: json.filename ?? file.name,
        size: file.size,
        mimeType: file.type || "application/octet-stream",
        uploadedAt: new Date(),
        uploader: null,
      }
      setAttachments((prev) => [newAttachment, ...prev])
    } catch {
      setError("Falha na conexão ao fazer upload.")
    } finally {
      setUploading(false)
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function handleDelete(attachmentId: string) {
    if (!confirm("Excluir este anexo?")) return
    setError(null)

    try {
      const res = await fetch(`/api/attachments/${attachmentId}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        setError(json.error ?? "Erro ao excluir anexo.")
        return
      }
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId))
    } catch {
      setError("Falha na conexão ao excluir anexo.")
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Anexos ({attachments.length})</h3>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Enviando..." : "Anexar arquivo"}
          </Button>
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum anexo ainda.</p>
      ) : (
        <ul className="space-y-2">
          {attachments.map((att) => (
            <li key={att.id} className="flex items-center justify-between gap-2 group py-1">
              <div className="flex-1 min-w-0">
                <a
                  href={`/api/attachments/${att.id}`}
                  download={att.filename}
                  className="text-sm font-medium hover:underline truncate block"
                >
                  {att.filename}
                </a>
                <p className="text-xs text-muted-foreground">
                  {formatSize(att.size)}
                  {att.uploader?.name && ` · ${att.uploader.name}`}
                  {" · "}
                  {formatDate(att.uploadedAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(att.id)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity text-xs px-1 flex-shrink-0"
                aria-label="Excluir anexo"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
