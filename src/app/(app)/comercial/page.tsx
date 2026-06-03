import { getRequiredSession } from "@/server/auth/helpers"
import { findAllOportunidades } from "@/server/repositories/oportunidades"
import { db } from "@/server/db"
import { ComercialKanban } from "@/components/comercial/ComercialKanban"

export default async function ComercialPage() {
  const session = await getRequiredSession()
  const filtro = session.user.isSystemAdmin ? undefined : session.user.id

  const [oportunidades, users] = await Promise.all([
    findAllOportunidades(filtro),
    db.user.findMany({
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ])

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-6 py-4">
        <h1 className="text-xl font-semibold">Comercial</h1>
      </div>
      <div className="flex-1 overflow-hidden">
        <ComercialKanban oportunidades={oportunidades} users={users} isAdmin={session.user.isSystemAdmin} />
      </div>
    </div>
  )
}
