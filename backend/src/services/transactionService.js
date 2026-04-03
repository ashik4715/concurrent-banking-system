const Account = require('../models/Account');
const Transaction = require('../models/Transaction');

const MAX_RETRIES = 3;

class TransactionService {
  constructor(io) {
    this.io = io;
  }

  emit(event, data) {
    if (this.io) {
      this.io.emit(event, data);
    }
  }

  async deposit(accountId, amount) {
    const account = await Account.findOne({ accountId });
    if (!account) {
      const tx = await Transaction.create({
        type: 'deposit',
        toAccount: accountId,
        amount,
        status: 'failed',
        errorMessage: 'Account not found',
      });
      this.emit('transaction:failed', tx);
      throw new Error('Account not found');
    }

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const current = await Account.findOne({ accountId });
      const newBalance = current.balance + amount;

      const result = await Account.findOneAndUpdate(
        { accountId, version: current.version },
        { $set: { balance: newBalance }, $inc: { version: 1 } },
        { new: true }
      );

      if (result) {
        const tx = await Transaction.create({
          type: 'deposit',
          toAccount: accountId,
          amount,
          status: 'success',
        });
        this.emit('transaction:created', tx);
        this.emit('balance:updated', {
          accountId: result.accountId,
          balance: result.balance,
          version: result.version,
        });
        return { account: result, transaction: tx };
      }
    }

    const tx = await Transaction.create({
      type: 'deposit',
      toAccount: accountId,
      amount,
      status: 'failed',
      errorMessage: 'Concurrency conflict: max retries exceeded',
    });
    this.emit('transaction:failed', tx);
    throw new Error('Concurrency conflict: max retries exceeded for deposit');
  }

  async withdraw(accountId, amount) {
    const account = await Account.findOne({ accountId });
    if (!account) {
      const tx = await Transaction.create({
        type: 'withdraw',
        fromAccount: accountId,
        amount,
        status: 'failed',
        errorMessage: 'Account not found',
      });
      this.emit('transaction:failed', tx);
      throw new Error('Account not found');
    }

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const current = await Account.findOne({ accountId });

      if (current.balance < amount) {
        const tx = await Transaction.create({
          type: 'withdraw',
          fromAccount: accountId,
          amount,
          status: 'failed',
          errorMessage: 'Insufficient balance',
        });
        this.emit('transaction:failed', tx);
        throw new Error('Insufficient balance');
      }

      const newBalance = current.balance - amount;

      const result = await Account.findOneAndUpdate(
        { accountId, version: current.version },
        { $set: { balance: newBalance }, $inc: { version: 1 } },
        { new: true }
      );

      if (result) {
        const tx = await Transaction.create({
          type: 'withdraw',
          fromAccount: accountId,
          amount,
          status: 'success',
        });
        this.emit('transaction:created', tx);
        this.emit('balance:updated', {
          accountId: result.accountId,
          balance: result.balance,
          version: result.version,
        });
        return { account: result, transaction: tx };
      }
    }

    const tx = await Transaction.create({
      type: 'withdraw',
      fromAccount: accountId,
      amount,
      status: 'failed',
      errorMessage: 'Concurrency conflict: max retries exceeded',
    });
    this.emit('transaction:failed', tx);
    throw new Error('Concurrency conflict: max retries exceeded for withdrawal');
  }

  async transfer(fromAccountId, toAccountId, amount) {
    if (fromAccountId === toAccountId) {
      const tx = await Transaction.create({
        type: 'transfer',
        fromAccount: fromAccountId,
        toAccount: toAccountId,
        amount,
        status: 'failed',
        errorMessage: 'Cannot transfer to the same account',
      });
      this.emit('transaction:failed', tx);
      throw new Error('Cannot transfer to the same account');
    }

    const fromAccount = await Account.findOne({ accountId: fromAccountId });
    const toAccount = await Account.findOne({ accountId: toAccountId });

    if (!fromAccount || !toAccount) {
      const tx = await Transaction.create({
        type: 'transfer',
        fromAccount: fromAccountId,
        toAccount: toAccountId,
        amount,
        status: 'failed',
        errorMessage: 'One or both accounts not found',
      });
      this.emit('transaction:failed', tx);
      throw new Error('One or both accounts not found');
    }

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const currentFrom = await Account.findOne({ accountId: fromAccountId });
      const currentTo = await Account.findOne({ accountId: toAccountId });

      if (currentFrom.balance < amount) {
        const tx = await Transaction.create({
          type: 'transfer',
          fromAccount: fromAccountId,
          toAccount: toAccountId,
          amount,
          status: 'failed',
          errorMessage: 'Insufficient balance',
        });
        this.emit('transaction:failed', tx);
        throw new Error('Insufficient balance');
      }

      const newFromBalance = currentFrom.balance - amount;
      const newToBalance = currentTo.balance + amount;

      const updatedFrom = await Account.findOneAndUpdate(
        { accountId: fromAccountId, version: currentFrom.version },
        { $set: { balance: newFromBalance }, $inc: { version: 1 } },
        { new: true }
      );

      if (!updatedFrom) continue;

      const updatedTo = await Account.findOneAndUpdate(
        { accountId: toAccountId, version: currentTo.version },
        { $set: { balance: newToBalance }, $inc: { version: 1 } },
        { new: true }
      );

      if (!updatedTo) {
        // Rollback the source debit — retry to ensure it succeeds
        for (let rb = 0; rb < MAX_RETRIES; rb++) {
          const rbSource = await Account.findOne({ accountId: fromAccountId });
          const rbResult = await Account.findOneAndUpdate(
            { accountId: fromAccountId, version: rbSource.version },
            { $set: { balance: rbSource.balance + amount }, $inc: { version: 1 } },
            { new: true }
          );
          if (rbResult) break;
        }
        continue;
      }

      const tx = await Transaction.create({
        type: 'transfer',
        fromAccount: fromAccountId,
        toAccount: toAccountId,
        amount,
        status: 'success',
      });
      this.emit('transaction:created', tx);
      this.emit('balance:updated', {
        accountId: updatedFrom.accountId,
        balance: updatedFrom.balance,
        version: updatedFrom.version,
      });
      this.emit('balance:updated', {
        accountId: updatedTo.accountId,
        balance: updatedTo.balance,
        version: updatedTo.version,
      });
      return { fromAccount: updatedFrom, toAccount: updatedTo, transaction: tx };
    }

    const tx = await Transaction.create({
      type: 'transfer',
      fromAccount: fromAccountId,
      toAccount: toAccountId,
      amount,
      status: 'failed',
      errorMessage: 'Concurrency conflict: max retries exceeded',
    });
    this.emit('transaction:failed', tx);
    throw new Error('Concurrency conflict: max retries exceeded for transfer');
  }
}

module.exports = TransactionService;
