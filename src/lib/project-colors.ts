export const PROJECT_COLOR_LIST = [
  { accent: "#4F46E5", light: "#EEF2FF", text: "#3730A3" }, // indigo
  { accent: "#E11D48", light: "#FFF1F2", text: "#9F1239" }, // rose
  { accent: "#059669", light: "#ECFDF5", text: "#065F46" }, // emerald
  { accent: "#D97706", light: "#FFFBEB", text: "#92400E" }, // amber
  { accent: "#0891B2", light: "#F0F9FF", text: "#164E63" }, // cyan
  { accent: "#7C3AED", light: "#F5F3FF", text: "#4C1D95" }, // violet
  { accent: "#EA580C", light: "#FFF7ED", text: "#7C2D12" }, // orange
  { accent: "#0D9488", light: "#F0FDFA", text: "#134E4A" }, // teal
]

export function getProjectColor(slug: string) {
  let hash = 0
  for (let i = 0; i < slug.length; i++) {
    hash = (hash << 5) - hash + slug.charCodeAt(i)
    hash |= 0
  }
  return PROJECT_COLOR_LIST[Math.abs(hash) % PROJECT_COLOR_LIST.length]
}

export function getUserAvatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i)
    hash |= 0
  }
  return PROJECT_COLOR_LIST[Math.abs(hash) % PROJECT_COLOR_LIST.length]
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return "?"
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("")
}
