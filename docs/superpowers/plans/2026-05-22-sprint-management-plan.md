# SQLTech Gestão — Sprint Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir um sistema web completo de gerenciamento de sprints com auth, projetos, membros, board kanban, colaboração e notificações.

**Architecture:** Next.js 15 App Router + TypeScript. Auth.js v5 (Credentials + JWT). Prisma + PostgreSQL. Camadas: Server Actions → Services → Repositories → Prisma. Toda mutação passa por `requirePermission`. Analytics-ready via `CardStatusTransition` e `AuditLog`.

**Tech Stack:** Next.js 15, TypeScript, Prisma 6, PostgreSQL, Auth.js v5, bcryptjs, Zod, shadcn/ui, Tailwind CSS, @dnd-kit, Resend, React Email, Vitest, Playwright

**Spec:** `docs/superpowers/specs/2026-05-22-sprint-management-design.md`

---

## SPRINT 1 — Foundation
**Meta:** Projeto rodando localmente com banco, auth e permissões. Ao final: login funciona, admin bootstrap existe, rotas protegidas.

### Task 1.1 — Inicializar projeto Next.js
- [ ] Rodar: `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"` dentro da pasta do projeto
- [ ] Verificar que `npm run dev` sobe sem erros
- [ ] Commitar: `git init && git add . && git commit -m "chore: initialize Next.js project"`

### Task 1.2 — Docker Compose + variáveis de ambiente
- [ ] Criar `docker-compose.yml`:
```yaml
version: "3.8"
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: sqltech
      POSTGRES_PASSWORD: sqltech
      POSTGRES_DB: sqltech_gestao
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
volumes:
  postgres_data:
```
- [ ] Criar `.env.example`:
```
DATABASE_URL="postgresql://sqltech:sqltech@localhost:5432/sqltech_gestao"
NEXTAUTH_SECRET="gere-com-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
RESEND_API_KEY="re_..."
RESEND_FROM="SQLTech Gestão <noreply@seudominio.com>"
ADMIN_BOOTSTRAP_EMAIL="admin@sqltech.com"
ADMIN_BOOTSTRAP_PASSWORD="Admin@123"
ATTACHMENT_STORAGE_PATH="./data/attachments"
```
- [ ] Criar `.env.local` com os valores reais (não commitar)
- [ ] Adicionar `.env.local` ao `.gitignore`
- [ ] Rodar `docker-compose up -d` e verificar que Postgres sobe
- [ ] Commitar: `git add docker-compose.yml .env.example .gitignore && git commit -m "chore: add docker-compose and env config"`

### Task 1.3 — Instalar dependências
- [ ] Rodar:
```bash
npm install prisma @prisma/client next-auth@beta bcryptjs zod resend @react-email/components react-email lucide-react class-variance-authority clsx tailwind-merge @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```
- [ ] Rodar:
```bash
npm install -D @types/bcryptjs vitest @vitejs/plugin-react vite-tsconfig-paths @playwright/test @testing-library/react jsdom
```
- [ ] Commitar: `git add package.json package-lock.json && git commit -m "chore: install dependencies"`

### Task 1.4 — Inicializar shadcn/ui
- [ ] Rodar: `npx shadcn@latest init` (escolher: Default style, Slate color, CSS variables: yes)
- [ ] Instalar componentes base:
```bash
npx shadcn@latest add button input label form card dialog dropdown-menu badge avatar select textarea popover tooltip separator scroll-area
```
- [ ] Commitar: `git add . && git commit -m "chore: setup shadcn/ui"`

### Task 1.5 — Prisma schema completo
- [ ] Rodar: `npx prisma init`
- [ ] Substituir `prisma/schema.prisma` pelo schema completo:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role { ADMIN SCRUM_MASTER MEMBER }
enum SprintStatus { PLANNED ACTIVE COMPLETED CANCELLED }
enum CardStatus { BACKLOG DOING VALIDATION DONE }
enum Priority { LOW MEDIUM HIGH CRITICAL }
enum AuditAction { CREATE UPDATE DELETE MOVE ASSIGN COMMENT INVITE JOIN REMOVE_MEMBER START_SPRINT END_SPRINT }
enum NotificationType { CARD_ASSIGNED CARD_COMMENTED MENTIONED SPRINT_STARTED SPRINT_ENDED ADDED_TO_PROJECT REMOVED_FROM_PROJECT }
enum EmailStatus { PENDING SENT FAILED }

model User {
  id                 String    @id @default(uuid())
  name               String
  email              String    @unique
  passwordHash       String    @map("password_hash")
  avatarUrl          String?   @map("avatar_url")
  isSystemAdmin      Boolean   @default(false) @map("is_system_admin")
  mustChangePassword Boolean   @default(false) @map("must_change_password")
  createdAt          DateTime  @default(now()) @map("created_at")
  updatedAt          DateTime  @updatedAt @map("updated_at")
  deletedAt          DateTime? @map("deleted_at")

  projectsCreated       Project[]                    @relation("ProjectCreator")
  projectMembers        ProjectMember[]
  invitationsSent       ProjectInvitation[]          @relation("InvitedBy")
  cardsCreated          Card[]                       @relation("CardCreator")
  cardsAssigned         Card[]                       @relation("CardAssignee")
  comments              Comment[]
  checklistsCompleted   ChecklistItem[]              @relation("ChecklistCompleter")
  attachmentsUploaded   Attachment[]
  auditLogs             AuditLog[]
  notifications         Notification[]
  emailLogs             EmailLog[]
  notificationPrefs     UserNotificationPreference[]
  passwordResetTokens   PasswordResetToken[]
  cardStatusTransitions CardStatusTransition[]

  @@map("users")
}

model Project {
  id          String    @id @default(uuid())
  name        String
  slug        String    @unique
  description String?
  createdById String    @map("created_by_id")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  archivedAt  DateTime? @map("archived_at")

  createdBy   User                @relation("ProjectCreator", fields: [createdById], references: [id])
  members     ProjectMember[]
  invitations ProjectInvitation[]
  sprints     Sprint[]
  cards       Card[]
  tags        Tag[]
  auditLogs   AuditLog[]

  @@map("projects")
}

model ProjectMember {
  id        String    @id @default(uuid())
  projectId String    @map("project_id")
  userId    String    @map("user_id")
  role      Role
  joinedAt  DateTime  @default(now()) @map("joined_at")
  removedAt DateTime? @map("removed_at")

  project Project @relation(fields: [projectId], references: [id])
  user    User    @relation(fields: [userId], references: [id])

  @@map("project_members")
}

