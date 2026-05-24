# SQLTech Gestão

Sprint management system built with Next.js 15, Prisma, Auth.js v5, and shadcn/ui.

## Prerequisites

- Node.js 20+
- PostgreSQL 16+ (or Docker)
- A [Resend](https://resend.com) account for email

## Getting started

### 1. Clone and install

```bash
git clone <repo-url>
cd sqltech-gestao
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Random secret (run: `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | App URL (e.g. `http://localhost:3000`) |
| `RESEND_API_KEY` | Resend API key |
| `RESEND_FROM` | Sender address (e.g. `SQLTech Gestão <noreply@yourdomain.com>`) |
| `ADMIN_BOOTSTRAP_EMAIL` | Email for the initial admin user |
| `ADMIN_BOOTSTRAP_PASSWORD` | Password for the initial admin user |
| `ATTACHMENT_STORAGE_PATH` | Local directory for file uploads |

### 3. Run the database

```bash
# With Docker:
docker compose up -d

# Or use an existing PostgreSQL instance
```

### 4. Run migrations and seed

```bash
npx prisma migrate deploy
npx prisma db seed
```

### 5. Start development

```bash
npm run dev
```

The app is available at [http://localhost:3000](http://localhost:3000).

Log in with the `ADMIN_BOOTSTRAP_EMAIL` and `ADMIN_BOOTSTRAP_PASSWORD` you configured.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run test` | Run unit tests in watch mode (Vitest) |
| `npm run test:run` | Run unit tests once (Vitest) |
| `npm run test:e2e` | Run E2E tests (Playwright) |
| `npm run db:seed` | Seed the database |

## Tech stack

- **Framework:** Next.js 15 (App Router)
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** Auth.js v5 (Credentials provider)
- **UI:** shadcn/ui + Tailwind CSS v4
- **Email:** Resend + React Email
- **Drag & drop:** @dnd-kit
- **Tests:** Vitest (unit) + Playwright (E2E)

## Deployment (Railway)

1. Create a new Railway project
2. Add a PostgreSQL service
3. Set all environment variables from the table above
4. Deploy — Railway auto-detects `railway.toml` and runs migrations on build
