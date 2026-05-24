"use client"

import { useState, useEffect, useCallback } from "react"
import { Bell } from "lucide-react"
import { useRouter } from "next/navigation"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { markNotificationReadAction, markAllNotificationsReadAction } from "@/server/actions/notifications"

interface Notification {
  id: string
  type: string
  title: string
  body: string
  entityType?: string | null
  entityId?: string | null
  readAt?: string | null
  createdAt: string
}

interface Props {
  initialCount: number
}

function getNotificationLink(n: {
  entityType?: string | null
  entityId?: string | null
  type: string
}): string {
  if (n.entityType === "card" && n.entityId) return "/projetos"
  if (n.entityType === "sprint" && n.entityId) return "/projetos"
  return "/projetos"
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" })

  if (diffDays > 0) return rtf.format(-diffDays, "day")
  if (diffHours > 0) return rtf.format(-diffHours, "hour")
  if (diffMins > 0) return rtf.format(-diffMins, "minute")
  return rtf.format(-diffSecs, "second")
}

export function NotificationBell({ initialCount }: Props) {
  const router = useRouter()
  const [count, setCount] = useState(initialCount)
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)

  // Poll for unread count every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch("/api/notifications/unread-count")
      if (res.ok) {
        const data = await res.json()
        setCount(data.count)
      }
    }, 30_000)
    return () => clearInterval(interval)
  }, [])

  // Fetch notifications when dropdown opens
  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/notifications?limit=20&offset=0")
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications)
        setCount(0) // optimistically mark as "seen"
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      fetchNotifications()
    }
  }, [open, fetchNotifications])

  async function handleNotificationClick(notification: Notification) {
    await markNotificationReadAction(notification.id)
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notification.id ? { ...n, readAt: new Date().toISOString() } : n
      )
    )
    const link = getNotificationLink(notification)
    router.push(link)
    setOpen(false)
  }

  async function handleMarkAllRead() {
    await markAllNotificationsReadAction()
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() }))
    )
    setCount(0)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative p-2 rounded-md hover:bg-accent transition-colors"
          aria-label="Notificações"
        >
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center font-medium">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 p-0"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Notificações</h3>
          {notifications.some((n) => !n.readAt) && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={handleMarkAllRead}
            >
              Marcar todas como lidas
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-96">
          {loading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Carregando...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Nenhuma notificação.
            </div>
          ) : (
            <ul>
              {notifications.map((notification) => (
                <li
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-3 hover:bg-accent cursor-pointer border-b last:border-0 ${
                    !notification.readAt ? "bg-accent/30" : ""
                  }`}
                >
                  <p className="font-semibold text-sm leading-snug">
                    {notification.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                    {notification.body}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatRelativeTime(notification.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
