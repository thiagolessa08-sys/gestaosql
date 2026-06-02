import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { auth, signOut } from "@/server/auth/config"
import { Button } from "@/components/ui/button"
import { NotificationBell } from "@/components/shared/NotificationBell"
import { countUnreadNotifications } from "@/server/repositories/notifications"
import { findRecentProjectsForSidebar } from "@/server/repositories/projects"
import { SidebarNav } from "@/components/layout/SidebarNav"
import { SidebarRecentProjects } from "@/components/layout/SidebarRecentProjects"
import { getInitials, getUserAvatarColor } from "@/lib/project-colors"

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  const [unreadCount, recentProjects] = await Promise.all([
    countUnreadNotifications(session.user.id),
    findRecentProjectsForSidebar(session.user.id, session.user.isSystemAdmin),
  ])

  const initials = getInitials(session.user.name)
  const avatarColor = getUserAvatarColor(session.user.name ?? "")

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col shrink-0 shadow-sm bg-[#1d4ed8] text-white">
        {/* Logo */}
        <div className="px-4 py-4 flex items-center justify-center border-b border-white/25">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-branco.png?v=1" alt="SQLTech" className="h-20 w-full object-contain" />
        </div>

        {/* Main nav */}
        <SidebarNav isSystemAdmin={session.user.isSystemAdmin} perfil={session.user.perfil} />

        {/* Projetos recentes */}
        {recentProjects.length > 0 && (
          <SidebarRecentProjects projects={recentProjects} />
        )}

        {/* User section */}
        <div className="border-t border-white/20 p-4 mt-auto">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold"
              style={{ background: avatarColor.light, color: avatarColor.text }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate leading-tight text-white">{session.user.name}</p>
              <p className="text-xs text-white/60 truncate">{session.user.email}</p>
            </div>
            <NotificationBell initialCount={unreadCount} />
          </div>
          <form
            action={async () => {
              "use server"
              await signOut({ redirectTo: "/login" })
            }}
            className="mt-3"
          >
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-white/80 hover:text-white hover:bg-white/10"
              type="submit"
            >
              Sair
            </Button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="px-3 py-6 max-w-[1600px] mx-auto w-full">{children}</div>
      </main>
    </div>
  )
}
