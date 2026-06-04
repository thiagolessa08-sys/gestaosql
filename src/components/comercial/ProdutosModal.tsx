"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Trash2, Package } from "lucide-react"
import { criarProdutoAction, deletarProdutoAction } from "@/server/actions/produtos"

interface Produto { id: string; nome: string }

interface Props {
  produtos: Produto[]
  open: boolean
  onClose: () => void
}

export function ProdutosModal({ produtos: initial, open, onClose }: Props) {
  const router = useRouter()
  const [produtos, setProdutos] = useState<Produto[]>(initial)
  const [novo, setNovo] = useState("")
  const [erro, setErro] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [confirmId, setConfirmId] = useState<string | null>(null)

  function handleAdd() {
    const n = novo.trim()
    if (!n) return
    setErro(null)
    startTransition(async () => {
      const r = await criarProdutoAction(n)
      if (!r.success) { setErro(r.error); return }
      setProdutos(prev => [...prev, r.data].sort((a, b) => a.nome.localeCompare(b.nome)))
      setNovo("")
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    if (confirmId !== id) { setConfirmId(id); return }
    startTransition(async () => {
      const r = await deletarProdutoAction(id)
      if (!r.success) { setErro(r.error); return }
      setProdutos(prev => prev.filter(p => p.id !== id))
      setConfirmId(null)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Produtos / Serviços
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Adicionar */}
          <div className="flex gap-2">
            <Input
              value={novo}
              onChange={e => setNovo(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAdd() } }}
              placeholder="Nome do produto..."
              disabled={isPending}
            />
            <Button size="icon" onClick={handleAdd} disabled={isPending || !novo.trim()}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {erro && <p className="text-sm text-destructive">{erro}</p>}

          {/* Lista */}
          {produtos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum produto cadastrado.</p>
          ) : (
            <div className="space-y-1.5">
              {produtos.map(p => (
                <div key={p.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border bg-card">
                  <span className="text-sm truncate">{p.nome}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-7 shrink-0 ${confirmId === p.id ? "text-destructive" : "text-muted-foreground"}`}
                    onClick={() => handleDelete(p.id)}
                    disabled={isPending}
                  >
                    {confirmId === p.id ? "Confirmar" : <Trash2 className="w-4 h-4" />}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
