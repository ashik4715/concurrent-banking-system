const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema(
  {
    accountId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    holderName: {
      type: String,
      required: true,
      trim: true,
    },
    balance: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Balance cannot be negative'],
    },
    version: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

accountSchema.index({ accountId: 1, version: 1 });

module.exports = mongoose.model('Account', accountSchema);
