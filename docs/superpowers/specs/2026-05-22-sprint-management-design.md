# SQLTech Gestão — Sistema de Gerenciamento de Sprint

**Data:** 2026-05-22
**Status:** Spec aprovado para implementação da Fase 1
**Autor:** Thiago Lessa (thiago.lessa08@gmail.com)

---

## 1. Visão geral

Aplicação web multi-usuário para gerenciamento de sprints estilo Scrum/Kanban. Permite cadastrar projetos, convidar pessoas, planejar sprints, criar cards (atividades) e movimentá-los em um board com quatro colunas (Backlog, Doing, Validação, Finalizada).

### Objetivos do MVP (Fase 1)

Entregar o sistema operacional completo, incluindo todas as funcionalidades de cadastro, colaboração e auditoria, sem dashboards analíticos. O modelo de dados é desenhado desde o início para suportar a camada analítica futura (Fase 2).

### Fora de escopo (Fase 2 — não será implementado agora)

- Burndown chart
- Velocity histórica
- Workload por pessoa
- Dashboards e relatórios analíticos
- Tela agregada "minhas atividades" (cards em todos os projetos)

As tabelas e os dados necessários para essas funcionalidades **são criados na Fase 1** (notadamente `CardStatusTransition` e `SprintCardSnapshot`), garantindo que a Fase 2 seja apenas a camada de leitura/visualização.

---

## 2. Stack técnico

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15 (App Router) em TypeScript |
| ORM | Prisma |
| Banco | PostgreSQL |
| Autenticação | Auth.js (NextAuth v5) — provider Credentials |
| Hash de senha | bcrypt (cost 12) |
| Validação | Zod (cliente e servidor) |
| UI | shadcn/ui + Tailwind CSS |
| Drag-and-drop | @dnd-kit |
| Email | Resend + React Email |
| Storage de anexos | Railway Volume (filesystem persistente) |
| Notificações in-app | Polling HTTP a cada 30 s |
| Testes unit/integration | Vitest |
| Testes E2E | Playwright |
| Banco de teste | Testcontainers (Postgres em Docker) |
| Deploy | Railway (app + Postgres + Volume) |

---

## 3. Arquitetura em camadas

```
UI (React Server Components + Client Components)
  ↓
Server Actions / API Routes (validam com Zod, checam permissão)
  ↓
Services (lógica de negócio; escrevem AuditLog na mesma transação)
  ↓
Repositories (queries Prisma encapsuladas por entidade)
  ↓
PostgreSQL
```

**Regras:**

- Server Components para leitura/listagem; Server Actions para mutações; API Routes apenas para upload de anexos, download autenticado e webhooks futuros.
- `src/server/` nunca é importado de Client Components.
- Toda mutação que altera estado de domínio chama `requirePermission(userId, projectId, action)` antes de executar.
- Toda mutação relevante grava em `AuditLog` dentro da mesma transação Prisma.

---

## 4. Modelo de dados

Tipos abreviados. Detalhes finos (defaults, índices, on-delete) ficam no `schema.prisma` durante a implementação.

### 4.1 Identidade

**`User`**
- `id` (uuid, pk)
- `name` (string)
- `email` (string, unique)
- `password_hash` (string)
- `avatar_url` (string, nullable)
- `is_system_admin` (boolean, default false) — único `true` no MVP é o bootstrap admin
- `must_change_password` (boolean, default false) — true para o bootstrap admin no primeiro login
- `created_at`, `updated_at`, `deleted_at` (soft delete)

**`ProjectInvitation`**
- `id`, `project_id`, `email`, `role` (ADMIN | SCRUM_MASTER | MEMBER)
- `invited_by_id`, `token` (unique, criptograficamente aleatório), `expires_at` (default 7 dias)
- `accepted_at` (nullable), `created_at`

**`PasswordResetToken`**
- `id`, `user_id`, `token` (unique), `expires_at` (default 1 h), `used_at` (nullable), `created_at`

### 4.2 Projeto e papéis

**`Project`**
- `id`, `name`, `slug` (unique), `description` (text)
- `created_by_id`, `created_at`, `updated_at`, `archived_at` (soft archive)

**`ProjectMember`**
- `id`, `project_id`, `user_id`, `role` (ADMIN | SCRUM_MASTER | MEMBER)
- `joined_at`, `removed_at` (nullable, soft remove)
- Unique compound: `(project_id, user_id)` quando `removed_at IS NULL`.

### 4.3 Sprint

