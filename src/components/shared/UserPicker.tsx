"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Member {
  id: string
  user: { id: string; name: string }
}

interface Props {
  members: Member[]
  value: string // user id or "none"
  onChange: (userId: string) => void
  placeholder?: string
}

export function UserPicker({ members, value, onChange, placeholder = "Sem responsável" }: Props) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">{placeholder}</SelectItem>
        {members.map((m) => (
          <SelectItem key={m.user.id} value={m.user.id}>
            {m.user.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
