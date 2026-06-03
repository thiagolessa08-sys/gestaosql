import { redirect } from "next/navigation"
import { getRequiredSession } from "@/server/auth/helpers"
import { getComercialDashboard } from "@/server/services/comercialDashboard"
import { DashboardView } from "@/components/comercial/dashboard/DashboardView"
import { podeVerPainelComercial, areaPadrao } from "@/lib/acesso"

export default async function PainelComercialPage() {
  const session = await getRequiredSession()
  if (!podeVerPainelComercial(session.user)) {
    redirect(areaPadrao(session.user))
  }

  const data = await getComercialDashboard()

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Painel Comercial</h1>
      <DashboardView data={data} />
    </div>
  )
}
