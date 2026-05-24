"use client"

import { useState, useTransition } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { updateNotificationPreferenceAction } from "@/server/actions/users"
import { NotificationType } from "@prisma/client"

interface NotificationPref {
  type: NotificationType
  label: string
  description: string
  emailEnabled: boolean
}

interface NotificationPrefsFormProps {
  prefs: NotificationPref[]
}

export function NotificationPrefsForm({ prefs: initialPrefs }: NotificationPrefsFormProps) {
  const [prefs, setPrefs] = useState(initialPrefs)
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function handleToggle(type: NotificationType, current: boolean) {
    const next = !current
    // Optimistic update
    setPrefs((prev) =>
      prev.map((p) => (p.type === type ? { ...p, emailEnabled: next } : p))
    )
    startTransition(async () => {
      const result = await updateNotificationPreferenceAction(type, next)
      if (!result.success) {
        // Revert
        setPrefs((prev) =>
          prev.map((p) => (p.type === type ? { ...p, emailEnabled: current } : p))
        )
        setErrorMsg(result.error)
      } else {
        setErrorMsg(null)
      }
    })
  }

  return (
    <div className="space-y-3">
      {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
      {prefs.map((pref) => (
        <Card key={pref.type}>
          <CardContent className="flex items-center justify-between py-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">{pref.label}</p>
              <p className="text-xs text-muted-foreground">{pref.description}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={pref.emailEnabled}
              aria-label={`${pref.label} — email`}
              disabled={isPending}
              onClick={() => handleToggle(pref.type, pref.emailEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                pref.emailEnabled ? "bg-primary" : "bg-input"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-background shadow transition-transform ${
                  pref.emailEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
