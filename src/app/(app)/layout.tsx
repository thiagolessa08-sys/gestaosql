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
      <aside className="w-64 border-r bg-card flex flex-col shrink-0 shadow-sm">
        {/* Logo */}
        <div className="px-4 py-4 flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="SQLTech" className="h-10 w-auto object-contain dark:invert" />
        </div>

        {/* Main nav */}
        <SidebarNav />

        {/* Projetos recentes */}
        {recentProjects.length > 0 && (
          <SidebarRecentProjects projects={recentProjects} />
        )}

        {/* User section */}
        <div className="border-t p-4 mt-auto">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold"
              style={{ background: avatarColor.light, color: avatarColor.text }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate leading-tight">{session.user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
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
              className="w-full justify-start text-muted-foreground hover:text-foreground"
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
