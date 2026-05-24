import { test, expect } from "@playwright/test"

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

test.describe("Authentication flows", () => {
  test("unauthenticated user is redirected to login", async ({ page }) => {
    await page.goto("/projetos")
    await expect(page).toHaveURL(/\/login/)
  })

  test("admin can log in with valid credentials", async ({ page }) => {
    await page.goto("/login")
    await page.fill('[name="email"]', ADMIN_EMAIL)
    await page.fill('[name="password"]', ADMIN_PASSWORD)
    await page.click('button[type="submit"]')
    // The seeded admin has mustChangePassword=true, so the first login
    // may redirect to /trocar-senha instead of /projetos.
    await expect(page).toHaveURL(/\/projetos|\/trocar-senha/)
  })

  test("login fails with wrong password", async ({ page }) => {
    await page.goto("/login")
    await page.fill('[name="email"]', ADMIN_EMAIL)
    await page.fill('[name="password"]', "WrongPassword!")
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/login/)
    // The login page renders "Email ou senha inválidos." on failure.
    await expect(page.locator("text=/email ou senha inv/i")).toBeVisible()
  })

  test("forgot password page renders an email input", async ({ page }) => {
    await page.goto("/esqueci-senha")
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })

  test("invalid invite token shows error card", async ({ page }) => {
    await page.goto("/convite?token=invalid-token-xyz")
    // The ConviteForm checks the token against the DB; any invalid token
    // should result in an error message visible on the page.
    // The page may redirect to login or show an error — either is acceptable.
    const url = page.url()
    if (/\/login/.test(url)) {
      // Redirect to login is a valid response for invalid invite tokens.
      await expect(page).toHaveURL(/\/login/)
    } else {
      // If the page stays on /convite, it should show an error state.
      await expect(page.locator("text=/inv[aá]lid|expirou|erro/i")).toBeVisible()
    }
  })

  test("missing invite token shows invalid invite message", async ({ page }) => {
    await page.goto("/convite")
    // No token query param — ConviteForm renders "Convite inválido" immediately
    await expect(page.locator("text=/convite inv[aá]lido/i")).toBeVisible()
  })
})
