# Concurrent Banking Transaction System

A MERN stack (MongoDB, Express, React/NextJS, Node.js) concurrent banking transaction system that handles high-concurrency financial transactions safely using optimistic concurrency control.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Dashboard │  │ Account Mgmt │  │ Transaction Forms │  │
│  └────┬─────┘  └──────┬───────┘  └────────┬──────────┘  │
│       │               │                    │             │
│       └───────────────┼────────────────────┘             │
│                       │                                  │
│              ┌────────┴────────┐                         │
│              │  Socket.io Client│  HTTP (Axios)          │
│              └────────┬────────┘──────┬──────────────────┘
│                       │               │                  │
└───────────────────────┼───────────────┼──────────────────┘
                        │               │
           WebSocket    │               │  REST API
                        │               │
┌───────────────────────┼───────────────┼──────────────────┐
│                       ▼               ▼                  │
│              ┌────────────────────────────┐               │
│              │   Express.js Server        │               │
│              │   + Socket.io              │               │
│              └────────────┬───────────────┘               │
│                           │                               │
│              ┌────────────┴───────────────┐               │
│              │  Transaction Service       │               │
│              │  (Optimistic Locking)      │               │
│              │  - deposit()               │               │
│              │  - withdraw()              │               │
│              │  - transfer()              │               │
│              │  - Retry mechanism (3x)    │               │
│              └────────────┬───────────────┘               │
│                           │                               │
│                    Backend (Node.js)                      │
└───────────────────────────┼───────────────────────────────┘
                            │
                            ▼
                 ┌──────────────────┐
                 │  MongoDB Atlas   │
                 │  ┌────────────┐  │
                 │  │  Accounts  │  │
                 │  │  - balance  │  │
                 │  │  - version  │  │
                 │  ├────────────┤  │
                 │  │Transactions│  │
                 │  └────────────┘  │
                 └──────────────────┘
```

## Concurrency Control Strategy

The system uses **Optimistic Concurrency Control** with version numbers to prevent race conditions:

### How It Works

1. Each `Account` document has a `version` field (integer, starts at 0)
2. When reading an account, the current version is captured
3. When updating the balance, the update query includes the version:
   ```js
   findOneAndUpdate(
     { accountId, version: capturedVersion },
     { $set: { balance: newBalance }, $inc: { version: 1 } },
     { new: true }
   )
   ```
4. If another concurrent transaction modified the document between read and write, the version won't match, so `modifiedCount === 0`
5. The system retries up to 3 times, re-reading the latest version each time
6. If all retries fail, the transaction is rejected

### Why Not Pessimistic Locking?

- MongoDB does not support traditional row-level locks
- Optimistic locking has better throughput under low contention
- The retry mechanism handles the moderate contention expected in banking workloads

### Transfer Atomicity

For transfers (two-account operations):
1. Read both accounts' current versions
2. Atomically update the source account (debit)
3. Atomically update the destination account (credit)
4. If the destination update fails, roll back the source account
5. Retry the entire operation up to 3 times on version conflicts

### Balance Safety

- The `Account` schema has a `min: 0` constraint on balance
- Withdrawals check `balance >= amount` before attempting the update
- Even under concurrent access, the version check ensures only one withdrawal succeeds when funds are limited

## Setup Instructions

### Prerequisites

- Node.js >= 18
- MongoDB Atlas account (or local MongoDB)
- npm or yarn

### 1. Clone and Install

```bash
git clone <repository-url>
cd concurrent-banking-system

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Configuration

The `.env` file at the project root contains the MongoDB connection string:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/solar?retryWrites=true&w=majority
```

Update `MONGODB_URI` if using a different database.

### 3. Start the Backend

```bash
cd backend
npm run dev
```

The API server starts on `http://localhost:5000`

### 4. Start the Frontend

```bash
cd frontend
npm run dev
```

The Next.js app starts on `http://localhost:3000`

### 5. Open the App

Navigate to `http://localhost:3000` in your browser.

## API Documentation

### Base URL

```
http://localhost:5000/api
```

### Health Check

```
GET /api/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

### Accounts

#### Create Account

```
POST /api/accounts
Content-Type: application/json
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| accountId | string | Yes | Unique account identifier (3-20 chars) |
| holderName | string | Yes | Account holder name (2-100 chars) |
| balance | number | No | Initial balance (default: 0, min: 0) |

**Example:**
```json
{
  "accountId": "ACC1001",
  "holderName": "John Doe",
  "balance": 1000
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "accountId": "ACC1001",
    "holderName": "John Doe",
    "balance": 1000,
    "version": 0,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**Error Response (409):**
```json
{
  "success": false,
  "error": "Account ID already exists"
}
```

#### List All Accounts

```
GET /api/accounts
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "accountId": "ACC1001",
      "holderName": "John Doe",
      "balance": 1000,
      "version": 5
    }
  ]
}
```

#### Get Single Account

```
GET /api/accounts/:id
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "accountId": "ACC1001",
    "holderName": "John Doe",
    "balance": 1000,
    "version": 5
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "error": "Account not found"
}
```

#### Get Account Transactions

```
GET /api/accounts/:id/transactions
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "type": "deposit",
      "fromAccount": null,
      "toAccount": "ACC1001",
      "amount": 500,
      "status": "success",
      "createdAt": "..."
    }
  ]
}
```

---

### Transactions

#### Create Transaction

```
POST /api/transactions
Content-Type: application/json
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | string | Yes | `deposit`, `withdraw`, or `transfer` |
| fromAccount | string | Conditional | Required for `withdraw` and `transfer` |
| toAccount | string | Conditional | Required for `deposit` and `transfer` |
| amount | number | Yes | Transaction amount (min: 0.01) |

