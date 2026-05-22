import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { auth, signOut } from "@/server/auth/config"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r flex flex-col">
        <div className="p-4">
          <h1 className="font-bold text-lg">SQLTech Gestão</h1>
        </div>
        <Separator />
        <nav className="flex-1 p-4 space-y-1">
          <Link
            href="/projetos"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors"
          >
            Projetos
          </Link>
        </nav>
        <Separator />
        <div className="p-4">
          <p className="text-sm font-medium truncate">{session.user.name}</p>
          <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
          <form
            action={async () => {
              "use server"
              await signOut({ redirectTo: "/login" })
            }}
            className="mt-2"
          >
            <Button variant="ghost" size="sm" className="w-full justify-start" type="submit">
              Sair
            </Button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
