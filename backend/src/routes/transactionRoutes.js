const express = require('express');
const router = express.Router();
const { transactionValidators } = require('../middleware/validators');
const validate = require('../middleware/validate');
const {
  createTransaction,
  getTransactions,
} = require('../controllers/transactionController');

/**
 * @swagger
 * /api/transactions:
 *   post:
 *     summary: Create a new transaction
 *     description: |
 *       Supported transaction types:
 *       - **deposit**: Requires `toAccount` and `amount`. Increases the account balance.
 *       - **withdraw**: Requires `fromAccount` and `amount`. Decreases the account balance. Fails if insufficient balance.
 *       - **transfer**: Requires `fromAccount`, `toAccount`, and `amount`. Moves funds between accounts. Uses optimistic concurrency control with retry.
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, amount]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [deposit, withdraw, transfer]
 *                 example: deposit
 *               fromAccount:
 *                 type: string
 *                 nullable: true
 *                 description: Required for withdraw and transfer
 *                 example: ACC1001
 *               toAccount:
 *                 type: string
 *                 nullable: true
 *                 description: Required for deposit and transfer
 *                 example: ACC1002
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *                 example: 500
 *           examples:
 *             deposit:
 *               summary: Deposit example
 *               value: { type: deposit, toAccount: ACC1001, amount: 500 }
 *             withdraw:
 *               summary: Withdraw example
 *               value: { type: withdraw, fromAccount: ACC1001, amount: 200 }
 *             transfer:
 *               summary: Transfer example
 *               value: { type: transfer, fromAccount: ACC1001, toAccount: ACC1002, amount: 300 }
 *     responses:
 *       201:
 *         description: Transaction processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     account: { $ref: '#/components/schemas/Account' }
 *                     transaction: { $ref: '#/components/schemas/Transaction' }
 *       400:
 *         description: Validation error or insufficient balance
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Account not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       409:
 *         description: Concurrency conflict (max retries exceeded)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/', transactionValidators, validate, createTransaction);

/**
 * @swagger
 * /api/transactions:
 *   get:
 *     summary: List recent transactions
 *     description: Returns the 100 most recent transactions sorted by creation date (newest first).
 *     tags: [Transactions]
 *     responses:
 *       200:
 *         description: List of transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Transaction' }
 */
router.get('/', getTransactions);

module.exports = router;
