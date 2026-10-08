const mongoose = require('mongoose');

const itinerarySchema = new mongoose.Schema(
  {
    day: Number,
    place: String,
    lat: Number,
    lng: Number,
    note: String,
  },
  { _id: false }
);

const touristSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    nationality: { type: String, default: 'Indian' },
    phone: { type: String, default: '' },
    // Demo document number only. Never store real Aadhaar/passport numbers in this prototype.
    documentType: { type: String, enum: ['Aadhaar-Demo', 'Passport-Demo'], default: 'Passport-Demo' },
    documentNumberMasked: { type: String, default: 'XXXX-DEMO' },
    emergencyContact: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' },
      relation: { type: String, default: '' },
    },
    bloodGroup: { type: String, default: '' },
    medicalInfo: { type: String, default: '' },
    tripStart: { type: Date },
    tripEnd: { type: Date },
    itinerary: [itinerarySchema],
    registeredZone: { type: String, default: 'Visakhapatnam' },
    trackingEnabled: { type: Boolean, default: false }, // opt-in live tracking
    safetyScore: { type: Number, default: 100, min: 0, max: 100 },
    status: { type: String, enum: ['safe', 'warning', 'danger'], default: 'safe' },
    lastLocation: {
      lat: Number,
      lng: Number,
      updatedAt: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Tourist', touristSchema);
