const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
  {
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    byName: String,
    text: { type: String, required: true, maxlength: 1000 },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const incidentSchema = new mongoose.Schema(
  {
    tourist: { type: mongoose.Schema.Types.ObjectId, ref: 'Tourist', required: true, index: true },
    title: { type: String, required: true },
    type: {
      type: String,
      enum: ['sos', 'medical', 'missing', 'restricted-entry', 'anomaly', 'other'],
      default: 'other',
    },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    status: { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' },
    location: { lat: Number, lng: Number },
    description: { type: String, default: '' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: [noteSchema],
    resolvedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Incident', incidentSchema);
