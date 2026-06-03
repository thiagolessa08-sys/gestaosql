"use client"

import { useState, useRef, useEffect, useTransition } from "react"
import { Send, Trash2, Bot, User, Loader2, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import ReactMarkdown from "react-markdown"

interface Message {
  role: "user" | "assistant"
  content: string
  toolCalls?: string[]
}

const SUGGESTIONS = [
  "Qual o valor total do pipeline comercial?",
  "Quais oportunidades estão em Prospect B?",
  "Mostre os projetos ativos e suas sprints",
  "Quais cards estão em andamento?",
  "Resumo geral do sistema",
  "Quantos usuários temos por perfil?",
]

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [toolCalls, setToolCalls] = useState<string[]>([])
  const [, startTransition] = useTransition()
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isStreaming])

  async function sendMessage(text: string) {
    if (!text.trim() || isStreaming) return

    const userMessage: Message = { role: "user", content: text }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput("")
    setIsStreaming(true)
    setToolCalls([])

    // Placeholder for assistant response
    const assistantPlaceholder: Message = { role: "assistant", content: "" }
    setMessages([...newMessages, assistantPlaceholder])

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok) throw new Error("Erro na API")

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ""
      const currentToolCalls: string[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split("\n")

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const data = line.slice(6)
          if (data === "[DONE]") break

          try {
            const parsed = JSON.parse(data) as { type: string; text?: string; name?: string; message?: string }

            if (parsed.type === "text" && parsed.text) {
              assistantContent += parsed.text
              startTransition(() => {
                setMessages(prev => {
                  const updated = [...prev]
                  updated[updated.length - 1] = { role: "assistant", content: assistantContent, toolCalls: currentToolCalls }
                  return updated
                })
              })
            }

            if (parsed.type === "tool_call" && parsed.name) {
              currentToolCalls.push(parsed.name)
              setToolCalls([...currentToolCalls])
            }

            if (parsed.type === "error") {
              assistantContent = `❌ Erro: ${parsed.message}`
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = { role: "assistant", content: assistantContent }
                return updated
              })
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: "assistant", content: `❌ Erro: ${err instanceof Error ? err.message : "Erro desconhecido"}` }
        return updated
      })
    } finally {
      setIsStreaming(false)
      setToolCalls([])
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-48px)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-[#1b2a6b]" />
          <h1 className="text-lg font-semibold">Chat IA</h1>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Claude Sonnet 4.6</span>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setMessages([])} disabled={isStreaming}>
            <Trash2 className="w-4 h-4 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-6">
            <div className="text-center">
              <Bot className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">Olá! Como posso ajudar?</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Faça perguntas sobre projetos, comercial ou dados do sistema.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 max-w-xl w-full">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  className="text-left text-sm px-3 py-2.5 rounded-lg border border-border hover:bg-accent transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-[#1b2a6b] flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-[#1b2a6b] text-white rounded-br-sm"
                  : "bg-muted rounded-bl-sm"
              }`}>
                {msg.role === "assistant" && msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {msg.toolCalls.map((t, ti) => (
                      <span key={ti} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-background/60 text-muted-foreground">
                        <Wrench className="w-2.5 h-2.5" />
                        {t.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                )}
                {msg.role === "assistant" ? (
                  msg.content ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-li:my-0.5">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {toolCalls.length > 0
                        ? `Consultando: ${toolCalls[toolCalls.length - 1].replace(/_/g, " ")}...`
                        : "Pensando..."}
                    </span>
                  )
                ) : (
                  <span>{msg.content}</span>
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t shrink-0">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <Input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Faça uma pergunta sobre os dados..."
            disabled={isStreaming}
            className="flex-1"
            autoFocus
          />
          <Button onClick={() => sendMessage(input)} disabled={isStreaming || !input.trim()} size="icon">
            {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-center text-[11px] text-muted-foreground/50 mt-2">
          Enter para enviar · O Claude pode consultar o banco de dados em tempo real
        </p>
      </div>
    </div>
  )
}