**`Sprint`**
- `id`, `project_id`, `name`, `goal` (text)
- `planned_start_date`, `planned_end_date` (date)
- `started_at`, `ended_at` (timestamp, nullable — preenchidos na ação real)
- `status` (PLANNED | ACTIVE | COMPLETED | CANCELLED)
- `created_at`, `updated_at`

**Regra:** no máximo uma `Sprint` por projeto com `status = ACTIVE`.

### 4.4 Cards

**`Card`**
- `id`, `project_id`, `sprint_id` (nullable — null = backlog do projeto)
- `title` (string), `description` (text, markdown)
- `assignee_id` (nullable — um único responsável no MVP)
- `priority` (LOW | MEDIUM | HIGH | CRITICAL)
- `status` (BACKLOG | DOING | VALIDATION | DONE)
- `story_points` (int, nullable)
- `due_date` (date, nullable)
- `position` (int) — ordem dentro da coluna
- `created_by_id`, `created_at`, `updated_at`, `archived_at` (soft archive)

**`Tag`**
- `id`, `project_id`, `name`, `color` (hex)
- Unique compound: `(project_id, name)`

**`CardTag`**
- `card_id`, `tag_id` (chave composta)

### 4.5 Colaboração no card

**`Comment`**
- `id`, `card_id`, `author_id`, `body` (text, markdown)
- `created_at`, `updated_at`, `deleted_at` (soft delete)

**`ChecklistItem`**
- `id`, `card_id`, `text`, `is_done` (boolean), `position` (int)
- `created_at`, `completed_at` (nullable), `completed_by_id` (nullable)

**`Attachment`**
- `id`, `card_id`, `uploaded_by_id`
- `filename`, `mime_type`, `size_bytes`, `storage_path`
- `uploaded_at`, `deleted_at` (soft delete)
- Limites: 10 MB por arquivo, 50 MB total por card.

### 4.6 Tabelas para analytics futuro (Fase 2)

**`CardStatusTransition`** — registra cada movimentação de coluna.
- `id`, `card_id`, `from_status` (nullable na criação), `to_status`
- `sprint_id` (nullable — snapshot do sprint no momento da transição)
- `moved_by_id`, `moved_at`

**`SprintCardSnapshot`** — snapshot diário do estado da sprint, gerado por job cron na Fase 2.
- `id`, `sprint_id`, `snapshot_date` (date), `card_id`, `status`, `story_points`
- Unique compound: `(sprint_id, snapshot_date, card_id)`
- **Na Fase 1: tabela existe mas o job não roda.** Na Fase 2, ativamos o job; cobre só os dias dali em diante.

### 4.7 Auditoria

**`AuditLog`**
- `id`, `project_id`, `actor_id`, `entity_type` (string), `entity_id` (string)
- `action` (CREATE | UPDATE | DELETE | MOVE | ASSIGN | COMMENT | INVITE | JOIN | REMOVE_MEMBER | START_SPRINT | END_SPRINT)
- `changes` (jsonb com `before` e `after` dos campos relevantes)
- `created_at`

### 4.8 Notificações

**`Notification`** — in-app.
- `id`, `recipient_id`, `type` (CARD_ASSIGNED | CARD_COMMENTED | MENTIONED | SPRINT_STARTED | SPRINT_ENDED | ADDED_TO_PROJECT | REMOVED_FROM_PROJECT)
- `title`, `body` (text)
- `entity_type`, `entity_id` (para deep link)
- `read_at` (nullable), `created_at`

**`EmailLog`**
- `id`, `recipient_id`, `notification_id` (nullable), `to_email`
- `subject`, `status` (PENDING | SENT | FAILED), `error` (text, nullable)
- `sent_at` (nullable), `created_at`

**`UserNotificationPreference`**
- `id`, `user_id`, `notification_type`, `email_enabled` (boolean, default true)
- Unique compound: `(user_id, notification_type)`

### 4.9 Princípios do modelo

1. **Soft delete/archive** em User, Project, Card, Comment, Attachment, ProjectMember — analytics não pode perder dados históricos.
2. **`CardStatusTransition` é fonte da verdade** para burndown e cycle time.
3. **Sprint guarda tempos planejados e reais separados** — base de velocity precisa.
4. **`AuditLog` com `jsonb`** dá flexibilidade sem inflar o schema.
5. **`is_system_admin` no User** separa permissões do sistema (criar projetos) das permissões por projeto (RBAC).

---

## 5. Autenticação e autorização

### 5.1 Autenticação

- Auth.js (NextAuth v5) com `Credentials` provider.
- Senha hasheada com bcrypt (cost 12).
- Sessão em JWT, cookie httpOnly, sameSite=lax, secure em produção.
- Duração: 30 dias com sliding renewal.

