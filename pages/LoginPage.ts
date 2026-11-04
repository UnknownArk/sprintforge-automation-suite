import { Locator, Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  readonly heading: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly signUpLink: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Log in to SprintForge' });
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', { name: 'Log In' });
    this.errorMessage = page.locator('div[style*="de350b"], div[style*="222, 53, 11"]');
    this.signUpLink = page.getByRole('link', { name: 'Sign up' });
  }

  async goto(): Promise<void> {
    await this.navigate('/login');
    await expect(this.heading).toBeVisible();
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectErrorMessage(message: string | RegExp): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
    if (typeof message === 'string') {
      await expect(this.errorMessage).toContainText(message);
    } else {
      await expect(this.errorMessage).toHaveText(message);
    }
  }
}
