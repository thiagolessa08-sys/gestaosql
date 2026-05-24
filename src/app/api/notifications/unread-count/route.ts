import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/server/auth/config"
import { countUnreadNotifications } from "@/server/repositories/notifications"

export async function GET(_request: NextRequest) {
  const session = await auth()
  if (!session?.user.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const count = await countUnreadNotifications(session.user.id)
  return NextResponse.json({ count })
}
