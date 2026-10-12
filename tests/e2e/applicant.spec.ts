import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';

const fixtures = new Map<string, { cookie: string; password: string }>();

test.afterEach(async ({ request: cleaner }, testInfo) => {
  const fixture = fixtures.get(testInfo.testId);
  if (!fixture) return;
  // Teardown gets a separate hook budget, so a failed locator cannot prevent fixture deletion.
  try {
    const response = await cleaner.delete('/api/account', {
      data: { password: fixture.password },
      headers: { cookie: fixture.cookie, 'x-requested-with': 'visa-assistant' },
      timeout: 15_000,
    });
    expect(response.status(), 'Remove only this browser-test account and its owned records').toBe(200);
  } finally {
    fixtures.delete(testInfo.testId);
  }
});

test('signup, no-upload case, persistent checklist, and truthful source warnings', async ({ page }, testInfo) => {
  const email = `e2e-${randomUUID()}@example.invalid`;
  const password = 'Browser-only!Visa2026';
  const local = new URL(testInfo.project.use.baseURL as string);
  expect(['localhost', '127.0.0.1', '::1', '[::1]']).toContain(local.hostname);
    await page.goto('/register');
    await page.getByLabel('Name', { exact: true }).fill('Browser Test Applicant');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    const [registration] = await Promise.all([
      page.waitForResponse((response) => response.url().endsWith('/api/auth/register') && response.request().method() === 'POST'),
      page.getByRole('button', { name: 'Create account', exact: true }).click(),
    ]);
    expect(registration.status()).toBe(201);
    await registration.finished();
    const cookie = (await page.context().cookies()).filter((item) => item.name === 'visa_session').map((item) => `${item.name}=${item.value}`).join('; ');
    expect(cookie).toBeTruthy();
    fixtures.set(testInfo.testId, { cookie, password });
    await expect(page.getByRole('heading', { name: 'Your workspace is ready.' })).toBeVisible();
    // Tests use development email preview; this is not an assertion of delivered production email.
    await page.getByRole('link', { name: 'Verify my email' }).click();
    await expect(page.getByRole('heading', { name: 'Email verified.' })).toBeVisible();
    await page.getByRole('link', { name: 'Go to my workspace' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto('/applications/new');
    await page.getByLabel('Destination country').selectOption('IT');
    await page.getByLabel('Nationality', { exact: true }).fill('PK');
    await page.getByLabel('Country of residence', { exact: true }).fill('PK');
    await page.getByLabel('Consular jurisdiction', { exact: true }).fill('Islamabad');
    await page.getByLabel('Purpose of travel').fill('Study computer science at a university.');
    await expect(page.locator('input[type="file"]')).toHaveCount(0);
    await page.getByRole('button', { name: 'Create application', exact: true }).click();
    await expect(page).toHaveURL(/\/applications\/[0-9a-f-]+$/);
    await expect(page.getByRole('heading', { name: 'Italy', exact: true })).toBeVisible();
    await expect(page.getByText('DEMO · sample rules', { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/Demonstration checklist only/)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Official sources', exact: true })).toBeVisible();
    const official = page.getByRole('link', { name: /Italy — Ministry of Foreign Affairs/ }).first();
    await expect(official).toHaveAttribute('href', 'https://vistoperitalia.esteri.it/home/en');

    await page.getByRole('button', { name: /^Checklist/ }).click();
    await expect(page.getByText(/Statuses reflect your own assessment/)).toBeVisible();
    const firstCard = page.locator('article.checklist-card').first();
    await firstCard.getByRole('combobox').selectOption('HAVE_IT');
    await firstCard.getByRole('textbox').fill('A self-reported browser-test note.');
    await firstCard.getByRole('button', { name: 'Save progress', exact: true }).click();
    await expect(firstCard.getByText('Progress saved.', { exact: true })).toBeVisible();
    await page.reload();
    await page.getByRole('button', { name: /^Checklist/ }).click();
    await expect(page.locator('article.checklist-card').first().getByRole('combobox')).toHaveValue('HAVE_IT');
    await expect(page.locator('article.checklist-card').first().getByRole('textbox')).toHaveValue('A self-reported browser-test note.');
    await expect(page.getByText(/Demonstration checklist only/)).toBeVisible();

    await testInfo.attach('saved-checklist', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow, 'The applicant flow should fit the selected desktop/mobile viewport').toBe(false);

    await page.getByRole('button', { name: 'Overview', exact: true }).click();
    await page.getByLabel('Consular jurisdiction', { exact: true }).fill('Unmapped browser-test jurisdiction');
    await page.getByRole('button', { name: 'Save profile', exact: true }).click();
    await expect(page.getByText('Requirements are unknown for this profile', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /^Checklist/ }).click();
    await expect(page.getByRole('heading', { name: 'No matching checklist is available' })).toBeVisible();
    await expect(page.locator('article.checklist-card')).toHaveCount(0);
});
