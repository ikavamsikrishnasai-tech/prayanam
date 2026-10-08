const express = require('express');
const Tourist = require('../models/Tourist');
const TouristID = require('../models/TouristID');
const { protect, restrictTo } = require('../middleware/auth');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();
router.use(protect);

async function myTourist(req) {
  const t = await Tourist.findOne({ user: req.user._id });
  if (!t) throw new ApiError(404, 'Tourist profile not found for this account.');
  return t;
}

// GET /api/tourists  (admin) - all tourists with their user info + digital id
router.get(
  '/',
  restrictTo('admin'),
  asyncHandler(async (req, res) => {
    const tourists = await Tourist.find().populate('user', 'name email').sort({ updatedAt: -1 });
    const ids = await TouristID.find({ tourist: { $in: tourists.map((t) => t._id) } });
    const idMap = Object.fromEntries(ids.map((i) => [String(i.tourist), i.touristId]));
    res.json(tourists.map((t) => ({ ...t.toObject(), touristIdCode: idMap[String(t._id)] || null })));
  })
);

// GET /api/tourists/me
router.get(
  '/me',
  restrictTo('tourist'),
  asyncHandler(async (req, res) => {
    const t = await myTourist(req);
    res.json({ ...t.toObject(), user: { name: req.user.name, email: req.user.email } });
  })
);

// PUT /api/tourists/me  - update profile
router.put(
  '/me',
  restrictTo('tourist'),
  asyncHandler(async (req, res) => {
    const t = await myTourist(req);
    const b = req.body;
    const fields = ['phone', 'nationality', 'bloodGroup', 'medicalInfo', 'registeredZone'];
    fields.forEach((f) => {
      if (b[f] !== undefined) t[f] = b[f];
    });
    if (b.emergencyContact) {
      ['name', 'phone', 'relation'].forEach((k) => {
        if (b.emergencyContact[k] !== undefined) t.emergencyContact[k] = b.emergencyContact[k];
      });
    }
    if (Array.isArray(b.itinerary)) t.itinerary = b.itinerary;
    if (b.tripStart) t.tripStart = new Date(b.tripStart);
    if (b.tripEnd) t.tripEnd = new Date(b.tripEnd);
    if (b.name) {
      req.user.name = b.name;
      await req.user.save();
    }
    await t.save();
    res.json(t);
  })
);

// PATCH /api/tourists/me/tracking  - opt-in / opt-out of live tracking
router.patch(
  '/me/tracking',
  restrictTo('tourist'),
  asyncHandler(async (req, res) => {
    if (typeof req.body.enabled !== 'boolean') throw new ApiError(400, '"enabled" must be true or false.');
    const t = await myTourist(req);
    t.trackingEnabled = req.body.enabled;
    await t.save();
    res.json({ trackingEnabled: t.trackingEnabled });
  })
);

// GET /api/tourists/:id (admin)
router.get(
  '/:id',
  restrictTo('admin'),
  asyncHandler(async (req, res) => {
    const t = await Tourist.findById(req.params.id).populate('user', 'name email');
    if (!t) throw new ApiError(404, 'Tourist not found.');
    const id = await TouristID.findOne({ tourist: t._id });
    res.json({ ...t.toObject(), digitalId: id });
  })
);

module.exports = router;