### 5.2 Cadastro fechado

- **Não existe rota pública de cadastro.** Apenas `/convite?token=...` cria contas.
- **Bootstrap admin:** seed inicial lê `ADMIN_BOOTSTRAP_EMAIL` e `ADMIN_BOOTSTRAP_PASSWORD` do `.env`. Se não houver nenhum usuário no banco, cria User com `is_system_admin=true` e `must_change_password=true`. No primeiro login, é redirecionado para trocar a senha antes de qualquer outra ação.

### 5.3 Criação de projeto

- Apenas usuários com `is_system_admin = true` acessam `/projetos/novo` e a Server Action correspondente.
- Quem cria o projeto vira `ProjectMember` com role `ADMIN` automaticamente.

### 5.4 Convite para projeto

- Project Admin ou Scrum Master envia convite por email do projeto.
- Se o email **já é usuário** ativo → cria `ProjectMember` diretamente, envia notificação.
- Se o email **não é usuário** → cria `ProjectInvitation` e envia email com link `/convite?token=...`. Aceitar abre tela de cadastro pré-preenchida (define nome e senha), cria User e ProjectMember na mesma transação.

### 5.5 Recuperação de senha

- Tela `/esqueci-senha` recebe email, cria `PasswordResetToken` (expira em 1 h), envia link `/redefinir-senha?token=...`.
- Token é uso único (`used_at`).

### 5.6 RBAC (matriz de permissões por papel — por projeto)

| Ação | Admin | Scrum Master | Member |
|---|---|---|---|
| Editar projeto, arquivar | ✅ | ❌ | ❌ |
| Gerenciar membros (convidar/remover/mudar role) | ✅ | ❌ | ❌ |
| Gerenciar tags do projeto | ✅ | ✅ | ❌ |
| Criar/editar/encerrar sprint | ✅ | ✅ | ❌ |
| Criar/editar/arquivar card | ✅ | ✅ | ✅ |
| Mover card (drag-and-drop) | ✅ | ✅ | ✅ |
| Atribuir card a alguém | ✅ | ✅ | ✅ apenas pra si mesmo |
| Comentar | ✅ | ✅ | ✅ |
| Editar/deletar próprio comentário | ✅ | ✅ | ✅ |
| Deletar comentário de outro | ✅ | ✅ | ❌ |
| Ver audit log | ✅ | ✅ | ❌ |

**Regra global:** quem não é membro do projeto **recebe 404** (não 403) ao acessar rotas do projeto, para não vazar a existência do projeto.

### 5.7 Aplicação

- `src/server/permissions.ts` exporta `requirePermission(userId, projectId, action)`. Lança exceção tipada (`ForbiddenError` | `NotMemberError`) que vira 403/404 nos handlers.
- Toda Server Action começa com `await requirePermission(...)`.
- Middleware `src/middleware.ts` redireciona usuários sem sessão para `/login` em qualquer rota do grupo `(app)`.

---

## 6. Funcionalidades e fluxos por módulo

### 6.1 Auth

- Rotas: `/login`, `/esqueci-senha`, `/redefinir-senha`, `/convite`.
- Após login → `/projetos`.
- Logout invalida o cookie.

### 6.2 Projetos

- `/projetos` — lista projetos onde sou membro (não-arquivados por padrão).
- `/projetos/novo` — **apenas System Admin**. Form: nome, descrição. Slug é gerado a partir do nome.
- `/projetos/[slug]` — overview: sprint ativa em destaque, últimas atividades do audit, contagens rápidas.
- `/projetos/[slug]/configuracoes` — editar nome/descrição, arquivar, gerenciar tags. **Project Admin**.
- `/projetos/[slug]/pessoas` — listar membros, convidar, mudar role, remover. **Project Admin**.

### 6.3 Sprints

- `/projetos/[slug]/sprints` — listar (planejadas, ativa, concluídas).
- `/projetos/[slug]/sprints/nova` — criar. **Admin ou Scrum Master**. Campos: nome, meta, `planned_start_date`, `planned_end_date`.
- `/projetos/[slug]/sprints/[id]` — detalhes da sprint + lista de cards.
- **Iniciar sprint:** marca `started_at = now()`, status `ACTIVE`. Valida que não há outra `ACTIVE`.
- **Encerrar sprint:** marca `ended_at = now()`, status `COMPLETED`. Cards não-DONE: usuário escolhe no diálogo se vão para `Backlog do projeto` (sprint_id = null) ou para outra sprint planejada.

### 6.4 Backlog e Board

