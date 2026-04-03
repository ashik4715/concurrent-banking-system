const { body } = require('express-validator');

const accountValidators = [
  body('accountId')
    .trim()
    .notEmpty().withMessage('Account ID is required')
    .isLength({ min: 3, max: 20 }).withMessage('Account ID must be 3-20 characters'),
  body('holderName')
    .trim()
    .notEmpty().withMessage('Holder name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Holder name must be 2-100 characters'),
  body('balance')
    .optional()
    .isFloat({ min: 0 }).withMessage('Balance must be a non-negative number'),
];

const transactionValidators = [
  body('type')
    .trim()
    .notEmpty().withMessage('Transaction type is required')
    .isIn(['deposit', 'withdraw', 'transfer']).withMessage('Type must be deposit, withdraw, or transfer'),
  body('amount')
    .isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
  body('fromAccount')
    .optional({ nullable: true })
    .trim()
    .notEmpty().withMessage('From account cannot be empty string'),
  body('toAccount')
    .optional({ nullable: true })
    .trim()
    .notEmpty().withMessage('To account cannot be empty string'),
];

module.exports = { accountValidators, transactionValidators };
