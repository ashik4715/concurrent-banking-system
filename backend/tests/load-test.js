import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5050';

export const options = {
  scenarios: {
    // Phase 1: Create test accounts
    setup_accounts: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      maxDuration: '30s',
      exec: 'setupAccounts',
    },
    // Phase 2: 1000 concurrent deposits
    concurrent_deposits: {
      executor: 'constant-vus',
      vus: 1000,
      duration: '30s',
      startTime: '5s',
      exec: 'concurrentDeposits',
    },
    // Phase 3: 1000 concurrent withdrawals (race condition test)
    concurrent_withdrawals: {
      executor: 'constant-vus',
      vus: 1000,
      duration: '30s',
      startTime: '40s',
      exec: 'concurrentWithdrawals',
    },
    // Phase 4: 1000 concurrent transfers
    concurrent_transfers: {
      executor: 'constant-vus',
      vus: 1000,
      duration: '30s',
      startTime: '75s',
      exec: 'concurrentTransfers',
    },
    // Phase 5: Verify final balances
    verify_balances: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      maxDuration: '10s',
      startTime: '110s',
      exec: 'verifyBalances',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.5'],
  },
};

// Phase 1: Create test accounts
export function setupAccounts() {
  // Create 10 accounts with 10000 balance each for testing
  for (let i = 1; i <= 10; i++) {
    const accountId = `LOAD_TEST_${String(i).padStart(3, '0')}`;
    const payload = JSON.stringify({
      accountId,
      holderName: `Load Test User ${i}`,
      balance: 10000,
    });

    const res = http.post(`${BASE_URL}/api/accounts`, payload, {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'create_account' },
    });

    // Account might already exist from previous run
    check(res, {
      'account created or exists': (r) =>
        r.status === 201 || r.status === 409,
    });
  }
}

// Phase 2: Concurrent deposits - each VU deposits to random account
export function concurrentDeposits() {
  const accountNum = Math.floor(Math.random() * 10) + 1;
  const accountId = `LOAD_TEST_${String(accountNum).padStart(3, '0')}`;

  const payload = JSON.stringify({
    type: 'deposit',
    toAccount: accountId,
    amount: Math.random() * 100 + 1,
  });

  const res = http.post(`${BASE_URL}/api/transactions`, payload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'deposit' },
  });

  check(res, {
    'deposit success or conflict': (r) =>
      r.status === 201 || r.status === 409 || r.status === 400,
  });
}

// Phase 3: Concurrent withdrawals - attempt to drain accounts
export function concurrentWithdrawals() {
  const accountNum = Math.floor(Math.random() * 10) + 1;
  const accountId = `LOAD_TEST_${String(accountNum).padStart(3, '0')}`;

  const payload = JSON.stringify({
    type: 'withdraw',
    fromAccount: accountId,
    amount: Math.random() * 500 + 100,
  });

  const res = http.post(`${BASE_URL}/api/transactions`, payload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'withdraw' },
  });

  check(res, {
    'withdraw handled correctly': (r) =>
      r.status === 201 || r.status === 400 || r.status === 409,
  });

  // Parse response to verify no negative balance allowed
  try {
    const body = JSON.parse(res.body);
    if (body.data?.account?.balance !== undefined) {
      check(body, {
        'balance is non-negative': (b) => b.data.account.balance >= 0,
      });
    }
  } catch (e) {
    // Response might be error, which is fine
  }
}

// Phase 4: Concurrent transfers between accounts
export function concurrentTransfers() {
  const fromNum = Math.floor(Math.random() * 10) + 1;
  let toNum = Math.floor(Math.random() * 10) + 1;
  if (toNum === fromNum) toNum = (toNum % 10) + 1;

  const fromAccount = `LOAD_TEST_${String(fromNum).padStart(3, '0')}`;
  const toAccount = `LOAD_TEST_${String(toNum).padStart(3, '0')}`;

  const payload = JSON.stringify({
    type: 'transfer',
    fromAccount,
    toAccount,
    amount: Math.random() * 200 + 10,
  });

  const res = http.post(`${BASE_URL}/api/transactions`, payload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'transfer' },
  });

  check(res, {
    'transfer handled correctly': (r) =>
      r.status === 201 || r.status === 400 || r.status === 409,
  });
}

// Phase 5: Verify all balances are consistent and non-negative
export function verifyBalances() {
  const res = http.get(`${BASE_URL}/api/accounts`, {
    tags: { name: 'verify' },
  });

  check(res, {
    'accounts fetched': (r) => r.status === 200,
  });

  try {
    const body = JSON.parse(res.body);
    if (body.data) {
      body.data
        .filter((a) => a.accountId.startsWith('LOAD_TEST_'))
        .forEach((account) => {
          check(account, {
            [`balance non-negative for ${account.accountId}`]: (a) => a.balance >= 0,
            [`version is integer for ${account.accountId}`]: (a) =>
              Number.isInteger(a.version) && a.version > 0,
          });
          console.log(
            `${account.accountId}: balance=${account.balance}, version=${account.version}`
          );
        });
    }
  } catch (e) {
    console.error('Failed to parse verify response:', e);
  }
}
