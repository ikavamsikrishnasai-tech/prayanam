const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    tourist: { type: mongoose.Schema.Types.ObjectId, ref: 'Tourist', required: true, index: true },
    type: {
      type: String,
      enum: ['sos', 'geofence', 'inactivity', 'deviation', 'erratic', 'manual'],
      required: true,
    },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    message: { type: String, required: true },
    location: { lat: Number, lng: Number },
    geoFence: { type: mongoose.Schema.Types.ObjectId, ref: 'GeoFence' },
    status: { type: String, enum: ['open', 'acknowledged', 'resolved'], default: 'open' },
    incident: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Alert', alertSchema);
