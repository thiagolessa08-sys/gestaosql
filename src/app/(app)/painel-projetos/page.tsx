import { redirect } from "next/navigation"
import { getRequiredSession } from "@/server/auth/helpers"
import { podeVerPainelProjetos, areaPadrao } from "@/lib/acesso"
import { getProjetosDashboard } from "@/server/services/projetosDashboard"
import { GerencialView } from "@/components/projetos/dashboard/GerencialView"

export default async function PainelProjetosGerencialPage() {
  const session = await getRequiredSession()
  if (!podeVerPainelProjetos(session.user)) {
    redirect(areaPadrao(session.user))
  }

  const data = await getProjetosDashboard()

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Painel Projetos Gerencial</h1>
      <GerencialView data={data} />
    </div>
  )
}
