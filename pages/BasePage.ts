import { Page, Response } from '@playwright/test';

export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  async navigate(path: string = '/'): Promise<Response | null> {
    return this.page.goto(path);
  }

  async waitForUrl(urlOrPredicate: string | RegExp | ((url: URL) => boolean)): Promise<void> {
    await this.page.waitForURL(urlOrPredicate);
  }

  async getTitle(): Promise<string> {
    return this.page.title();
  }
}
