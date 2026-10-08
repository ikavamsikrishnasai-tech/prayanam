const express = require('express');
const GeoFence = require('../models/GeoFence');
const { protect, restrictTo } = require('../middleware/auth');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');
const { requireFields, validateCoords } = require('../middleware/validate');

const router = express.Router();
router.use(protect);

const TYPES = ['safe', 'moderate', 'high', 'restricted'];

// GET /api/geofences - any logged-in user (tourists need these to see risk zones)
router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await GeoFence.find({ active: true }).sort({ createdAt: -1 }));
  })
);

// POST /api/geofences (admin)
router.post(
  '/',
  restrictTo('admin'),
  asyncHandler(async (req, res) => {
    const { name, type, lat, lng, radiusMeters, description } = req.body;
    requireFields(req.body, ['name', 'type', 'lat', 'lng', 'radiusMeters']);
    if (!TYPES.includes(type)) throw new ApiError(400, `type must be one of: ${TYPES.join(', ')}`);
    validateCoords(Number(lat), Number(lng));
    const fence = await GeoFence.create({
      name,
      type,
      description,
      center: { lat: Number(lat), lng: Number(lng) },
      radiusMeters: Number(radiusMeters),
      createdBy: req.user._id,
    });
    res.status(201).json(fence);
  })
);

// PUT /api/geofences/:id (admin)
router.put(
  '/:id',
  restrictTo('admin'),
  asyncHandler(async (req, res) => {
    const fence = await GeoFence.findById(req.params.id);
    if (!fence) throw new ApiError(404, 'Geo-fence not found.');
    const { name, type, lat, lng, radiusMeters, description, active } = req.body;
    if (type !== undefined) {
      if (!TYPES.includes(type)) throw new ApiError(400, `type must be one of: ${TYPES.join(', ')}`);
      fence.type = type;
    }
    if (name !== undefined) fence.name = name;
    if (description !== undefined) fence.description = description;
    if (active !== undefined) fence.active = !!active;
    if (radiusMeters !== undefined) fence.radiusMeters = Number(radiusMeters);
    if (lat !== undefined && lng !== undefined) {
      validateCoords(Number(lat), Number(lng));
      fence.center = { lat: Number(lat), lng: Number(lng) };
    }
    await fence.save();
    res.json(fence);
  })
);

// DELETE /api/geofences/:id (admin)
router.delete(
  '/:id',
  restrictTo('admin'),
  asyncHandler(async (req, res) => {
    const fence = await GeoFence.findByIdAndDelete(req.params.id);
    if (!fence) throw new ApiError(404, 'Geo-fence not found.');
    res.json({ deleted: true });
  })
);

module.exports = router;
