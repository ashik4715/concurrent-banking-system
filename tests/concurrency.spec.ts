import { test, expect } from "@playwright/test";

const API = "http://localhost:5050/api";

test.describe("Concurrency Race Condition Tests", () => {
  const account1 = `CONC${Date.now()}A`;
  const account2 = `CONC${Date.now()}B`;

  test.beforeAll(async ({ request }) => {
    await request.post(`${API}/accounts`, {
      data: { accountId: account1, holderName: "Concurrent Test A", balance: 1000 },
    });
    await request.post(`${API}/accounts`, {
      data: { accountId: account2, holderName: "Concurrent Test B", balance: 1000 },
    });
  });

  test("concurrent withdrawals never produce negative balance", async ({ request }) => {
    const CONCURRENT_REQUESTS = 50;
    const withdrawAmount = 50;

    const promises = Array.from({ length: CONCURRENT_REQUESTS }, () =>
      request.post(`${API}/transactions`, {
        data: { type: "withdraw", fromAccount: account1, amount: withdrawAmount },
      })
    );

    const results = await Promise.all(promises);

    const successCount = results.filter((r) => r.status() === 201).length;
    const failCount = results.filter((r) => r.status() !== 201).length;

    expect(successCount + failCount).toBe(CONCURRENT_REQUESTS);

    const accountRes = await request.get(`${API}/accounts/${account1}`);
    const account = (await accountRes.json()).data;
    expect(account.balance).toBeGreaterThanOrEqual(0);

    // With 1000 balance and 50 per withdrawal, max 20 should succeed
    expect(successCount).toBeLessThanOrEqual(20);

    console.log(
      `Concurrency test: ${successCount} succeeded, ${failCount} failed, final balance: ${account.balance}, version: ${account.version}`
    );
  });

  test("concurrent deposits handled safely", async ({ request }) => {
    const before = await request.get(`${API}/accounts/${account2}`);
    const beforeBal = (await before.json()).data.balance;

    const CONCURRENT_REQUESTS = 10;
    const depositAmount = 10;

    const promises = Array.from({ length: CONCURRENT_REQUESTS }, () =>
      request.post(`${API}/transactions`, {
        data: { type: "deposit", toAccount: account2, amount: depositAmount },
      })
    );

    const results = await Promise.all(promises);
    const successCount = results.filter((r) => r.status() === 201).length;

    // Under high concurrency, some may fail due to version conflicts (3 retries)
    // The key invariant is: balance is correct for the number of successes
    expect(successCount).toBeGreaterThan(0);

    const after = await request.get(`${API}/accounts/${account2}`);
    const afterBal = (await after.json()).data.balance;
    expect(afterBal).toBe(beforeBal + successCount * depositAmount);

    console.log(
      `Deposit test: ${successCount}/${CONCURRENT_REQUESTS} succeeded, balance: ${beforeBal} -> ${afterBal}`
    );
  });

  test("version number increments correctly", async ({ request }) => {
    const accountRes = await request.get(`${API}/accounts/${account2}`);
    const accountBefore = (await accountRes.json()).data;
    const versionBefore = accountBefore.version;

    await request.post(`${API}/transactions`, {
      data: { type: "deposit", toAccount: account2, amount: 1 },
    });

    const afterRes = await request.get(`${API}/accounts/${account2}`);
    const accountAfter = (await afterRes.json()).data;
    expect(accountAfter.version).toBe(versionBefore + 1);
  });

  test("concurrent transfers maintain balance consistency", async ({ request }) => {
    const beforeA = await request.get(`${API}/accounts/${account1}`);
    const beforeB = await request.get(`${API}/accounts/${account2}`);
    const balA = (await beforeA.json()).data.balance;
    const balB = (await beforeB.json()).data.balance;
    const totalBefore = balA + balB;

    const CONCURRENT_REQUESTS = 10;
    const transferAmount = 10;

    // Half transfer A->B, half transfer B->A
    const promises = Array.from({ length: CONCURRENT_REQUESTS }, (_, i) => {
      if (i % 2 === 0) {
        return request.post(`${API}/transactions`, {
          data: { type: "transfer", fromAccount: account1, toAccount: account2, amount: transferAmount },
        });
      }
      return request.post(`${API}/transactions`, {
        data: { type: "transfer", fromAccount: account2, toAccount: account1, amount: transferAmount },
      });
    });

    await Promise.all(promises);

    const afterA = await request.get(`${API}/accounts/${account1}`);
    const afterB = await request.get(`${API}/accounts/${account2}`);
    const finalBalA = (await afterA.json()).data.balance;
    const finalBalB = (await afterB.json()).data.balance;
    const totalAfter = finalBalA + finalBalB;

    // Total money in system must be conserved
    expect(totalAfter).toBe(totalBefore);
    expect(finalBalA).toBeGreaterThanOrEqual(0);
    expect(finalBalB).toBeGreaterThanOrEqual(0);

    console.log(
      `Transfer conservation: total before=${totalBefore}, total after=${totalAfter}, A=${finalBalA}, B=${finalBalB}`
    );
  });
});