model ProjectInvitation {
  id          String    @id @default(uuid())
  projectId   String    @map("project_id")
  email       String
  role        Role
  invitedById String    @map("invited_by_id")
  token       String    @unique
  expiresAt   DateTime  @map("expires_at")
  acceptedAt  DateTime? @map("accepted_at")
  createdAt   DateTime  @default(now()) @map("created_at")

  project   Project @relation(fields: [projectId], references: [id])
  invitedBy User    @relation("InvitedBy", fields: [invitedById], references: [id])

  @@map("project_invitations")
}

model PasswordResetToken {
  id        String    @id @default(uuid())
  userId    String    @map("user_id")
  token     String    @unique
  expiresAt DateTime  @map("expires_at")
  usedAt    DateTime? @map("used_at")
  createdAt DateTime  @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id])

  @@map("password_reset_tokens")
}

model Sprint {
  id               String       @id @default(uuid())
  projectId        String       @map("project_id")
  name             String
  goal             String?
  plannedStartDate DateTime     @map("planned_start_date") @db.Date
  plannedEndDate   DateTime     @map("planned_end_date") @db.Date
  startedAt        DateTime?    @map("started_at")
  endedAt          DateTime?    @map("ended_at")
  status           SprintStatus @default(PLANNED)
  createdAt        DateTime     @default(now()) @map("created_at")
  updatedAt        DateTime     @updatedAt @map("updated_at")

  project         Project              @relation(fields: [projectId], references: [id])
  cards           Card[]
  cardSnapshots   SprintCardSnapshot[]
  cardTransitions CardStatusTransition[]

  @@map("sprints")
}

model Card {
  id          String     @id @default(uuid())
  projectId   String     @map("project_id")
  sprintId    String?    @map("sprint_id")
  title       String
  description String?
  assigneeId  String?    @map("assignee_id")
  priority    Priority   @default(MEDIUM)
  status      CardStatus @default(BACKLOG)
  storyPoints Int?       @map("story_points")
  dueDate     DateTime?  @map("due_date") @db.Date
  position    Int        @default(0)
  createdById String     @map("created_by_id")
  createdAt   DateTime   @default(now()) @map("created_at")
  updatedAt   DateTime   @updatedAt @map("updated_at")
  archivedAt  DateTime?  @map("archived_at")

  project     Project               @relation(fields: [projectId], references: [id])
  sprint      Sprint?               @relation(fields: [sprintId], references: [id])
  assignee    User?                 @relation("CardAssignee", fields: [assigneeId], references: [id])
  createdBy   User                  @relation("CardCreator", fields: [createdById], references: [id])
  tags        CardTag[]
  comments    Comment[]
  checklists  ChecklistItem[]
  attachments Attachment[]
  transitions CardStatusTransition[]

  @@map("cards")
}

model Tag {
  id        String    @id @default(uuid())
  projectId String    @map("project_id")
  name      String
  color     String
  createdAt DateTime  @default(now()) @map("created_at")

  project Project   @relation(fields: [projectId], references: [id])
  cards   CardTag[]

  @@unique([projectId, name])
  @@map("tags")
}

model CardTag {
  cardId String @map("card_id")
  tagId  String @map("tag_id")

  card Card @relation(fields: [cardId], references: [id])
  tag  Tag  @relation(fields: [tagId], references: [id])

  @@id([cardId, tagId])
  @@map("card_tags")
}

model Comment {
  id        String    @id @default(uuid())
  cardId    String    @map("card_id")
  authorId  String    @map("author_id")
  body      String
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  card   Card @relation(fields: [cardId], references: [id])
  author User @relation(fields: [authorId], references: [id])

  @@map("comments")
}

model ChecklistItem {
  id            String    @id @default(uuid())
  cardId        String    @map("card_id")
  text          String
  isDone        Boolean   @default(false) @map("is_done")
  position      Int       @default(0)
  createdAt     DateTime  @default(now()) @map("created_at")
  completedAt   DateTime? @map("completed_at")
  completedById String?   @map("completed_by_id")

  card        Card  @relation(fields: [cardId], references: [id])
  completedBy User? @relation("ChecklistCompleter", fields: [completedById], references: [id])

  @@map("checklist_items")
}

model Attachment {
  id           String    @id @default(uuid())
  cardId       String    @map("card_id")
  uploadedById String    @map("uploaded_by_id")
  filename     String
  mimeType     String    @map("mime_type")
  sizeBytes    Int       @map("size_bytes")
  storagePath  String    @map("storage_path")
  uploadedAt   DateTime  @default(now()) @map("uploaded_at")
  deletedAt    DateTime? @map("deleted_at")

  card       Card @relation(fields: [cardId], references: [id])
  uploadedBy User @relation(fields: [uploadedById], references: [id])

  @@map("attachments")
}

model CardStatusTransition {
  id         String     @id @default(uuid())
  cardId     String     @map("card_id")
  fromStatus CardStatus? @map("from_status")
  toStatus   CardStatus @map("to_status")
  sprintId   String?    @map("sprint_id")
  movedById  String     @map("moved_by_id")
  movedAt    DateTime   @default(now()) @map("moved_at")

  card    Card    @relation(fields: [cardId], references: [id])
  sprint  Sprint? @relation(fields: [sprintId], references: [id])
  movedBy User    @relation(fields: [movedById], references: [id])

  @@map("card_status_transitions")
}

model SprintCardSnapshot {
  id           String     @id @default(uuid())
  sprintId     String     @map("sprint_id")
  snapshotDate DateTime   @map("snapshot_date") @db.Date
  cardId       String     @map("card_id")
  status       CardStatus
  storyPoints  Int?       @map("story_points")

  sprint Sprint @relation(fields: [sprintId], references: [id])

  @@unique([sprintId, snapshotDate, cardId])
  @@map("sprint_card_snapshots")
}

model AuditLog {
  id         String      @id @default(uuid())
  projectId  String      @map("project_id")
  actorId    String      @map("actor_id")
  entityType String      @map("entity_type")
  entityId   String      @map("entity_id")
  action     AuditAction
  changes    Json?
  createdAt  DateTime    @default(now()) @map("created_at")

  project Project @relation(fields: [projectId], references: [id])
  actor   User    @relation(fields: [actorId], references: [id])

  @@map("audit_logs")
}

