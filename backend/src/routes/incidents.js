const express = require('express');
const Incident = require('../models/Incident');
const Alert = require('../models/Alert');
const Tourist = require('../models/Tourist');
const { protect, restrictTo } = require('../middleware/auth');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');
const { requireFields } = require('../middleware/validate');

const router = express.Router();
router.use(protect);

const touristPopulate = { path: 'tourist', select: 'user', populate: { path: 'user', select: 'name email' } };

// GET /api/incidents  (admin) - ?status=open
router.get(
  '/',
  restrictTo('admin'),
  asyncHandler(async (req, res) => {
    const q = {};
    if (req.query.status) q.status = req.query.status;
    res.json(await Incident.find(q).populate(touristPopulate).populate('assignedTo', 'name').sort({ createdAt: -1 }).limit(200));
  })
);

// GET /api/incidents/me  (tourist)
router.get(
  '/me',
  restrictTo('tourist'),
  asyncHandler(async (req, res) => {
    const tourist = await Tourist.findOne({ user: req.user._id });
    if (!tourist) throw new ApiError(404, 'Tourist profile not found.');
    res.json(await Incident.find({ tourist: tourist._id }).sort({ createdAt: -1 }).limit(100));
  })
);

// GET /api/incidents/:id (admin)
router.get(
  '/:id',
  restrictTo('admin'),
  asyncHandler(async (req, res) => {
    const inc = await Incident.findById(req.params.id).populate(touristPopulate).populate('assignedTo', 'name');
    if (!inc) throw new ApiError(404, 'Incident not found.');
    res.json(inc);
  })
);

// PATCH /api/incidents/:id  (admin) - change status / assign to self
router.patch(
  '/:id',
  restrictTo('admin'),
  asyncHandler(async (req, res) => {
    const inc = await Incident.findById(req.params.id);
    if (!inc) throw new ApiError(404, 'Incident not found.');

    if (req.body.status) {
      if (!['open', 'in_progress', 'resolved', 'closed'].includes(req.body.status)) {
        throw new ApiError(400, 'Invalid status.');
      }
      inc.status = req.body.status;
      if (['resolved', 'closed'].includes(inc.status)) {
        inc.resolvedAt = new Date();
        // Resolving an incident also resolves its linked alerts.
        await Alert.updateMany({ incident: inc._id }, { status: 'resolved' });
        // Restore tourist status once nothing is open for them.
        const stillOpen = await Incident.countDocuments({
          tourist: inc.tourist,
          _id: { $ne: inc._id },
          status: { $in: ['open', 'in_progress'] },
        });
        if (!stillOpen) await Tourist.findByIdAndUpdate(inc.tourist, { status: 'safe', safetyScore: 100 });
      } else {
        inc.resolvedAt = undefined;
      }
    }
    if (req.body.assignToMe) inc.assignedTo = req.user._id;
    await inc.save();
    res.json(inc);
  })
);

// POST /api/incidents/:id/notes  (admin)
router.post(
  '/:id/notes',
  restrictTo('admin'),
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['text']);
    const inc = await Incident.findById(req.params.id);
    if (!inc) throw new ApiError(404, 'Incident not found.');
    inc.notes.push({ by: req.user._id, byName: req.user.name, text: String(req.body.text).slice(0, 1000) });
    await inc.save();
    res.status(201).json(inc);
  })
);

module.exports = router;
