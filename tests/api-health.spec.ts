import { test, expect } from "@playwright/test";

const API = "http://localhost:5050/api";

test.describe("API Health & Accounts", () => {
  const uniqueId = `TEST${Date.now()}`;

  test("health endpoint returns ok", async ({ request }) => {
    const res = await request.get(`${API}/health`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeTruthy();
  });

  test("swagger docs endpoint is accessible", async ({ request }) => {
    const res = await request.get(`${API}/docs/`);
    expect(res.status()).toBe(200);
  });

  test("swagger.json returns valid spec", async ({ request }) => {
    const res = await request.get(`${API}/swagger.json`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.openapi).toBe("3.0.0");
    expect(body.info.title).toContain("Banking");
  });

  test("create account succeeds", async ({ request }) => {
    const res = await request.post(`${API}/accounts`, {
      data: { accountId: uniqueId, holderName: "Test User", balance: 5000 },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.accountId).toBe(uniqueId);
    expect(body.data.balance).toBe(5000);
    expect(body.data.version).toBe(0);
  });

  test("duplicate account returns 409", async ({ request }) => {
    const res = await request.post(`${API}/accounts`, {
      data: { accountId: uniqueId, holderName: "Test User", balance: 100 },
    });
    expect(res.status()).toBe(409);
  });

  test("list accounts returns array", async ({ request }) => {
    const res = await request.get(`${API}/accounts`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });

  test("get single account by ID", async ({ request }) => {
    const res = await request.get(`${API}/accounts/${uniqueId}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.accountId).toBe(uniqueId);
    expect(body.data.balance).toBe(5000);
  });

  test("get non-existent account returns 404", async ({ request }) => {
    const res = await request.get(`${API}/accounts/NONEXISTENT999`);
    expect(res.status()).toBe(404);
  });

  test("create account with validation error", async ({ request }) => {
    const res = await request.post(`${API}/accounts`, {
      data: { accountId: "", holderName: "" },
    });
    expect(res.status()).toBe(400);
  });
});
