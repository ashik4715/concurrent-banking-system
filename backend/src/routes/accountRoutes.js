const express = require('express');
const router = express.Router();
const { accountValidators } = require('../middleware/validators');
const validate = require('../middleware/validate');
const {
  createAccount,
  getAccounts,
  getAccount,
  getAccountTransactions,
} = require('../controllers/accountController');

/**
 * @swagger
 * /api/accounts:
 *   post:
 *     summary: Create a new account
 *     tags: [Accounts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [accountId, holderName]
 *             properties:
 *               accountId:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 20
 *                 example: ACC1001
 *               holderName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: John Doe
 *               balance:
 *                 type: number
 *                 minimum: 0
 *                 example: 1000
 *     responses:
 *       201:
 *         description: Account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Account' }
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 *       409:
 *         description: Account ID already exists
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/', accountValidators, validate, createAccount);

/**
 * @swagger
 * /api/accounts:
 *   get:
 *     summary: List all accounts
 *     tags: [Accounts]
 *     responses:
 *       200:
 *         description: List of accounts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Account' }
 */
router.get('/', getAccounts);

/**
 * @swagger
 * /api/accounts/{id}:
 *   get:
 *     summary: Get a single account by ID
 *     tags: [Accounts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: The account ID (e.g., ACC1001)
 *     responses:
 *       200:
 *         description: Account found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Account' }
 *       404:
 *         description: Account not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get('/:id', getAccount);

/**
 * @swagger
 * /api/accounts/{id}/transactions:
 *   get:
 *     summary: Get all transactions for an account
 *     tags: [Accounts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: The account ID
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
router.get('/:id/transactions', getAccountTransactions);

module.exports = router;
