import { render } from "@react-email/components"
import { resend } from "./client"
import { db } from "@/server/db"
import type { ReactElement } from "react"

interface SendEmailOptions {
  to: string
  subject: string
  template: ReactElement
  recipientId: string
  notificationId?: string
}

export async function sendEmail({
  to,
  subject,
  template,
  recipientId,
  notificationId,
}: SendEmailOptions): Promise<void> {
  const log = await db.emailLog.create({
    data: {
      recipientId,
      notificationId,
      toEmail: to,
      subject,
      status: "PENDING",
    },
  })

  try {
    const html = await render(template)
    await resend.emails.send({
      from: process.env.RESEND_FROM ?? "SQLTech Gestão <noreply@example.com>",
      to,
      subject,
      html,
    })
    await db.emailLog.update({
      where: { id: log.id },
      data: { status: "SENT", sentAt: new Date() },
    })
  } catch (error) {
    await db.emailLog.update({
      where: { id: log.id },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : String(error),
      },
    })
    // Don't rethrow — email failures are non-fatal
    console.error("[sendEmail] Failed to send email:", error)
  }
}
