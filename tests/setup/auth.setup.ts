import { test as setup, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const authDir = path.resolve(__dirname, '../../playwright/.auth');
const authFile = path.join(authDir, 'user.json');

setup('authenticate test user session', async ({ page, request }) => {
  const email = process.env.TEST_USER_EMAIL || 'testuser@example.com';
  const password = process.env.TEST_USER_PASSWORD || 'Password123!';
  const apiUrl = process.env.API_BASE_URL || 'https://mern-agile-tracker.onrender.com';
  const appUrl = process.env.BASE_URL || 'https://sprintforge-tracker.vercel.app';

  // Ensure target auth directory exists
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Fast Hybrid Auth: Attempt direct API authentication
  try {
    const res = await request.post(`${apiUrl}/api/auth/login`, {
      data: { email, password },
      timeout: 10000,
    });

    if (res.ok()) {
      const body = await res.json();
      const token = body.token;
      const user = body.user || { email, name: 'Automation User' };

      // Navigate to app origin and seed client localStorage
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
    // If backend API cold-start causes timeout, fallback to UI login
  }

  // Fallback: Perform standard browser UI login
  await page.goto('/login');
  await page.getByPlaceholder(/email/i).fill(email);
  await page.getByPlaceholder(/password/i).fill(password);
  await page.getByRole('button', { name: /log in|sign in/i }).click();

  // Save session state once redirected past the login view
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 }).catch(() => {});
  await page.context().storageState({ path: authFile });
});
