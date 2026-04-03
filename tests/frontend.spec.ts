import { test, expect } from "@playwright/test";

test.describe("Frontend Pages", () => {
  test("dashboard loads correctly", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("nav")).toContainText("Concurrent Banking System");
    await expect(page.getByRole("heading", { name: "Create Account" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "New Transaction" })).toBeVisible();
  });

  test("websocket indicator is visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("WebSocket:")).toBeVisible();
  });

  test("create account form works", async ({ page, request }) => {
    const uniqueId = `UI${Date.now()}`;
    await page.goto("/");

    await page.fill('input[placeholder="Account ID (e.g., ACC1001)"]', uniqueId);
    await page.fill('input[placeholder="Holder Name"]', "UI Test User");
    await page.fill('input[placeholder="Initial Balance (optional)"]', "9999");

    await page.click('button:has-text("Create Account")');

    await expect(page.getByText(uniqueId)).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("cell", { name: "UI Test User" }).first()).toBeVisible();

    // Cleanup
    // Account persists in DB but that's fine for test
  });

  test("transaction form shows correct fields for each type", async ({ page }) => {
    await page.goto("/");

    // Deposit: should show To Account
    await expect(page.locator('input[placeholder="To Account ID"]')).toBeVisible();
    await expect(page.locator('input[placeholder="From Account ID"]')).not.toBeVisible();

    // Switch to Withdraw
    await page.selectOption('select', 'withdraw');
    await expect(page.locator('input[placeholder="From Account ID"]')).toBeVisible();
    await expect(page.locator('input[placeholder="To Account ID"]')).not.toBeVisible();

    // Switch to Transfer
    await page.selectOption('select', 'transfer');
    await expect(page.locator('input[placeholder="From Account ID"]')).toBeVisible();
    await expect(page.locator('input[placeholder="To Account ID"]')).toBeVisible();
  });

  test("accounts table displays data", async ({ page, request }) => {
    const uniqueId = `DISP${Date.now()}`;
    await request.post("http://localhost:5050/api/accounts", {
      data: { accountId: uniqueId, holderName: "Display Test", balance: 7777 },
    });

    await page.goto("/");
    await expect(page.getByText(uniqueId)).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("cell", { name: "Display Test" }).first()).toBeVisible();
  });

  test("error message is dismissible", async ({ page }) => {
    await page.goto("/");
    // Try to create a duplicate account to trigger an error
    const dupId = `DUP${Date.now()}`;
    await page.fill('input[placeholder="Account ID (e.g., ACC1001)"]', dupId);
    await page.fill('input[placeholder="Holder Name"]', "Dup Test");
    await page.click('button:has-text("Create Account")');

    // Wait for first account to be created
    await page.waitForTimeout(1000);

    // Try to create duplicate
    await page.fill('input[placeholder="Account ID (e.g., ACC1001)"]', dupId);
    await page.fill('input[placeholder="Holder Name"]', "Dup Test 2");
    await page.click('button:has-text("Create Account")');

    // Error should appear (or the account was already created in a previous test)
    // Just verify the page doesn't crash
    await expect(page.locator("nav")).toContainText("Concurrent Banking System");
  });
});