- `/projetos/[slug]/backlog` — cards sem sprint (`sprint_id IS NULL`). Permite criar, editar, arrastar para sprint planejada.
- `/projetos/[slug]/sprints/[id]/board` — kanban com colunas `Backlog | Doing | Validação | Finalizada`.
- **Estado inicial de qualquer card recém-criado:** `status = BACKLOG`, `position` = último da coluna.
- **Mover card do backlog do projeto para sprint** (arrastar entre listas): atualiza apenas `sprint_id`. `status` permanece `BACKLOG` (entra na coluna Backlog do board da sprint). Não gera `CardStatusTransition`, apenas `AuditLog` com action `UPDATE`.
- **Drag-and-drop dentro do board** (entre colunas ou reordenando): recalcula `position` dos cards afetados e, se mudou de coluna, atualiza `status`.
- Toda movimentação **de coluna** (mudança de `status`):
  1. Atualiza `Card.status` + `Card.position`.
  2. Cria `CardStatusTransition` (`from_status`, `to_status`, `moved_at`, `sprint_id`).
  3. Cria `AuditLog` com action `MOVE`.
  4. Tudo em uma transação Prisma.
- **Reordenação dentro da mesma coluna:** atualiza só `position`. Não gera `CardStatusTransition`, gera `AuditLog` com action `UPDATE` apenas se a posição muda significativamente (decidido na implementação para evitar ruído no audit).

### 6.5 Card — modal de detalhes

Abre ao clicar no card no board ou backlog. Mostra todos os campos editáveis (com permissão), comentários, checklist, anexos, mini-histórico do card (filtro do audit log).

- **Comentários:** markdown. Edita/deleta próprio. Admin/Scrum Master deleta de qualquer um. Soft delete.
- **Checklist:** adicionar/marcar/desmarcar/remover/reordenar. Marcar grava `completed_at` e `completed_by_id`.
- **Anexos:** upload via API Route `/api/attachments/upload` (multipart). Download via `/api/attachments/[id]` (checa permissão). Delete: autor ou Project Admin. Arquivos em `/data/attachments/<project_id>/<card_id>/<uuid>-<filename>` no Railway Volume.

### 6.6 Notificações

**Eventos:**

| Evento | Trigger |
|---|---|
| CARD_ASSIGNED | Card atribuído (ou reatribuído) a alguém |
| CARD_COMMENTED | Comentário em card onde você é autor ou assignee |
| MENTIONED | `@nome` em comentário ou descrição (parser simples) |
| SPRINT_STARTED | Sprint iniciada no seu projeto |
| SPRINT_ENDED | Sprint encerrada no seu projeto |
| ADDED_TO_PROJECT | Você foi adicionado a um projeto |
| REMOVED_FROM_PROJECT | Você foi removido de um projeto |

**In-app:**
- Sininho no topo com badge de não-lidas.
- Polling a cada 30 s via fetch para `/api/notifications/unread-count` (leve) e endpoint paginado ao abrir o dropdown.
- Clicar marca como lida e navega ao recurso.

**Email:**
- Disparado para os mesmos eventos, respeitando `UserNotificationPreference.email_enabled`.
- Enviado via Resend. Template em React Email.
- Cada envio cria `EmailLog` com status e erro (para debug).

### 6.7 Audit log

- `/projetos/[slug]/atividade` — feed cronológico. **Admin ou Scrum Master**.
- Filtros: por entidade (cards, sprints, membros), por usuário, por período.

### 6.8 Configurações do usuário

- `/configuracoes/perfil` — nome, avatar, trocar senha.
- `/configuracoes/notificacoes` — toggles por tipo de evento (apenas email; in-app sempre ativo).

---

## 7. Estrutura do repositório

