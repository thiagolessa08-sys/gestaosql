import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/server/auth/config"
import { findNotificationsByUser } from "@/server/repositories/notifications"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const limit = parseInt(searchParams.get("limit") ?? "20", 10)
  const offset = parseInt(searchParams.get("offset") ?? "0", 10)

  const notifications = await findNotificationsByUser(session.user.id, { limit, offset })
  return NextResponse.json({ notifications })
}
