const express = require('express');
const Alert = require('../models/Alert');
const Tourist = require('../models/Tourist');
const { protect, restrictTo } = require('../middleware/auth');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();
router.use(protect);

// GET /api/alerts  (admin) - all alerts, optional ?status=open&severity=critical
router.get(
  '/',
  restrictTo('admin'),
  asyncHandler(async (req, res) => {
    const q = {};
    if (req.query.status) q.status = req.query.status;
    if (req.query.severity) q.severity = req.query.severity;
    const alerts = await Alert.find(q)
      .populate({ path: 'tourist', select: 'user', populate: { path: 'user', select: 'name' } })
      .sort({ createdAt: -1 })
      .limit(200);
    res.json(alerts);
  })
);

// GET /api/alerts/me  (tourist) - own alert history
router.get(
  '/me',
  restrictTo('tourist'),
  asyncHandler(async (req, res) => {
    const tourist = await Tourist.findOne({ user: req.user._id });
    if (!tourist) throw new ApiError(404, 'Tourist profile not found.');
    res.json(await Alert.find({ tourist: tourist._id }).sort({ createdAt: -1 }).limit(100));
  })
);

// PATCH /api/alerts/:id  (admin) - acknowledge / resolve
router.patch(
  '/:id',
  restrictTo('admin'),
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (!['open', 'acknowledged', 'resolved'].includes(status)) {
      throw new ApiError(400, 'status must be open, acknowledged or resolved.');
    }
    const alert = await Alert.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true });
    if (!alert) throw new ApiError(404, 'Alert not found.');
    res.json(alert);
  })
);

module.exports = router;
