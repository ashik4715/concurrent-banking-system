const Transaction = require('../models/Transaction');

let transactionService;

const setTransactionService = (service) => {
  transactionService = service;
};

const createTransaction = async (req, res, next) => {
  try {
    const { type, fromAccount, toAccount, amount } = req.body;
    let result;

    switch (type) {
      case 'deposit':
        if (!toAccount) {
          return res.status(400).json({
            success: false,
            error: 'toAccount is required for deposits',
          });
        }
        result = await transactionService.deposit(toAccount, amount);
        break;

      case 'withdraw':
        if (!fromAccount) {
          return res.status(400).json({
            success: false,
            error: 'fromAccount is required for withdrawals',
          });
        }
        result = await transactionService.withdraw(fromAccount, amount);
        break;

      case 'transfer':
        if (!fromAccount || !toAccount) {
          return res.status(400).json({
            success: false,
            error: 'Both fromAccount and toAccount are required for transfers',
          });
        }
        result = await transactionService.transfer(fromAccount, toAccount, amount);
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid transaction type',
        });
    }

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const getTransactions = async (req, res, next) => {
  try {
    const transactions = await Transaction.find().sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, data: transactions });
  } catch (error) {
    next(error);
  }
};

module.exports = { createTransaction, getTransactions, setTransactionService };
