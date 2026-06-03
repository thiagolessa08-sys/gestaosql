import Link from "next/link"
import { redirect } from "next/navigation"
import { getRequiredSession } from "@/server/auth/helpers"
import { getComercialDashboard } from "@/server/services/comercialDashboard"
import { DashboardView } from "@/components/comercial/dashboard/DashboardView"
import { Button } from "@/components/ui/button"
import { LayoutGrid } from "lucide-react"

export default async function ComercialDashboardPage() {
  const session = await getRequiredSession()
  if (!session.user.isSystemAdmin && session.user.perfil !== "COMERCIAL") {
    redirect("/projetos")
  }

  const data = await getComercialDashboard()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard Comercial</h1>
        <Button variant="outline" size="sm" asChild>
          <Link href="/comercial">
            <LayoutGrid className="w-4 h-4 mr-1" />
            Kanban
          </Link>
        </Button>
      </div>
      <DashboardView data={data} />
    </div>
  )
}
