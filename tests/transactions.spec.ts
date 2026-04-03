import { test, expect } from "@playwright/test";

const API = "http://localhost:5050/api";

test.describe("Transaction CRUD", () => {
  const accountA = `TXA${Date.now()}`;
  const accountB = `TXB${Date.now()}`;

  test.beforeAll(async ({ request }) => {
    await request.post(`${API}/accounts`, {
      data: { accountId: accountA, holderName: "Sender", balance: 10000 },
    });
    await request.post(`${API}/accounts`, {
      data: { accountId: accountB, holderName: "Receiver", balance: 1000 },
    });
  });

  test("deposit increases balance", async ({ request }) => {
    const before = await request.get(`${API}/accounts/${accountA}`);
    const beforeBal = (await before.json()).data.balance;

    const res = await request.post(`${API}/transactions`, {
      data: { type: "deposit", toAccount: accountA, amount: 500 },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);

    const after = await request.get(`${API}/accounts/${accountA}`);
    const afterBal = (await after.json()).data.balance;
    expect(afterBal).toBe(beforeBal + 500);
  });

  test("withdraw decreases balance", async ({ request }) => {
    const before = await request.get(`${API}/accounts/${accountA}`);
    const beforeBal = (await before.json()).data.balance;

    const res = await request.post(`${API}/transactions`, {
      data: { type: "withdraw", fromAccount: accountA, amount: 200 },
    });
    expect(res.status()).toBe(201);

    const after = await request.get(`${API}/accounts/${accountA}`);
    const afterBal = (await after.json()).data.balance;
    expect(afterBal).toBe(beforeBal - 200);
  });

  test("withdraw with insufficient balance fails", async ({ request }) => {
    const res = await request.post(`${API}/transactions`, {
      data: { type: "withdraw", fromAccount: accountB, amount: 999999 },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test("transfer moves funds between accounts", async ({ request }) => {
    const beforeA = await request.get(`${API}/accounts/${accountA}`);
    const beforeB = await request.get(`${API}/accounts/${accountB}`);
    const balA = (await beforeA.json()).data.balance;
    const balB = (await beforeB.json()).data.balance;

    const res = await request.post(`${API}/transactions`, {
      data: { type: "transfer", fromAccount: accountA, toAccount: accountB, amount: 300 },
    });
    expect(res.status()).toBe(201);

    const afterA = await request.get(`${API}/accounts/${accountA}`);
    const afterB = await request.get(`${API}/accounts/${accountB}`);
    expect((await afterA.json()).data.balance).toBe(balA - 300);
    expect((await afterB.json()).data.balance).toBe(balB + 300);
  });

  test("transfer to same account fails", async ({ request }) => {
    const res = await request.post(`${API}/transactions`, {
      data: { type: "transfer", fromAccount: accountA, toAccount: accountA, amount: 100 },
    });
    expect(res.status()).toBe(400);
  });

  test("list transactions returns array", async ({ request }) => {
    const res = await request.get(`${API}/transactions`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  test("get account transactions", async ({ request }) => {
    // Make a deposit first to ensure there's at least one transaction
    await request.post(`${API}/transactions`, {
      data: { type: "deposit", toAccount: accountA, amount: 1 },
    });

    const res = await request.get(`${API}/accounts/${accountA}/transactions`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });
});
