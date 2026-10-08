const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
  {
    tourist: { type: mongoose.Schema.Types.ObjectId, ref: 'Tourist', required: true, index: true },
    lat: { type: Number, required: true, min: -90, max: 90 },
    lng: { type: Number, required: true, min: -180, max: 180 },
    accuracy: { type: Number },
    speed: { type: Number },
    recordedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

locationSchema.index({ tourist: 1, recordedAt: -1 });

module.exports = mongoose.model('Location', locationSchema);
