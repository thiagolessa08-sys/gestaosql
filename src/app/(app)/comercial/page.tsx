import { getRequiredSession } from "@/server/auth/helpers"
import { findAllOportunidades } from "@/server/repositories/oportunidades"
import { findAllProdutos } from "@/server/repositories/produtos"
import { db } from "@/server/db"
import { ComercialKanban } from "@/components/comercial/ComercialKanban"
import { podeApagarOportunidade, isAdminComercial } from "@/lib/acesso"

export default async function ComercialPage() {
  const session = await getRequiredSession()
  // Membro comercial vê só as próprias; admin comercial e admin total veem todas
  const filtro = session.user.perfil === "MEMBRO_COMERCIAL" && !session.user.isSystemAdmin
    ? session.user.id
    : undefined

  const [oportunidades, users, produtos] = await Promise.all([
    findAllOportunidades(filtro),
    db.user.findMany({
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    findAllProdutos(),
  ])

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-6 py-4">
        <h1 className="text-xl font-semibold">Comercial</h1>
      </div>
      <div className="flex-1 overflow-hidden">
        <ComercialKanban
          oportunidades={oportunidades}
          users={users}
          produtos={produtos}
          isAdmin={podeApagarOportunidade(session.user)}
          canManageProdutos={isAdminComercial(session.user)}
        />
      </div>
    </div>
  )
}
