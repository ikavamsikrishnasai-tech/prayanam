const mongoose = require('mongoose');

// Circular geo-fence: simple and easy to explain. Center + radius in meters.
const geoFenceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    type: { type: String, enum: ['safe', 'moderate', 'high', 'restricted'], required: true },
    center: {
      lat: { type: Number, required: true, min: -90, max: 90 },
      lng: { type: Number, required: true, min: -180, max: 180 },
    },
    radiusMeters: { type: Number, required: true, min: 50, max: 100000 },
    active: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('GeoFence', geoFenceSchema);