**Deposit Example:**
```json
{
  "type": "deposit",
  "toAccount": "ACC1001",
  "amount": 500
}
```

**Withdraw Example:**
```json
{
  "type": "withdraw",
  "fromAccount": "ACC1001",
  "amount": 200
}
```

**Transfer Example:**
```json
{
  "type": "transfer",
  "fromAccount": "ACC1001",
  "toAccount": "ACC1002",
  "amount": 300
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "account": {
      "_id": "...",
      "accountId": "ACC1001",
      "balance": 1500,
      "version": 1
    },
    "transaction": {
      "_id": "...",
      "type": "deposit",
      "toAccount": "ACC1001",
      "amount": 500,
      "status": "success"
    }
  }
}
```

**Error Response (400 - Insufficient Balance):**
```json
{
  "success": false,
  "error": "Insufficient balance"
}
```

**Error Response (409 - Concurrency Conflict):**
```json
{
  "success": false,
  "error": "Concurrency conflict: max retries exceeded"
}
```

#### List All Transactions

```
GET /api/transactions
```

Returns the 100 most recent transactions sorted by creation date.

---

### WebSocket Events

Connect to `ws://localhost:5000` using Socket.io client.

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `balance:updated` | Server → Client | `{ accountId, balance, version }` | Account balance changed |
| `transaction:created` | Server → Client | Transaction object | Transaction succeeded |
| `transaction:failed` | Server → Client | Transaction object | Transaction failed |

**Example Socket.io Client:**
```js
import { io } from 'socket.io-client';
const socket = io('http://localhost:5000');

socket.on('balance:updated', (data) => {
  console.log(`Account ${data.accountId}: $${data.balance} (v${data.version})`);
});

socket.on('transaction:created', (tx) => {
  console.log(`${tx.type}: $${tx.amount} - SUCCESS`);
});

socket.on('transaction:failed', (tx) => {
  console.log(`${tx.type}: $${tx.amount} - FAILED: ${tx.errorMessage}`);
});
```

## Load Testing

### Prerequisites

Install k6: https://k6.io/docs/get-started/installation/

### Run k6 Load Test

```bash
cd backend
chmod +x tests/run-load-test.sh
./tests/run-load-test.sh k6
```

Or directly:
```bash
k6 run --env BASE_URL=http://localhost:5000 tests/load-test.js
```

### Load Test Phases

1. **Setup** - Creates 10 test accounts with $10,000 each
2. **Concurrent Deposits** - 1000 VUs depositing random amounts for 30s
3. **Concurrent Withdrawals** - 1000 VUs withdrawing random amounts for 30s
4. **Concurrent Transfers** - 1000 VUs transferring between accounts for 30s
5. **Verification** - Checks all balances are non-negative and versions are consistent

### Run Artillery Load Test

```bash
npm install -g artillery
cd backend
./tests/run-load-test.sh artillery
```

### Expected Results

- **No negative balances** - The optimistic locking prevents overdrafts
- **Consistent version numbers** - Each successful transaction increments the version
- **Graceful conflict handling** - Concurrent conflicting transactions result in proper error responses
- **p95 latency < 2s** - Under 1000 concurrent users

## Project Structure

```
concurrent-banking-system/
├── backend/
│   ├── src/
│   │   ├── config/db.js              # MongoDB connection
│   │   ├── models/
│   │   │   ├── Account.js            # Account schema (balance + version)
│   │   │   └── Transaction.js        # Transaction log schema
│   │   ├── services/
│   │   │   └── transactionService.js # Core concurrency logic
│   │   ├── controllers/
│   │   │   ├── accountController.js
│   │   │   └── transactionController.js
│   │   ├── routes/
│   │   │   ├── accountRoutes.js
│   │   │   └── transactionRoutes.js
│   │   ├── middleware/
│   │   │   ├── errorHandler.js
│   │   │   ├── validate.js
│   │   │   └── validators.js
│   │   ├── socket/socketHandler.js   # WebSocket event management
│   │   └── server.js                 # Express + Socket.io entry point
│   ├── tests/
│   │   ├── load-test.js              # k6 load test script
│   │   ├── load-test-artillery.yml   # Artillery load test config
│   │   └── run-load-test.sh          # Test runner script
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx            # Root layout with nav
│   │   │   ├── globals.css           # Tailwind CSS
│   │   │   └── page.tsx              # Dashboard page
│   │   ├── lib/api.ts                # Axios API client
│   │   └── hooks/useSocket.ts        # WebSocket hook
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── package.json
├── .env                              # MongoDB URI + secrets
├── .gitignore
├── package.json                      # Root scripts
└── README.md
```

## Technologies

| Component | Technology |
|-----------|------------|
| Backend Runtime | Node.js |
| Backend Framework | Express.js |
| Database | MongoDB Atlas |
| ODM | Mongoose |
| Real-time | Socket.io |
| Frontend Framework | Next.js (App Router) |
| Frontend Styling | Tailwind CSS |
| Load Testing | k6 / Artillery |

## Transaction Rules

1. **Deposits** - Increase account balance
2. **Withdrawals** - Decrease balance; fail if insufficient funds
3. **Transfers** - Debit source, credit destination; fail if insufficient funds
4. **Race Conditions** - Optimistic locking with version numbers prevents concurrent balance corruption
5. **No Negative Balances** - Schema constraint + pre-update validation ensures balance >= 0 always

## License

MIT
