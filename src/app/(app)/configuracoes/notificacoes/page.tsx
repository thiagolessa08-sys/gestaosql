import { redirect } from "next/navigation"
import { auth } from "@/server/auth/config"
import { db } from "@/server/db"
import { NotificationType } from "@prisma/client"
import { NotificationPrefsForm } from "./_components/NotificationPrefsForm"

const NOTIFICATION_LABELS: Record<NotificationType, { label: string; description: string }> = {
  CARD_ASSIGNED: {
    label: "Card atribuído a você",
    description: "Receba um email quando um card for atribuído a você.",
  },
  CARD_COMMENTED: {
    label: "Comentário em card",
    description: "Receba um email quando alguém comentar em um card seu.",
  },
  MENTIONED: {
    label: "Menção em comentário",
    description: "Receba um email quando você for mencionado em um comentário.",
  },
  SPRINT_STARTED: {
    label: "Sprint iniciada",
    description: "Receba um email quando uma sprint for iniciada.",
  },
  SPRINT_ENDED: {
    label: "Sprint encerrada",
    description: "Receba um email quando uma sprint for encerrada.",
  },
  ADDED_TO_PROJECT: {
    label: "Adicionado a projeto",
    description: "Receba um email quando você for adicionado a um projeto.",
  },
  REMOVED_FROM_PROJECT: {
    label: "Removido de projeto",
    description: "Receba um email quando você for removido de um projeto.",
  },
}

export default async function NotificacoesPage() {
  const session = await auth()
  if (!session?.user.id) redirect("/login")

  const userId = session.user.id

  const savedPrefs = await db.userNotificationPreference.findMany({
    where: { userId },
  })

  const savedMap = new Map(savedPrefs.map((p) => [p.notificationType, p.emailEnabled]))

  const allTypes = Object.values(NotificationType)

  const prefs = allTypes.map((type) => ({
    type,
    label: NOTIFICATION_LABELS[type].label,
    description: NOTIFICATION_LABELS[type].description,
    emailEnabled: savedMap.get(type) ?? true,
  }))

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">
        Escolha quais notificações você deseja receber por email.
      </p>
      <NotificationPrefsForm prefs={prefs} />
    </div>
  )
}
