const express = require('express');
const Tourist = require('../models/Tourist');
const Location = require('../models/Location');
const { protect, restrictTo } = require('../middleware/auth');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');
const { validateCoords } = require('../middleware/validate');
const { analyzeLocation } = require('../utils/riskEngine');

const router = express.Router();
router.use(protect);

// POST /api/locations  (tourist) - store a GPS point and run risk detection
router.post(
  '/',
  restrictTo('tourist'),
  asyncHandler(async (req, res) => {
    const { lat, lng, accuracy, speed } = req.body;
    validateCoords(lat, lng);

    const tourist = await Tourist.findOne({ user: req.user._id });
    if (!tourist) throw new ApiError(404, 'Tourist profile not found.');
    if (!tourist.trackingEnabled) {
      throw new ApiError(403, 'Live tracking is turned off. Enable tracking (opt-in) to share your location.');
    }

    // Run analysis BEFORE saving so movement checks compare against previous points.
    const result = await analyzeLocation(tourist, lat, lng);

    await Location.create({ tourist: tourist._id, lat, lng, accuracy, speed });
    tourist.lastLocation = { lat, lng, updatedAt: new Date() };
    tourist.safetyScore = result.safetyScore;
    tourist.status = result.status;
    await tourist.save();

    res.status(201).json({
      saved: true,
      currentZone: result.currentZone,
      zones: result.zones.map((z) => ({ id: z._id, name: z.name, type: z.type })),
      safetyScore: result.safetyScore,
      status: result.status,
      newAlerts: result.alerts,
    });
  })
);

// GET /api/locations/me?limit=100  (tourist) - own history
router.get(
  '/me',
  restrictTo('tourist'),
  asyncHandler(async (req, res) => {
    const tourist = await Tourist.findOne({ user: req.user._id });
    if (!tourist) throw new ApiError(404, 'Tourist profile not found.');
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const points = await Location.find({ tourist: tourist._id }).sort({ recordedAt: -1 }).limit(limit);
    res.json(points);
  })
);

// GET /api/locations/latest  (admin) - last known position of every tourist who has shared one
router.get(
  '/latest',
  restrictTo('admin'),
  asyncHandler(async (req, res) => {
    const tourists = await Tourist.find({ 'lastLocation.lat': { $exists: true } }).populate('user', 'name');
    res.json(
      tourists.map((t) => ({
        touristId: t._id,
        name: t.user?.name,
        lat: t.lastLocation.lat,
        lng: t.lastLocation.lng,
        updatedAt: t.lastLocation.updatedAt,
        status: t.status,
        safetyScore: t.safetyScore,
      }))
    );
  })
);

// GET /api/locations/tourist/:id  (admin) - trail for one tourist
router.get(
  '/tourist/:id',
  restrictTo('admin'),
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 200, 1000);
    res.json(await Location.find({ tourist: req.params.id }).sort({ recordedAt: -1 }).limit(limit));
  })
);

module.exports = router;