```
sqltech-gestao/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts                    # bootstrap admin via env vars
├── src/
│   ├── app/
│   │   ├── (auth)/                # login, esqueci-senha, redefinir-senha, convite
│   │   ├── (app)/                 # rotas autenticadas (middleware checa sessão)
│   │   │   ├── projetos/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── novo/page.tsx
│   │   │   │   └── [slug]/
│   │   │   │       ├── page.tsx
│   │   │   │       ├── backlog/
│   │   │   │       ├── sprints/
│   │   │   │       ├── pessoas/
│   │   │   │       ├── configuracoes/
│   │   │   │       └── atividade/
│   │   │   └── configuracoes/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/
│   │   │   ├── attachments/upload/
│   │   │   ├── attachments/[id]/
│   │   │   └── notifications/
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                    # shadcn/ui
│   │   ├── board/                 # KanbanBoard, Column, CardItem (dnd-kit)
│   │   ├── cards/                 # CardDetailModal, CardForm, CommentList...
│   │   ├── sprints/
│   │   └── shared/                # Avatar, UserPicker, TagPicker, MarkdownEditor, NotificationBell
│   ├── server/
│   │   ├── auth/
│   │   ├── db.ts                  # Prisma client singleton
│   │   ├── services/              # projects, sprints, cards, comments, attachments, notifications, audit
│   │   ├── repositories/
│   │   ├── permissions.ts
│   │   ├── email/                 # Resend client + templates React Email
│   │   └── actions/               # Server Actions por módulo
│   ├── lib/
│   │   ├── schemas/               # schemas Zod por entidade
│   │   └── utils.ts
│   └── middleware.ts
├── tests/
│   ├── unit/                      # Vitest
│   └── e2e/                       # Playwright
├── public/
├── docs/
│   └── superpowers/specs/
├── .env.example
├── docker-compose.yml             # postgres local para dev
├── package.json
├── tsconfig.json
└── README.md
```

**Princípios:**

1. Separação cliente/servidor — `src/server/` nunca importado de Client Components.
2. Repositories isolam Prisma — services não fazem queries diretas.
3. `permissions.ts` é o único lugar com regras de RBAC.
4. Schemas Zod compartilhados entre client e server.
5. Audit como side-effect dos services, dentro da mesma transação.

---

## 8. Estratégia de testes

### 8.1 Pirâmide

**Unit (Vitest):**
- Services (createCard, moveCard, closeSprint, acceptInvite, etc.).
- `permissions.ts` — tabela de casos cobrindo a matriz da Seção 5.6.
- Schemas Zod — entradas válidas e inválidas.
- Funções puras (cálculo de `position` no drag, parser de menção `@nome`).

**Integration (Vitest + Postgres real via Testcontainers):**
- Repositories Prisma.
- Fluxos com múltiplas tabelas: criar card com tags, mover card (transition + audit), encerrar sprint (movimentação de cards não-DONE), aceitar convite (User + ProjectMember + Invitation).
- Cada teste roda em transação com rollback.

**E2E (Playwright):**
- Login → criar projeto (system admin) → convidar membro → membro aceita → cria sprint → cria cards → inicia sprint → arrasta card pelo board → encerra sprint.
- Recuperação de senha ponta-a-ponta (mock do email).
- Upload + download + delete de anexo.
- Permissão negada: Member em rota de Admin → 403.

### 8.2 TDD

- **Obrigatório:** `permissions.ts`, services de mutação, validações Zod críticas.
- **Teste-depois aceitável:** componentes puramente visuais.
- **Cobertura alvo:** services + permissions ≥ 90 %.

### 8.3 CI

- GitHub Actions a cada PR: lint + typecheck + unit + integration + e2e + build Next.js.

---

## 9. Decisões em aberto para a fase de implementação

Itens que serão decididos no plano de implementação ou na codificação:

1. **Versões exatas das libs** (Next.js 15.x, Prisma 6.x, etc.) — usar a mais recente estável no momento da inicialização.
2. **Editor de markdown** — provavelmente `react-markdown` + `react-textarea-autosize`, decidido na implementação dos comentários.
3. **Parser de menção `@nome`** — implementação simples por regex no MVP; biblioteca específica só se necessário.
4. **Layout exato das telas** — shadcn/ui dita o estilo base, ajustes finos na implementação.
5. **Comportamento ao remover membro do projeto:** cards atribuídos a ele permanecem com `assignee_id` original (não-órfão no banco), mas no UI o card mostra aviso de "responsável não é mais membro". Reatribuir é manual. Detalhe de UX decidido na implementação.

---

## 10. Roadmap pós-MVP (Fase 2 — não implementar agora)

1. **Job cron diário** que popula `SprintCardSnapshot` para todas as sprints ativas.
2. **Burndown chart** por sprint (lê `SprintCardSnapshot`).
3. **Velocity histórica** por projeto (lê `Sprint.ended_at` + soma de `story_points` de cards DONE).
4. **Workload por pessoa** na sprint atual (lê `Card.assignee_id` + `story_points` agrupado).
5. **Cycle time por coluna** (lê `CardStatusTransition`).
6. **Dashboard agregado** consolidando os gráficos.
7. **Tela "minhas atividades"** agregando cards de todos os projetos onde sou assignee.
8. **SSE** substituindo polling de notificações.

Todas as tabelas necessárias para esses recursos já existem no MVP. A Fase 2 é primariamente camada de leitura e visualização.
