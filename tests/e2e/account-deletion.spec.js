import { expect, test } from '@playwright/test';

const appUrl = '/src/main/resources/META-INF/resources/index.html#/profile';
const player = { id: 7, email: 'safe@example.test', username: 'safe', name: 'Safe User' };

async function openProfile(page) {
  await page.addInitScript(value => sessionStorage.setItem('player', JSON.stringify(value)), player);
  await page.route('**/api/player/id/7', route => route.fulfill({ json: player }));
  await page.goto(appUrl);
  await expect(page.getByRole('button', { name: 'Account endgültig löschen' })).toBeVisible();
}

async function confirmDeletion(page) {
  page.once('dialog', dialog => dialog.accept('LÖSCHEN'));
  await page.getByRole('button', { name: 'Account endgültig löschen' }).click();
}

test('successful account deletion navigates to the public entry page', async ({ page }) => {
  await page.route('**/api/account', route => route.fulfill({ status: 204 }));
  await openProfile(page);
  await confirmDeletion(page);
  await expect(page).toHaveURL(/127\.0\.0\.1:4173\/$/);
});

test('pending deletion offers a safe retry', async ({ page }) => {
  await page.route('**/api/account', route => route.fulfill({
    status: 409,
    contentType: 'application/json',
    body: JSON.stringify({ code: 'ACCOUNT_DELETION_PENDING', message: 'internal exception', retryable: true })
  }));
  await openProfile(page);
  await confirmDeletion(page);
  await expect(page.locator('#pvStatus')).toContainText('Bitte erneut versuchen');
  await expect(page.getByRole('button', { name: 'Account endgültig löschen' })).toBeEnabled();
  await expect(page.locator('body')).not.toContainText('internal exception');
});

test('forbidden deletion never renders provider or internal content', async ({ page }) => {
  await page.route('**/api/account', route => route.fulfill({
    status: 403,
    contentType: 'application/json',
    body: JSON.stringify({ code: 'ACCOUNT_DELETION_FORBIDDEN', message: 'stack trace secret', retryable: false })
  }));
  await openProfile(page);
  await confirmDeletion(page);
  await expect(page.locator('#pvStatus')).toHaveText('Du kannst nur deinen eigenen Account löschen.');
  await expect(page.locator('body')).not.toContainText('stack trace secret');
});

test('proxy HTML is ignored and never rendered', async ({ page }) => {
  await page.route('**/api/account', route => route.fulfill({
    status: 502,
    contentType: 'text/html',
    body: '<!DOCTYPE html><title>Cloudflare</title><pre>internal exception stack trace</pre>'
  }));
  await openProfile(page);
  await confirmDeletion(page);
  await expect(page.locator('#pvStatus')).toContainText('derzeit nicht verfügbar');
  await expect(page.getByRole('button', { name: 'Account endgültig löschen' })).toBeEnabled();
  const body = await page.locator('body').innerText();
  expect(body).not.toMatch(/<!DOCTYPE|Cloudflare|stack trace|internal exception/i);
});
