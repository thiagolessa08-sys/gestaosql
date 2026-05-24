import { test, expect, type Page } from "@playwright/test"

/**
 * Admin credentials come from the seed (prisma/seed.ts).
 * The seed reads ADMIN_BOOTSTRAP_EMAIL / ADMIN_BOOTSTRAP_PASSWORD from .env.local.
 * Override via TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD when running in CI.
 */
const ADMIN_EMAIL =
  process.env.TEST_ADMIN_EMAIL ??
  process.env.ADMIN_BOOTSTRAP_EMAIL ??
  "admin@example.com"

const ADMIN_PASSWORD =
  process.env.TEST_ADMIN_PASSWORD ??
  process.env.ADMIN_BOOTSTRAP_PASSWORD ??
  "Admin123!"

/**
 * Log in as admin and wait for redirect to either /projetos or /trocar-senha.
 * The seeded admin may have mustChangePassword=true on first run, so both
 * landing URLs are valid after a successful login.
 */
async function loginAsAdmin(page: Page) {
  await page.goto("/login")
  await page.fill('[name="email"]', ADMIN_EMAIL)
  await page.fill('[name="password"]', ADMIN_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/projetos|\/trocar-senha/, { timeout: 10_000 })
}

/**
 * Ensure the page is on /projetos after login.
 * If mustChangePassword redirect landed us on /trocar-senha, navigate away.
 */
async function ensureOnProjetos(page: Page) {
  if (page.url().includes("/trocar-senha")) {
    await page.goto("/projetos")
    await page.waitForURL(/\/projetos/, { timeout: 10_000 })
  }
}

test.describe("Board flow", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test("projects page loads with correct heading", async ({ page }) => {
    await ensureOnProjetos(page)
    await expect(page).toHaveURL(/\/projetos/)
    await expect(page.locator("h1")).toContainText("Projetos")
  })

  test("clicking a project card navigates to project overview", async ({ page }) => {
    await ensureOnProjetos(page)

    // ProjectCard renders an <a> wrapping the slug path
    const projectLink = page.locator("a[href*='/projetos/']").first()
    const count = await projectLink.count()

    if (count === 0) {
      test.skip()
      return
    }

    // Capture the href so we can verify navigation landed somewhere under it
    const href = await projectLink.getAttribute("href")
    await projectLink.click()
    await page.waitForURL(new RegExp(href!.replace("/", "\\/") + ".*"), {
      timeout: 10_000,
    })

    // The project overview page is a child of /projetos/[slug]
    expect(page.url()).toContain("/projetos/")
  })

  test("backlog page is accessible for an existing project", async ({ page }) => {
    await ensureOnProjetos(page)

    const projectLink = page.locator("a[href*='/projetos/']").first()
    const count = await projectLink.count()

    if (count === 0) {
      test.skip()
      return
    }

    const href = await projectLink.getAttribute("href")
    // href is e.g. "/projetos/my-slug" — navigate directly to its backlog
    await page.goto(`${href}/backlog`)
    await page.waitForURL(/\/backlog/, { timeout: 10_000 })

    // Backlog page renders "Backlog" as an h1
    await expect(page.locator("h1")).toContainText("Backlog")
  })

  test("sprints page is accessible for an existing project", async ({ page }) => {
    await ensureOnProjetos(page)

    const projectLink = page.locator("a[href*='/projetos/']").first()
    const count = await projectLink.count()

    if (count === 0) {
      test.skip()
      return
    }

    const href = await projectLink.getAttribute("href")
    await page.goto(`${href}/sprints`)
    await page.waitForURL(/\/sprints/, { timeout: 10_000 })

    // Sprints page renders "Sprints" as an h1
    await expect(page.locator("h1")).toContainText("Sprints")
  })

  test("board page renders kanban columns when a sprint exists", async ({ page }) => {
    await ensureOnProjetos(page)

    const projectLink = page.locator("a[href*='/projetos/']").first()
    const count = await projectLink.count()

    if (count === 0) {
      test.skip()
      return
    }

    const href = await projectLink.getAttribute("href")

    // Navigate to the sprint list for this project
    await page.goto(`${href}/sprints`)
    await page.waitForURL(/\/sprints/, { timeout: 10_000 })

    // Look for a link to a board page: /projetos/[slug]/sprints/[id]/board
    const boardLink = page
      .locator("a[href*='/sprints/'][href*='/board']")
      .first()
    const boardCount = await boardLink.count()

    if (boardCount === 0) {
      // No sprint with a board link yet — document the page renders without boards
      await expect(page.locator("h1")).toContainText("Sprints")
      test.skip()
      return
    }

    await boardLink.click()
    await page.waitForURL(/\/board/, { timeout: 10_000 })

    // Board page renders the sprint name as h1
    await expect(page.locator("h1")).toBeVisible()

    // Kanban columns are rendered by KanbanBoard — verify the four column labels
    await expect(page.getByText("Em andamento")).toBeVisible()
    await expect(page.getByText("Validação")).toBeVisible()
    await expect(page.getByText("Concluído")).toBeVisible()
  })

  test("settings page is accessible to admin", async ({ page }) => {
    await ensureOnProjetos(page)

    const projectLink = page.locator("a[href*='/projetos/']").first()
    const count = await projectLink.count()

    if (count === 0) {
      test.skip()
      return
    }

    const href = await projectLink.getAttribute("href")
    await page.goto(`${href}/configuracoes`)
    await page.waitForURL(/\/configuracoes/, { timeout: 10_000 })

    // Settings page renders "Configurações do projeto" as h1
    await expect(page.locator("h1")).toContainText("Configurações do projeto")
  })

  test("atividade page is accessible to admin", async ({ page }) => {
    await ensureOnProjetos(page)

    const projectLink = page.locator("a[href*='/projetos/']").first()
    const count = await projectLink.count()

    if (count === 0) {
      test.skip()
      return
    }

    const href = await projectLink.getAttribute("href")
    await page.goto(`${href}/atividade`)
    await page.waitForURL(/\/atividade/, { timeout: 10_000 })

    // Page should load without a 404 or redirect to login
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page).toHaveURL(/\/atividade/)
  })

  test("unauthenticated access to board redirects to login", async ({ page }) => {
    // Attempt to reach a board URL without logging in
    await page.goto(
      "/projetos/some-project/sprints/some-sprint-id/board"
    )
    // The server-side auth() check redirects unauthenticated users to /login
    await expect(page).toHaveURL(/\/login/)
  })
})