model Notification {
  id          String           @id @default(uuid())
  recipientId String           @map("recipient_id")
  type        NotificationType
  title       String
  body        String
  entityType  String?          @map("entity_type")
  entityId    String?          @map("entity_id")
  readAt      DateTime?        @map("read_at")
  createdAt   DateTime         @default(now()) @map("created_at")

  recipient User       @relation(fields: [recipientId], references: [id])
  emailLogs EmailLog[]

  @@map("notifications")
}

model EmailLog {
  id             String      @id @default(uuid())
  recipientId    String      @map("recipient_id")
  notificationId String?     @map("notification_id")
  toEmail        String      @map("to_email")
  subject        String
  status         EmailStatus @default(PENDING)
  error          String?
  sentAt         DateTime?   @map("sent_at")
  createdAt      DateTime    @default(now()) @map("created_at")

  recipient    User          @relation(fields: [recipientId], references: [id])
  notification Notification? @relation(fields: [notificationId], references: [id])

  @@map("email_logs")
}

model UserNotificationPreference {
  id               String           @id @default(uuid())
  userId           String           @map("user_id")
  notificationType NotificationType @map("notification_type")
  emailEnabled     Boolean          @default(true) @map("email_enabled")

  user User @relation(fields: [userId], references: [id])

  @@unique([userId, notificationType])
  @@map("user_notification_preferences")
}
```
- [ ] Commitar: `git add prisma/schema.prisma && git commit -m "feat: add complete prisma schema"`

### Task 1.6 — Migration inicial + Prisma Client
- [ ] Criar `src/server/db.ts`:
```typescript
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"] })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db
```
- [ ] Rodar: `npx prisma migrate dev --name init`
- [ ] Verificar que todas as tabelas foram criadas: `npx prisma studio`
- [ ] Commitar: `git add prisma/migrations src/server/db.ts && git commit -m "feat: initial database migration"`

### Task 1.7 — Seed: admin bootstrap
- [ ] Criar `prisma/seed.ts`:
```typescript
import { PrismaClient } from "@prisma/client"
import { hash } from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD
  if (!email || !password) throw new Error("ADMIN_BOOTSTRAP_EMAIL e ADMIN_BOOTSTRAP_PASSWORD são obrigatórios")

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) { console.log("Admin já existe, pulando seed."); return }

  const passwordHash = await hash(password, 12)
  await prisma.user.create({
    data: { name: "Admin", email, passwordHash, isSystemAdmin: true, mustChangePassword: true },
  })
  console.log(`Admin criado: ${email}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
```
- [ ] Adicionar ao `package.json`:
```json
"prisma": { "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts" }
```
- [ ] Instalar: `npm install -D ts-node`
- [ ] Rodar: `npx prisma db seed`
- [ ] Verificar que o usuário admin foi criado no banco
- [ ] Commitar: `git add prisma/seed.ts package.json && git commit -m "feat: add bootstrap admin seed"`

### Task 1.8 — Auth.js v5 (login com credentials)
- [ ] Criar `src/types/next-auth.d.ts`:
```typescript
import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: { id: string; isSystemAdmin: boolean; mustChangePassword: boolean } & DefaultSession["user"]
  }
  interface User {
    isSystemAdmin: boolean
    mustChangePassword: boolean
  }
}
declare module "next-auth/jwt" {
  interface JWT { id: string; isSystemAdmin: boolean; mustChangePassword: boolean }
}
```
- [ ] Criar `src/server/auth/config.ts`:
```typescript
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { db } from "@/server/db"
import { z } from "zod"

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) })

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null
        const user = await db.user.findUnique({
          where: { email: parsed.data.email, deletedAt: null },
        })
        if (!user) return null
        const valid = await compare(parsed.data.password, user.passwordHash)
        if (!valid) return null
        return { id: user.id, name: user.name, email: user.email, isSystemAdmin: user.isSystemAdmin, mustChangePassword: user.mustChangePassword }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!
        token.isSystemAdmin = user.isSystemAdmin
        token.mustChangePassword = user.mustChangePassword
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id
      session.user.isSystemAdmin = token.isSystemAdmin
      session.user.mustChangePassword = token.mustChangePassword
      return session
    },
  },
  pages: { signIn: "/login", error: "/login" },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
})
```
- [ ] Criar `src/app/api/auth/[...nextauth]/route.ts`:
```typescript
import { handlers } from "@/server/auth/config"
export const { GET, POST } = handlers
```
- [ ] Commitar: `git add src/ && git commit -m "feat: configure Auth.js v5 with credentials"`

### Task 1.9 — Middleware de proteção de rotas
- [ ] Criar `src/middleware.ts`:
```typescript
import { auth } from "@/server/auth/config"
import { NextResponse } from "next/server"

const PUBLIC_PATHS = ["/login", "/esqueci-senha", "/redefinir-senha", "/convite"]

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  const isLoggedIn = !!req.auth

  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url))
  }
  if (isLoggedIn && req.auth?.user.mustChangePassword && !pathname.startsWith("/trocar-senha")) {
    return NextResponse.redirect(new URL("/trocar-senha", req.url))
  }
  return NextResponse.next()
})

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"] }
```
- [ ] Commitar: `git add src/middleware.ts && git commit -m "feat: add route protection middleware"`

### Task 1.10 — Módulo de permissões (TDD)
- [ ] Criar `vitest.config.ts`:
```typescript
import { defineConfig } from "vitest/config"
import tsconfigPaths from "vite-tsconfig-paths"
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: { globals: true, environment: "node", setupFiles: ["./tests/setup.ts"] },
})
```
- [ ] Criar `tests/setup.ts`: arquivo vazio por ora
- [ ] Adicionar ao `package.json`: `"test": "vitest"` e `"test:run": "vitest run"`
- [ ] Criar `tests/unit/permissions.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"
import { requirePermission, ForbiddenError, NotMemberError } from "@/server/permissions"
import { db } from "@/server/db"

vi.mock("@/server/db", () => ({ db: { projectMember: { findFirst: vi.fn() } } }))
const mockDb = vi.mocked(db)

const mockMember = (role: string) => ({
  id: "m1", userId: "u1", projectId: "p1", role, joinedAt: new Date(), removedAt: null
})

describe("requirePermission", () => {
  beforeEach(() => vi.clearAllMocks())

  it("throws NotMemberError when not a member", async () => {
    mockDb.projectMember.findFirst.mockResolvedValue(null)
    await expect(requirePermission("u1", "p1", "card:create")).rejects.toThrow(NotMemberError)
  })

  it("MEMBER can create card", async () => {
    mockDb.projectMember.findFirst.mockResolvedValue(mockMember("MEMBER") as any)
    await expect(requirePermission("u1", "p1", "card:create")).resolves.not.toThrow()
  })

  it("MEMBER cannot edit project", async () => {
    mockDb.projectMember.findFirst.mockResolvedValue(mockMember("MEMBER") as any)
    await expect(requirePermission("u1", "p1", "project:edit")).rejects.toThrow(ForbiddenError)
  })

  it("SCRUM_MASTER can create sprint", async () => {
    mockDb.projectMember.findFirst.mockResolvedValue(mockMember("SCRUM_MASTER") as any)
    await expect(requirePermission("u1", "p1", "sprint:create")).resolves.not.toThrow()
  })

  it("SCRUM_MASTER cannot manage members", async () => {
    mockDb.projectMember.findFirst.mockResolvedValue(mockMember("SCRUM_MASTER") as any)
    await expect(requirePermission("u1", "p1", "project:manage_members")).rejects.toThrow(ForbiddenError)
  })

  it("ADMIN can do everything", async () => {
    mockDb.projectMember.findFirst.mockResolvedValue(mockMember("ADMIN") as any)
    await expect(requirePermission("u1", "p1", "project:manage_members")).resolves.not.toThrow()
    await expect(requirePermission("u1", "p1", "comment:delete_others")).resolves.not.toThrow()
  })

  it("MEMBER cannot delete others comments", async () => {
    mockDb.projectMember.findFirst.mockResolvedValue(mockMember("MEMBER") as any)
    await expect(requirePermission("u1", "p1", "comment:delete_others")).rejects.toThrow(ForbiddenError)
  })
})
```
- [ ] Rodar: `npm run test:run` — esperar FAIL (permissions.ts não existe)
- [ ] Criar `src/server/permissions.ts`:
```typescript
import { db } from "@/server/db"
import type { Role } from "@prisma/client"

export type ProjectAction =
  | "project:edit" | "project:archive" | "project:manage_members"
  | "project:manage_tags" | "project:view_audit"
  | "sprint:create" | "sprint:edit" | "sprint:start" | "sprint:close"
  | "card:create" | "card:edit" | "card:archive" | "card:move"
  | "card:assign_others" | "card:assign_self"
  | "comment:create" | "comment:delete_own" | "comment:delete_others"

export class ForbiddenError extends Error {
  constructor(action: ProjectAction) {
    super(`Forbidden: ${action}`)
    this.name = "ForbiddenError"
  }
}
export class NotMemberError extends Error {
  constructor() { super("Not a member"); this.name = "NotMemberError" }
}

const PERMISSIONS: Record<Role, Set<ProjectAction>> = {
  ADMIN: new Set([
    "project:edit","project:archive","project:manage_members","project:manage_tags","project:view_audit",
    "sprint:create","sprint:edit","sprint:start","sprint:close",
    "card:create","card:edit","card:archive","card:move","card:assign_others","card:assign_self",
    "comment:create","comment:delete_own","comment:delete_others",
  ]),
  SCRUM_MASTER: new Set([
    "project:manage_tags","project:view_audit",
    "sprint:create","sprint:edit","sprint:start","sprint:close",
    "card:create","card:edit","card:archive","card:move","card:assign_others","card:assign_self",
    "comment:create","comment:delete_own","comment:delete_others",
  ]),
  MEMBER: new Set([
    "card:create","card:edit","card:archive","card:move","card:assign_self",
    "comment:create","comment:delete_own",
  ]),
}

export async function requirePermission(userId: string, projectId: string, action: ProjectAction) {
  const member = await db.projectMember.findFirst({ where: { userId, projectId, removedAt: null } })
  if (!member) throw new NotMemberError()
  if (!PERMISSIONS[member.role]?.has(action)) throw new ForbiddenError(action)
}

export async function getMemberRole(userId: string, projectId: string) {
  const member = await db.projectMember.findFirst({ where: { userId, projectId, removedAt: null } })
  return member?.role ?? null
}
```
- [ ] Rodar: `npm run test:run` — esperar PASS
- [ ] Commitar: `git add . && git commit -m "feat: add permissions module with TDD"`

### Task 1.11 — Telas de auth (login, esqueci-senha, redefinir-senha, convite)
- [ ] Criar `src/app/(auth)/layout.tsx` — layout centralizado sem sidebar
- [ ] Criar `src/app/(auth)/login/page.tsx` — form com email + senha, chama `signIn`
- [ ] Criar `src/app/(auth)/esqueci-senha/page.tsx` — form com email, chama action `requestPasswordReset`
- [ ] Criar `src/app/(auth)/redefinir-senha/page.tsx` — form nova senha + confirmar, lê `?token=` da URL
- [ ] Criar `src/app/(auth)/convite/page.tsx` — lê `?token=`, mostra form de cadastro (nome + senha), chama action `acceptInvite`
- [ ] Criar `src/app/(app)/trocar-senha/page.tsx` — form para bootstrap admin trocar senha obrigatória no 1º login
- [ ] Criar `src/app/(app)/layout.tsx` — layout autenticado com sidebar e header básicos
- [ ] Criar `src/app/layout.tsx` — root layout com Providers (SessionProvider)
- [ ] Verificar que `/login` abre no navegador, fazer login com admin bootstrap, ser redirecionado para `/trocar-senha`
- [ ] Commitar: `git add src/ && git commit -m "feat: add auth pages (login, forgot, reset, invite)"`

---

## SPRINT 2 — Projetos & Membros
**Meta:** Criar e gerenciar projetos e membros. Ao final: admin cria projeto, convida membro por email, membro aceita convite e entra no sistema.

### Task 2.1 — Zod schemas
- [ ] Criar `src/lib/schemas/auth.ts` (loginSchema, forgotPasswordSchema, resetPasswordSchema, acceptInviteSchema)
- [ ] Criar `src/lib/schemas/projects.ts` (createProjectSchema, updateProjectSchema)
- [ ] Criar `src/lib/schemas/members.ts` (inviteMemberSchema, updateRoleSchema)
- [ ] Criar `src/lib/utils.ts` — helper `generateSlug(name: string): string` (slug a partir do nome, sem caracteres especiais)
- [ ] Commitar: `git add src/lib/ && git commit -m "feat: add zod schemas"`

### Task 2.2 — Repositórios de usuários e convites
- [ ] Criar `src/server/repositories/users.ts` — `findByEmail`, `findById`, `create`, `updatePassword`
- [ ] Criar `src/server/repositories/invitations.ts` — `findByToken`, `create`, `markAccepted`
- [ ] Criar `src/server/repositories/password-reset.ts` — `create`, `findByToken`, `markUsed`
- [ ] Criar `src/server/repositories/projects.ts` — `findBySlug`, `findById`, `findByMemberId`, `create`, `update`, `archive`
- [ ] Criar `src/server/repositories/members.ts` — `findByProjectId`, `findByUserAndProject`, `create`, `updateRole`, `remove`
- [ ] Commitar: `git add src/server/repositories/ && git commit -m "feat: add repositories"`

### Task 2.3 — Email client + templates
- [ ] Criar `src/server/email/client.ts` — instância do Resend com `RESEND_API_KEY`
- [ ] Criar `src/server/email/templates/invite.tsx` — template React Email para convite
- [ ] Criar `src/server/email/templates/password-reset.tsx` — template React Email para reset
- [ ] Criar `src/server/email/send.ts` — função `sendEmail({ to, subject, template })` que chama Resend e grava `EmailLog`
- [ ] Commitar: `git add src/server/email/ && git commit -m "feat: add email client and templates"`

### Task 2.4 — Service de convites (TDD)
- [ ] Criar `tests/unit/services/invitations.test.ts` — testa: convite cria registro, email já usuario vira membro direto, token expirado é rejeitado, aceitar convite cria user + member
- [ ] Rodar: `npm run test:run tests/unit/services/invitations.test.ts` — FAIL
- [ ] Criar `src/server/services/invitations.ts` — `createInvitation`, `acceptInvitation`
- [ ] Rodar: `npm run test:run tests/unit/services/invitations.test.ts` — PASS
- [ ] Commitar: `git add . && git commit -m "feat: invitation service with TDD"`

### Task 2.5 — Service de projetos (TDD)
- [ ] Criar `tests/unit/services/projects.test.ts` — testa: criar projeto vira admin automático, slug único, arquivar não deleta
- [ ] Rodar: FAIL
- [ ] Criar `src/server/services/projects.ts` — `createProject`, `updateProject`, `archiveProject`, `getProjectsForUser`
- [ ] Rodar: PASS
- [ ] Commitar: `git add . && git commit -m "feat: project service with TDD"`

### Task 2.6 — Server Actions de auth + projetos + membros
- [ ] Criar `src/server/actions/auth.ts` — `requestPasswordReset`, `resetPassword`, `acceptInvite`, `changePassword`
- [ ] Criar `src/server/actions/projects.ts` — `createProject`, `updateProject`, `archiveProject`
- [ ] Criar `src/server/actions/members.ts` — `inviteMember`, `updateMemberRole`, `removeMember`
- [ ] Cada action: validar com Zod, chamar `requirePermission` onde necessário, chamar service
- [ ] Commitar: `git add src/server/actions/ && git commit -m "feat: server actions for auth, projects, members"`

### Task 2.7 — Páginas de projetos (UI)
- [ ] Criar `src/app/(app)/projetos/page.tsx` — lista de projetos do usuário (RSC, busca via service)
- [ ] Criar `src/app/(app)/projetos/novo/page.tsx` — form criar projeto (só para `isSystemAdmin`)
- [ ] Criar `src/app/(app)/projetos/[slug]/page.tsx` — overview do projeto (sprint ativa + últimas atividades)
- [ ] Criar `src/app/(app)/projetos/[slug]/configuracoes/page.tsx` — editar nome/descrição, arquivar projeto
- [ ] Criar `src/components/projects/ProjectCard.tsx` — card de projeto para a listagem
- [ ] Commitar: `git add src/ && git commit -m "feat: project pages UI"`

### Task 2.8 — Página de membros (UI)
- [ ] Criar `src/app/(app)/projetos/[slug]/pessoas/page.tsx` — lista membros, botão convidar, mudar role, remover
- [ ] Criar `src/components/projects/InviteForm.tsx` — form de convite (email + role)
- [ ] Criar `src/components/projects/MemberList.tsx` — lista de membros com role badge e ações
- [ ] Commitar: `git add src/ && git commit -m "feat: members page UI"`

---

## SPRINT 3 — Sprints
**Meta:** CRUD de sprints completo. Ao final: criar sprint, iniciar, encerrar com dialog de tratamento de cards não-DONE.

### Task 3.1 — Repositório + Zod schemas de sprint
- [ ] Criar `src/lib/schemas/sprints.ts` — `createSprintSchema`, `updateSprintSchema`, `closeSprintSchema` (com campo `destinationSprintId?: string`)
- [ ] Criar `src/server/repositories/sprints.ts` — `findById`, `findByProjectId`, `findActiveByProjectId`, `create`, `update`, `start`, `close`
- [ ] Commitar: `git add . && git commit -m "feat: sprint repository and schemas"`

### Task 3.2 — Service de sprints (TDD)
- [ ] Criar `tests/unit/services/sprints.test.ts`:
  - Não pode ter 2 sprints ACTIVE no mesmo projeto
  - Iniciar sprint: preenche `startedAt`, muda status para ACTIVE
  - Encerrar sprint: preenche `endedAt`, cards não-DONE voltam para backlog (sprint_id=null) ou vão para sprint destino
  - Não pode iniciar sprint que não é PLANNED
- [ ] Rodar: FAIL
- [ ] Criar `src/server/services/sprints.ts` — `createSprint`, `updateSprint`, `startSprint`, `closeSprint`
- [ ] Rodar: PASS
- [ ] Commitar: `git add . && git commit -m "feat: sprint service with TDD"`

### Task 3.3 — Server Actions de sprints
- [ ] Criar `src/server/actions/sprints.ts` — `createSprint`, `updateSprint`, `startSprint`, `closeSprint`
- [ ] Cada action chama `requirePermission` com `sprint:create` / `sprint:start` / `sprint:close`
- [ ] Commitar: `git add . && git commit -m "feat: sprint server actions"`

### Task 3.4 — Páginas de sprints (UI)
- [ ] Criar `src/app/(app)/projetos/[slug]/sprints/page.tsx` — lista de sprints (PLANNED, ACTIVE, COMPLETED)
- [ ] Criar `src/app/(app)/projetos/[slug]/sprints/nova/page.tsx` — form criar sprint
- [ ] Criar `src/app/(app)/projetos/[slug]/sprints/[id]/page.tsx` — detalhes da sprint + cards
- [ ] Criar `src/components/sprints/SprintForm.tsx` — form com nome, meta, datas
- [ ] Criar `src/components/sprints/SprintCloseDialog.tsx` — dialog perguntando destino dos cards não-DONE
- [ ] Commitar: `git add src/ && git commit -m "feat: sprint pages UI"`

---

## SPRINT 4 — Cards & Board
**Meta:** Board Kanban funcional com drag-and-drop. Ao final: criar card no backlog, arrastar entre colunas, visualizar e editar detalhes.

### Task 4.1 — Repositórios de cards e tags
- [ ] Criar `src/lib/schemas/cards.ts` — `createCardSchema`, `updateCardSchema`, `moveCardSchema`
- [ ] Criar `src/server/repositories/cards.ts` — `findById`, `findBySprintId`, `findBacklog`, `create`, `update`, `archive`, `updateStatus`, `updatePosition`, `addToSprint`
- [ ] Criar `src/server/repositories/tags.ts` — `findByProjectId`, `create`, `delete`, `addToCard`, `removeFromCard`
- [ ] Criar `src/server/repositories/audit.ts` — `create` (gravar AuditLog)
- [ ] Commitar: `git add . && git commit -m "feat: card, tag, audit repositories"`

### Task 4.2 — Audit service
- [ ] Criar `src/server/services/audit.ts`:
```typescript
import { db } from "@/server/db"
import type { AuditAction } from "@prisma/client"

export async function writeAudit(params: {
  projectId: string
  actorId: string
  entityType: string
  entityId: string
  action: AuditAction
  changes?: { before?: unknown; after?: unknown }
}) {
  await db.auditLog.create({
    data: {
      projectId: params.projectId,
      actorId: params.actorId,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      changes: params.changes ?? undefined,
    },
  })
}
```
- [ ] Commitar: `git add src/server/services/audit.ts && git commit -m "feat: audit service"`

### Task 4.3 — Service de cards (TDD)
- [ ] Criar `tests/unit/services/cards.test.ts`:
  - Criar card define status=BACKLOG e position=último da coluna
  - Mover card cria CardStatusTransition com from/to corretos
  - Mover card grava AuditLog com action=MOVE
  - Apenas o assignee ou admin pode ser assignee (Member só pode atribuir a si mesmo)
  - Arquivar card mantém dados (soft delete)
- [ ] Rodar: FAIL
- [ ] Criar `src/server/services/cards.ts` — `createCard`, `updateCard`, `archiveCard`, `moveCard`, `reorderCard`, `addCardToSprint`
- [ ] `moveCard` usa transação Prisma para: update Card.status + Card.position + create CardStatusTransition + create AuditLog
- [ ] Rodar: PASS
- [ ] Commitar: `git add . && git commit -m "feat: card service with TDD"`

### Task 4.4 — Server Actions de cards
- [ ] Criar `src/server/actions/cards.ts` — `createCard`, `updateCard`, `archiveCard`, `moveCard`, `reorderCard`, `addCardToSprint`, `createTag`, `deleteTag`
- [ ] Cada action valida com Zod + `requirePermission` antes de chamar service
- [ ] Commitar: `git add . && git commit -m "feat: card server actions"`

### Task 4.5 — Página de backlog (UI)
- [ ] Criar `src/app/(app)/projetos/[slug]/backlog/page.tsx` — lista cards sem sprint, botão criar card, arrastar para sprint planejada
- [ ] Criar `src/components/cards/CardForm.tsx` — form com todos os campos (título, descrição, prioridade, story points, due date, tags, assignee)
- [ ] Criar `src/components/shared/PriorityBadge.tsx` — badge colorido por prioridade
- [ ] Commitar: `git add src/ && git commit -m "feat: backlog page UI"`

### Task 4.6 — Board Kanban (UI)
- [ ] Criar `src/app/(app)/projetos/[slug]/sprints/[id]/board/page.tsx` — página do board
- [ ] Criar `src/components/board/KanbanBoard.tsx` — componente com `DndContext` do @dnd-kit
- [ ] Criar `src/components/board/KanbanColumn.tsx` — coluna com `SortableContext` + lista de cards
- [ ] Criar `src/components/board/CardItem.tsx` — card draggável com `useSortable`
- [ ] `KanbanBoard` chama `moveCard` action ao detectar drop em nova coluna e `reorderCard` ao reordenar na mesma coluna
- [ ] Commitar: `git add src/ && git commit -m "feat: kanban board with drag-and-drop"`

### Task 4.7 — Modal de detalhes do card (UI)
- [ ] Criar `src/components/cards/CardDetailModal.tsx` — abre ao clicar no card, mostra todos os campos editáveis
- [ ] Campos editáveis: título, descrição (markdown), assignee (UserPicker), prioridade, story points, due date, tags (TagPicker), status
- [ ] Criar `src/components/shared/UserPicker.tsx` — select de membros do projeto
- [ ] Criar `src/components/shared/TagPicker.tsx` — multi-select de tags com criação inline
- [ ] Commitar: `git add src/ && git commit -m "feat: card detail modal"`

---

## SPRINT 5 — Colaboração
**Meta:** Comentários, checklist e anexos dentro do modal de card. Ao final: adicionar comentário, marcar checklist, fazer upload de arquivo.

### Task 5.1 — Repositórios de colaboração
- [ ] Criar `src/lib/schemas/comments.ts` — `createCommentSchema`, `updateCommentSchema`
- [ ] Criar `src/server/repositories/comments.ts` — `findByCardId`, `create`, `update`, `softDelete`
- [ ] Criar `src/server/repositories/checklists.ts` — `findByCardId`, `create`, `update`, `toggleDone`, `reorder`, `delete`
- [ ] Criar `src/server/repositories/attachments.ts` — `findByCardId`, `create`, `softDelete`, `findById`
- [ ] Commitar: `git add . && git commit -m "feat: collaboration repositories"`

### Task 5.2 — Service de comentários (TDD)
- [ ] Criar `tests/unit/services/comments.test.ts`:
  - Criar comentário grava AuditLog com action=COMMENT
  - Membro só pode editar/deletar próprio comentário
  - Admin/Scrum Master pode deletar qualquer comentário
  - Soft delete mantém body como null mas registro existe
- [ ] Rodar: FAIL
- [ ] Criar `src/server/services/comments.ts` — `createComment`, `updateComment`, `deleteComment`
- [ ] Rodar: PASS
- [ ] Commitar: `git add . && git commit -m "feat: comment service with TDD"`

### Task 5.3 — Service de checklist + anexos
- [ ] Criar `src/server/services/checklists.ts` — `createItem`, `toggleItem`, `updateItem`, `deleteItem`, `reorderItems`
- [ ] `toggleItem` preenche `completedAt` + `completedById` quando marcado, limpa quando desmarcado
- [ ] Criar `src/server/services/attachments.ts` — `createAttachment`, `deleteAttachment`, `getAttachmentPath`
- [ ] `createAttachment` valida tamanho (max 10MB por arquivo, max 50MB total por card), salva em `ATTACHMENT_STORAGE_PATH/<projectId>/<cardId>/<uuid>-<filename>`
- [ ] Commitar: `git add . && git commit -m "feat: checklist and attachment services"`

### Task 5.4 — API routes de anexos
- [ ] Criar `src/app/api/attachments/upload/route.ts` — POST, recebe multipart, chama `createAttachment`, retorna `{ id, filename, url }`
- [ ] Criar `src/app/api/attachments/[id]/route.ts` — GET, verifica permissão (isMember), serve o arquivo do disco
- [ ] Ambas as routes usam `auth()` para obter sessão e retornam 401 se não logado
- [ ] Commitar: `git add src/app/api/attachments/ && git commit -m "feat: attachment upload/download API"`

### Task 5.5 — Server Actions de colaboração
- [ ] Criar `src/server/actions/comments.ts` — `createComment`, `updateComment`, `deleteComment`
- [ ] Criar `src/server/actions/checklists.ts` — `createChecklistItem`, `toggleChecklistItem`, `updateChecklistItem`, `deleteChecklistItem`, `reorderChecklistItems`
- [ ] Commitar: `git add . && git commit -m "feat: collaboration server actions"`

### Task 5.6 — UI de colaboração no modal
- [ ] Criar `src/components/cards/CommentList.tsx` — lista de comentários com avatar, tempo relativo, botões editar/deletar
- [ ] Criar `src/components/shared/MarkdownEditor.tsx` — textarea com preview markdown (usa `react-markdown`)
- [ ] Criar `src/components/shared/MarkdownRenderer.tsx` — renderiza markdown seguro
- [ ] Criar `src/components/cards/ChecklistSection.tsx` — lista de itens com checkbox, reorder drag, add/delete
- [ ] Criar `src/components/cards/AttachmentSection.tsx` — lista de anexos, botão upload, download, delete
- [ ] Instalar: `npm install react-markdown`
- [ ] Integrar as 3 seções no `CardDetailModal` (tabs ou scroll contínuo)
- [ ] Commitar: `git add src/ && git commit -m "feat: collaboration UI (comments, checklist, attachments)"`

---

## SPRINT 6 — Notificações & Audit
**Meta:** Notificações in-app (sininho) + email para todos os eventos. Audit log navegável por projeto.

### Task 6.1 — Repositório de notificações
- [ ] Criar `src/server/repositories/notifications.ts` — `create`, `findByUserId`, `countUnread`, `markRead`, `markAllRead`
- [ ] Commitar: `git add . && git commit -m "feat: notification repository"`

### Task 6.2 — Service de notificações (TDD)
- [ ] Criar `tests/unit/services/notifications.test.ts`:
  - `notifyCardAssigned`: cria Notification para assignee, respeita `emailEnabled`
  - `notifyComment`: não notifica o próprio autor
  - `notifySprintStarted`: cria Notification para todos os membros do projeto
- [ ] Rodar: FAIL
- [ ] Criar `src/server/services/notifications.ts` — `notifyCardAssigned`, `notifyComment`, `notifyMentioned`, `notifySprintStarted`, `notifySprintEnded`, `notifyAddedToProject`, `notifyRemovedFromProject`
- [ ] Cada função cria `Notification` + envia email (se `emailEnabled`) via `sendEmail` + grava `EmailLog`
- [ ] Rodar: PASS
- [ ] Commitar: `git add . && git commit -m "feat: notification service with TDD"`

### Task 6.3 — Templates de email para notificações
- [ ] Criar `src/server/email/templates/card-assigned.tsx`
- [ ] Criar `src/server/email/templates/card-commented.tsx`
- [ ] Criar `src/server/email/templates/sprint-started.tsx`
- [ ] Criar `src/server/email/templates/added-to-project.tsx`
- [ ] Todos usam `@react-email/components` (Html, Body, Container, Text, Button, Hr)
- [ ] Commitar: `git add src/server/email/templates/ && git commit -m "feat: email templates for notifications"`

### Task 6.4 — Integrar notificações nos services
- [ ] Em `src/server/services/cards.ts`: chamar `notifyCardAssigned` quando `assigneeId` mudar
- [ ] Em `src/server/services/comments.ts`: chamar `notifyComment` ao criar comentário; chamar `notifyMentioned` para `@nome` encontrados no corpo
- [ ] Em `src/server/services/sprints.ts`: chamar `notifySprintStarted` e `notifySprintEnded`
- [ ] Em `src/server/services/invitations.ts`: chamar `notifyAddedToProject` ao aceitar convite
- [ ] Commitar: `git add src/server/services/ && git commit -m "feat: integrate notifications into services"`

### Task 6.5 — Server Actions de notificações + API
- [ ] Criar `src/server/actions/notifications.ts` — `markNotificationRead`, `markAllNotificationsRead`
- [ ] Criar `src/app/api/notifications/unread-count/route.ts` — GET, retorna `{ count: number }`
- [ ] Criar `src/app/api/notifications/route.ts` — GET paginado, retorna lista de notificações
- [ ] Commitar: `git add . && git commit -m "feat: notification actions and API routes"`

### Task 6.6 — NotificationBell (UI)
- [ ] Criar `src/components/shared/NotificationBell.tsx` — ícone sininho com badge, abre dropdown com lista
- [ ] Polling a cada 30s via `useEffect` + `setInterval` chamando `/api/notifications/unread-count`
- [ ] Clicar em notificação: marca como lida + navega ao recurso (deep link via `entityType` + `entityId`)
- [ ] Integrar no header do `(app)/layout.tsx`
- [ ] Commitar: `git add src/ && git commit -m "feat: notification bell with polling"`

### Task 6.7 — Página de atividade (audit log)
- [ ] Criar `src/app/(app)/projetos/[slug]/atividade/page.tsx` — feed cronológico
- [ ] Filtros: por entidade (card, sprint, membro), por usuário, por período
- [ ] Só acessível para ADMIN e SCRUM_MASTER (retorna 403 para MEMBER)
- [ ] Criar `src/server/repositories/audit.ts` — `findByProject` com filtros e paginação
- [ ] Commitar: `git add src/ && git commit -m "feat: audit log page"`

---

## SPRINT 7 — Configurações & Testes E2E
**Meta:** Configurações de usuário, preferências de notificação, e cobertura E2E dos fluxos críticos.

### Task 7.1 — Service de usuário (TDD)
- [ ] Criar `tests/unit/services/users.test.ts`:
  - Atualizar perfil: nome e avatar mudam, email e senha não
  - Trocar senha: hash da nova senha é diferente da antiga
  - Senha atual errada: rejeita troca
- [ ] Rodar: FAIL
- [ ] Criar `src/server/services/users.ts` — `updateProfile`, `changePassword`
- [ ] Rodar: PASS
- [ ] Commitar: `git add . && git commit -m "feat: user service with TDD"`

### Task 7.2 — Server Actions de usuário + preferências
- [ ] Criar `src/server/actions/users.ts` — `updateProfile`, `changePassword`, `updateNotificationPreference`
- [ ] `updateNotificationPreference` faz upsert em `UserNotificationPreference`
- [ ] Commitar: `git add . && git commit -m "feat: user server actions"`

### Task 7.3 — Páginas de configurações (UI)
- [ ] Criar `src/app/(app)/configuracoes/perfil/page.tsx` — form nome, avatar (upload), trocar senha
- [ ] Criar `src/app/(app)/configuracoes/notificacoes/page.tsx` — toggle por tipo de evento (só email; in-app sempre ativo)
- [ ] Commitar: `git add src/ && git commit -m "feat: user settings pages"`

### Task 7.4 — Configurar Playwright
- [ ] Rodar: `npx playwright install chromium`
- [ ] Criar `playwright.config.ts`:
```typescript
import { defineConfig } from "@playwright/test"
export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL: "http://localhost:3000", screenshot: "only-on-failure" },
  webServer: { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: true },
})
```
- [ ] Adicionar ao `package.json`: `"test:e2e": "playwright test"`
- [ ] Commitar: `git add playwright.config.ts package.json && git commit -m "chore: configure Playwright"`

### Task 7.5 — E2E: fluxo de auth
- [ ] Criar `tests/e2e/auth.test.ts`:
  - Admin faz login → é redirecionado para `/trocar-senha` → troca senha → vai para `/projetos`
  - Admin cria projeto → convida membro → membro aceita convite → membro faz login → vê projeto
  - Usuário sem login tenta acessar `/projetos` → redireciona para `/login`
  - Recuperação de senha ponta-a-ponta (mocka Resend)
- [ ] Rodar: `npm run test:e2e tests/e2e/auth.test.ts`
- [ ] Commitar: `git add tests/e2e/auth.test.ts && git commit -m "test: E2E auth flows"`

### Task 7.6 — E2E: fluxo do board
- [ ] Criar `tests/e2e/board.test.ts`:
  - Admin: criar projeto → criar sprint → criar card no backlog → iniciar sprint → board aparece → arrastar card para DOING → card aparece na coluna DOING
  - Encerrar sprint → dialog aparece → cards não-DONE voltam para backlog
  - Permissão: MEMBER tenta acessar configurações do projeto → vê 403
- [ ] Rodar: `npm run test:e2e tests/e2e/board.test.ts`
- [ ] Commitar: `git add tests/e2e/board.test.ts && git commit -m "test: E2E board flow"`

### Task 7.7 — E2E: upload de anexo
- [ ] Criar `tests/e2e/attachments.test.ts`:
  - Criar card → abrir modal → fazer upload de arquivo PNG → ver na lista de anexos → fazer download → verificar conteúdo → deletar → verificar que sumiu
- [ ] Rodar: `npm run test:e2e tests/e2e/attachments.test.ts`
- [ ] Commitar: `git add tests/e2e/attachments.test.ts && git commit -m "test: E2E attachment flow"`

### Task 7.8 — Polimento final
- [ ] Verificar que `npm run build` passa sem erros de TypeScript
- [ ] Verificar que `npm run test:run` (unit) passa todos os testes
- [ ] Verificar que `npm run test:e2e` passa todos os E2E
- [ ] Criar `README.md` com: pré-requisitos, como rodar localmente, variáveis de ambiente, como fazer seed
- [ ] Criar `railway.toml` para deploy no Railway:
```toml
[build]
builder = "nixpacks"
buildCommand = "npm run build && npx prisma migrate deploy"

[deploy]
startCommand = "npm start"
healthcheckPath = "/api/auth/session"
```
- [ ] Commitar: `git add . && git commit -m "chore: finalize build config and README"`

---

## Resumo das Sprints

| Sprint | Tarefas | Entrega |
|--------|---------|---------|
| 1 — Foundation | 1.1 a 1.11 | Login, auth, permissões, banco |
| 2 — Projetos & Membros | 2.1 a 2.8 | CRUD projetos, convites, membros |
| 3 — Sprints | 3.1 a 3.4 | CRUD sprints, iniciar, encerrar |
| 4 — Cards & Board | 4.1 a 4.7 | Backlog, board kanban, drag-and-drop, modal |
| 5 — Colaboração | 5.1 a 5.6 | Comentários, checklist, anexos |
| 6 — Notificações & Audit | 6.1 a 6.7 | In-app + email, audit log |
| 7 — Configurações & E2E | 7.1 a 7.8 | Settings, testes E2E, deploy |

**Total:** 44 tarefas, ~7 sprints, ~25 dias de trabalho estimado
