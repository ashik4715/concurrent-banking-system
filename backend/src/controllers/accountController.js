const Account = require('../models/Account');
const Transaction = require('../models/Transaction');

const createAccount = async (req, res, next) => {
  try {
    const { accountId, holderName, balance = 0 } = req.body;

    const existing = await Account.findOne({ accountId });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Account ID already exists',
      });
    }

    const account = await Account.create({ accountId, holderName, balance, version: 0 });
    res.status(201).json({ success: true, data: account });
  } catch (error) {
    next(error);
  }
};

const getAccounts = async (req, res, next) => {
  try {
    const accounts = await Account.find().sort({ createdAt: -1 });
    res.json({ success: true, data: accounts });
  } catch (error) {
    next(error);
  }
};

const getAccount = async (req, res, next) => {
  try {
    const account = await Account.findOne({ accountId: req.params.id });
    if (!account) {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }
    res.json({ success: true, data: account });
  } catch (error) {
    next(error);
  }
};

const getAccountTransactions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const transactions = await Transaction.find({
      $or: [{ fromAccount: id }, { toAccount: id }],
    }).sort({ createdAt: -1 });
    res.json({ success: true, data: transactions });
  } catch (error) {
    next(error);
  }
};

module.exports = { createAccount, getAccounts, getAccount, getAccountTransactions };
