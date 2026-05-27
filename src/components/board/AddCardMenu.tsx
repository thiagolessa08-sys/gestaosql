"use client"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Plus, ChevronDown, ArrowDownToLine } from "lucide-react"

interface Props {
  onCreateNew: () => void
  onImport: () => void
  canImport: boolean
}

export function AddCardMenu({ onCreateNew, onImport, canImport }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground text-xs h-7 mt-1"
        >
          <Plus className="h-3 w-3 mr-1" />
          Adicionar card
          <ChevronDown className="h-3 w-3 ml-auto" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[220px]">
        <DropdownMenuItem onClick={onCreateNew}>
          <Plus className="h-3.5 w-3.5 mr-2" />
          Criar novo card
        </DropdownMenuItem>
        {canImport && (
          <DropdownMenuItem onClick={onImport}>
            <ArrowDownToLine className="h-3.5 w-3.5 mr-2" />
            Importar do backlog do projeto
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
