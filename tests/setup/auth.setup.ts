import { test as setup } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { LoginPage } from '../../pages/LoginPage';

const authDir = path.resolve(__dirname, '../../playwright/.auth');
const authFile = path.join(authDir, 'user.json');

setup('authenticate test user session', async ({ page, request }) => {
  const email = process.env.TEST_USER_EMAIL || 'automation_runner@test.com';
  const password = process.env.TEST_USER_PASSWORD || 'TestSecret123!';
  const apiUrl = process.env.API_BASE_URL || 'https://mern-agile-tracker.onrender.com';
  const appUrl = process.env.BASE_URL || 'https://sprintforge-tracker.vercel.app';

  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  try {
    const res = await request.post(`${apiUrl}/api/auth/login`, {
      data: { email, password },
      timeout: 10000,
    });

    if (res.ok()) {
      const body = await res.json();
      const token = body.token;
      const user = body.user || { email, name: 'Automation User' };

      await page.goto(appUrl);
      await page.evaluate(
        ({ token, user }) => {
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
        },
        { token, user }
      );

      await page.context().storageState({ path: authFile });
      return;
    }
  } catch {
    // Backend API cold-start or network latency triggers UI fallback
  }

  // UI fallback using LoginPage Page Object Model
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(email, password);
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
  await page.context().storageState({ path: authFile });
});
