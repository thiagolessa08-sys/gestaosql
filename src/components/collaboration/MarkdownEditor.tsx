"use client"

import { useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { MarkdownRenderer } from "./MarkdownRenderer"

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
}

type Tab = "write" | "preview"

export function MarkdownEditor({ value, onChange, placeholder, rows = 4 }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("write")

  return (
    <div className="border rounded-md overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b bg-muted/40">
        <button
          type="button"
          onClick={() => setActiveTab("write")}
          className={`px-3 py-1.5 text-sm font-medium transition-colors ${
            activeTab === "write"
              ? "bg-background text-foreground border-b-2 border-primary -mb-px"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Escrever
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("preview")}
          className={`px-3 py-1.5 text-sm font-medium transition-colors ${
            activeTab === "preview"
              ? "bg-background text-foreground border-b-2 border-primary -mb-px"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Visualizar
        </button>
      </div>

      {/* Content */}
      <div className="p-2">
        {activeTab === "write" ? (
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className="border-none shadow-none resize-none focus-visible:ring-0 p-0"
          />
        ) : (
          <div className="min-h-[6rem] py-1 px-1">
            {value.trim() ? (
              <MarkdownRenderer content={value} />
            ) : (
              <p className="text-sm text-muted-foreground italic">Nada para visualizar.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
