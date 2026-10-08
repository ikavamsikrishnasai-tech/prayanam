const express = require('express');
const Tourist = require('../models/Tourist');
const Alert = require('../models/Alert');
const Incident = require('../models/Incident');
const GeoFence = require('../models/GeoFence');
const { protect, restrictTo } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// GET /api/stats  (admin) - numbers for the police dashboard cards
router.get(
  '/',
  protect,
  restrictTo('admin'),
  asyncHandler(async (req, res) => {
    const [tourists, inDanger, inWarning, openAlerts, criticalAlerts, openIncidents, resolvedIncidents, zones, tracking] =
      await Promise.all([
        Tourist.countDocuments(),
        Tourist.countDocuments({ status: 'danger' }),
        Tourist.countDocuments({ status: 'warning' }),
        Alert.countDocuments({ status: 'open' }),
        Alert.countDocuments({ status: 'open', severity: 'critical' }),
        Incident.countDocuments({ status: { $in: ['open', 'in_progress'] } }),
        Incident.countDocuments({ status: { $in: ['resolved', 'closed'] } }),
        GeoFence.countDocuments({ active: true }),
        Tourist.countDocuments({ trackingEnabled: true }),
      ]);
    res.json({ tourists, inDanger, inWarning, openAlerts, criticalAlerts, openIncidents, resolvedIncidents, zones, tracking });
  })
);

module.exports = router;
