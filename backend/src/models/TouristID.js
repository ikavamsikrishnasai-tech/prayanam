const mongoose = require('mongoose');

// Digital Tourist ID. The `hash` field is a SHA-256 fingerprint of the ID's contents,
// chained to the previous ID's hash. This is a simple tamper-evidence demo,
// not a real blockchain.
const touristIdSchema = new mongoose.Schema(
  {
    tourist: { type: mongoose.Schema.Types.ObjectId, ref: 'Tourist', required: true, unique: true },
    touristId: { type: String, required: true, unique: true },
    issuedAt: { type: Date, default: Date.now },
    validFrom: { type: Date },
    validUntil: { type: Date },
    hash: { type: String, required: true },
    previousHash: { type: String, default: 'GENESIS' },
    status: { type: String, enum: ['active', 'expired', 'revoked'], default: 'active' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TouristID', touristIdSchema);
