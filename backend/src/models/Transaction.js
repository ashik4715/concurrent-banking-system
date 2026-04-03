const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ['deposit', 'withdraw', 'transfer'],
    },
    fromAccount: {
      type: String,
      default: null,
    },
    toAccount: {
      type: String,
      default: null,
    },
    amount: {
      type: Number,
      required: true,
      min: [0.01, 'Amount must be positive'],
    },
    status: {
      type: String,
      required: true,
      enum: ['success', 'failed'],
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ fromAccount: 1, createdAt: -1 });
transactionSchema.index({ toAccount: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
