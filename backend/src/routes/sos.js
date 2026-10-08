const express = require('express');
const Tourist = require('../models/Tourist');
const Alert = require('../models/Alert');
const Incident = require('../models/Incident');
const Location = require('../models/Location');
const TouristID = require('../models/TouristID');
const { protect, restrictTo } = require('../middleware/auth');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');
const { validateCoords } = require('../middleware/validate');

const router = express.Router();
router.use(protect, restrictTo('tourist'));

const EMERGENCY_TYPES = ['medical', 'lost', 'threat', 'accident', 'other'];

// POST /api/sos  - panic button. Always works, even if live tracking is off.
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { lat, lng, emergencyType = 'other', message = '' } = req.body;
    if (!EMERGENCY_TYPES.includes(emergencyType)) {
      throw new ApiError(400, `emergencyType must be one of: ${EMERGENCY_TYPES.join(', ')}`);
    }

    const tourist = await Tourist.findOne({ user: req.user._id });
    if (!tourist) throw new ApiError(404, 'Tourist profile not found.');

    // Fall back to last known location if the device could not provide GPS.
    let location = null;
    if (lat !== undefined && lng !== undefined) {
      validateCoords(lat, lng);
      location = { lat, lng };
    } else if (tourist.lastLocation?.lat !== undefined) {
      location = { lat: tourist.lastLocation.lat, lng: tourist.lastLocation.lng };
    }
    if (!location) throw new ApiError(400, 'No location available. Allow GPS access and try again.');

    const idDoc = await TouristID.findOne({ tourist: tourist._id });
    const description =
      `SOS (${emergencyType}) from ${req.user.name}. ` +
      `Tourist ID: ${idDoc?.touristId || 'N/A'}. ` +
      `Emergency contact: ${tourist.emergencyContact?.name || 'N/A'} ${tourist.emergencyContact?.phone || ''}. ` +
      `Blood group: ${tourist.bloodGroup || 'N/A'}. ${message}`.trim();

    const incident = await Incident.create({
      tourist: tourist._id,
      title: `SOS: ${emergencyType} emergency - ${req.user.name}`,
      type: emergencyType === 'medical' ? 'medical' : 'sos',
      severity: 'critical',
      location,
      description,
    });

    const alert = await Alert.create({
      tourist: tourist._id,
      type: 'sos',
      severity: 'critical',
      message: `SOS (${emergencyType}) triggered by ${req.user.name}`,
      location,
      incident: incident._id,
    });

    await Location.create({ tourist: tourist._id, ...location });
    tourist.lastLocation = { ...location, updatedAt: new Date() };
    tourist.status = 'danger';
    tourist.safetyScore = Math.min(tourist.safetyScore, 25);
    await tourist.save();

    res.status(201).json({
      message: 'SOS sent. Police dashboard has been notified (demo - no real emergency service is contacted).',
      alert,
      incident,
      payload: {
        touristId: idDoc?.touristId,
        name: req.user.name,
        location,
        emergencyContact: tourist.emergencyContact,
        timestamp: alert.createdAt,
        emergencyType,
      },
    });
  })
);

module.exports = router;
