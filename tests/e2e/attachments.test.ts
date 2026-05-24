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
 * Log in as admin via the login form and wait for redirect.
 * The seeded admin may have mustChangePassword=true on first run — both
 * /projetos and /trocar-senha are valid post-login URLs.
 */
async function loginAsAdmin(page: Page) {
  await page.goto("/login")
  await page.fill('[name="email"]', ADMIN_EMAIL)
  await page.fill('[name="password"]', ADMIN_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/projetos|\/trocar-senha/, { timeout: 10_000 })
}

async function ensureOnProjetos(page: Page) {
  if (page.url().includes("/trocar-senha")) {
    await page.goto("/projetos")
    await page.waitForURL(/\/projetos/, { timeout: 10_000 })
  }
}

test.describe("Attachment flow", () => {
  // ---------------------------------------------------------------------------
  // API-level tests (no browser needed, use request fixture)
  // ---------------------------------------------------------------------------

  test("upload API returns 401 for unauthenticated requests", async ({
    request,
  }) => {
    // POST /api/attachments/upload without a session cookie
    // The route calls auth() first — unauthenticated callers get 401.
    const response = await request.post("/api/attachments/upload", {
      multipart: {
        file: {
          name: "test.txt",
          mimeType: "text/plain",
          buffer: Buffer.from("hello world"),
        },
        cardId: "non-existent-card",
      },
    })
    expect(response.status()).toBe(401)

    const body = await response.json()
    // The route responds with { error: "Não autenticado" }
    expect(body).toHaveProperty("error")
  })

  test("download API returns 401 for unauthenticated requests", async ({
    request,
  }) => {
    // GET /api/attachments/[id] without a session cookie
    const response = await request.get("/api/attachments/fake-id-123")
    // Auth check fires before the attachment lookup
    expect(response.status()).toBe(401)

    const body = await response.json()
    expect(body).toHaveProperty("error")
  })

  test("delete API returns 401 for unauthenticated requests", async ({
    request,
  }) => {
    // DELETE /api/attachments/[id] without a session cookie
    const response = await request.delete("/api/attachments/fake-id-123")
    expect(response.status()).toBe(401)

    const body = await response.json()
    expect(body).toHaveProperty("error")
  })

  // ---------------------------------------------------------------------------
  // Browser-level tests
  // ---------------------------------------------------------------------------

  test("projects page loads after login (smoke test for attachment context)", async ({
    page,
  }) => {
    await loginAsAdmin(page)
    await ensureOnProjetos(page)

    // The attachment UI lives inside the CardDetailModal which opens from the
    // board. Verify the base projects page loads correctly as a foundation.
    await expect(page.locator("h1")).toContainText("Projetos")
  })

  test("board page renders and card click opens detail modal", async ({
    page,
  }) => {
    await loginAsAdmin(page)
    await ensureOnProjetos(page)

    // Find a project link
    const projectLink = page.locator("a[href*='/projetos/']").first()
    if ((await projectLink.count()) === 0) {
      test.skip()
      return
    }

    const href = await projectLink.getAttribute("href")

    // Navigate to sprints and look for a board link
    await page.goto(`${href}/sprints`)
    await page.waitForURL(/\/sprints/, { timeout: 10_000 })

    const boardLink = page
      .locator("a[href*='/sprints/'][href*='/board']")
      .first()

    if ((await boardLink.count()) === 0) {
      // No active sprint with a board yet
      test.skip()
      return
    }

    await boardLink.click()
    await page.waitForURL(/\/board/, { timeout: 10_000 })

    // Look for a card on the board
    const card = page
      .locator(
        ".bg-card.border.rounded-md.p-3.cursor-grab"
      )
      .first()

    if ((await card.count()) === 0) {
      // Board exists but has no cards yet — modal cannot be opened
      test.skip()
      return
    }

    // Click the card to open the CardDetailModal
    await card.click()

    // The modal should become visible; it is rendered by CardDetailModal which
    // uses a Dialog (shadcn/ui) — the dialog root element gets role="dialog"
    await expect(page.locator('[role="dialog"]')).toBeVisible({
      timeout: 5_000,
    })
  })

  test("card detail modal contains attachment section", async ({ page }) => {
    await loginAsAdmin(page)
    await ensureOnProjetos(page)

    const projectLink = page.locator("a[href*='/projetos/']").first()
    if ((await projectLink.count()) === 0) {
      test.skip()
      return
    }

    const href = await projectLink.getAttribute("href")

    await page.goto(`${href}/sprints`)
    await page.waitForURL(/\/sprints/, { timeout: 10_000 })

    const boardLink = page
      .locator("a[href*='/sprints/'][href*='/board']")
      .first()

    if ((await boardLink.count()) === 0) {
      test.skip()
      return
    }

    await boardLink.click()
    await page.waitForURL(/\/board/, { timeout: 10_000 })

    const card = page
      .locator(
        ".bg-card.border.rounded-md.p-3.cursor-grab"
      )
      .first()

    if ((await card.count()) === 0) {
      test.skip()
      return
    }

    await card.click()

    // Wait for the modal to open
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    // The CardDetailModal includes an attachment section (AttachmentSection
    // component or a heading/label containing "Anexo"). Look for any text
    // that indicates the attachment area is rendered.
    await expect(
      dialog.getByText(/anexo/i)
    ).toBeVisible({ timeout: 5_000 })
  })
})
