"use client"

import { useState } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { updateMemberRoleAction, removeMemberAction } from "@/server/actions/members"
import { useRouter } from "next/navigation"
import type { Role } from "@prisma/client"

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrador",
  SCRUM_MASTER: "Scrum Master",
  MEMBER: "Membro",
}

const ROLE_VARIANTS: Record<Role, "default" | "secondary" | "outline"> = {
  ADMIN: "default",
  SCRUM_MASTER: "secondary",
  MEMBER: "outline",
}

interface Member {
  id: string
  role: Role
  user: {
    id: string
    name: string
    email: string
    avatarUrl: string | null
  }
}

interface Props {
  members: Member[]
  projectId: string
  currentUserId: string
  canManage: boolean
}

export function MemberList({ members, projectId, currentUserId, canManage }: Props) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
  }

  async function handleRoleChange(memberId: string, newRole: Role) {
    setLoadingId(memberId)
    const formData = new FormData()
    formData.set("memberId", memberId)
    formData.set("role", newRole)
    await updateMemberRoleAction(projectId, formData)
    setLoadingId(null)
    router.refresh()
  }

  async function handleRemove(memberId: string) {
    if (!confirm("Tem certeza que deseja remover este membro?")) return
    setLoadingId(memberId)
    await removeMemberAction(projectId, memberId)
    setLoadingId(null)
    router.refresh()
  }

  return (
    <div className="space-y-2">
      {members.map((member) => (
        <div
          key={member.id}
          className="flex items-center gap-3 p-3 rounded-lg border bg-card"
        >
          <Avatar className="h-9 w-9">
            <AvatarFallback className="text-xs">
              {getInitials(member.user.name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {member.user.name}
              {member.user.id === currentUserId && (
                <span className="ml-1 text-muted-foreground font-normal">(você)</span>
              )}
            </p>
            <p className="text-xs text-muted-foreground truncate">{member.user.email}</p>
          </div>

          <Badge variant={ROLE_VARIANTS[member.role]}>
            {ROLE_LABELS[member.role]}
          </Badge>

          {canManage && member.user.id !== currentUserId && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={loadingId === member.id}
                  className="h-8 w-8 p-0"
                >
                  ⋯
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleRoleChange(member.id, "ADMIN")}>
                  Tornar Administrador
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleRoleChange(member.id, "SCRUM_MASTER")}>
                  Tornar Scrum Master
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleRoleChange(member.id, "MEMBER")}>
                  Tornar Membro
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => handleRemove(member.id)}
                >
                  Remover do projeto
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      ))}
    </div>
  )
}
