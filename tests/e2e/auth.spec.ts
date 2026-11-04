import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';

test.describe('Authentication Flow', () => {
  // Clear persistent session state for auth tests so each runs in an unauthenticated context
  test.use({ storageState: { cookies: [], origins: [] } });

  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('should render login form with all semantic inputs', async () => {
    await expect(loginPage.heading).toBeVisible();
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
    await expect(loginPage.signUpLink).toBeVisible();
  });

  test('should display error message on invalid credentials', async () => {
    await loginPage.login('nonexistent_user_98765@example.com', 'InvalidPassword123!');
    await loginPage.expectErrorMessage(/Account not found|Invalid credentials/i);
  });

  test('should navigate to registration page when clicking sign up link', async ({ page }) => {
    await loginPage.signUpLink.click();
    await expect(page).toHaveURL(/.*\/register/);
    await expect(page.getByRole('button', { name: /Sign Up|Register/i })).toBeVisible();
  });

  test('should successfully log in with valid credentials and redirect to dashboard', async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL || 'automation_runner@test.com';
    const password = process.env.TEST_USER_PASSWORD || 'TestSecret123!';

    await loginPage.login(email, password);
    await page.waitForURL((url) => !url.pathname.includes('/login'));

    await expect(page.locator('.sidebar')).toBeVisible();
    await expect(page.locator('.sidebar-brand span')).toHaveText('SprintForge');
  });

  test('should redirect unauthenticated user from protected route to login', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL(/.*\/login/);
    await expect(loginPage.heading).toBeVisible();
  });
});
