import { redirect } from "next/navigation"
import { getRequiredSession } from "@/server/auth/helpers"
import { getComercialDashboard } from "@/server/services/comercialDashboard"
import { DashboardView } from "@/components/comercial/dashboard/DashboardView"

export default async function PainelComercialPage() {
  const session = await getRequiredSession()
  if (!session.user.isSystemAdmin && session.user.perfil !== "COMERCIAL") {
    redirect("/projetos")
  }

  const data = await getComercialDashboard()

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Painel Comercial</h1>
      <DashboardView data={data} />
    </div>
  )
}
