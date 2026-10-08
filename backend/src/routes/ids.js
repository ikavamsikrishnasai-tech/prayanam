const express = require('express');
const TouristID = require('../models/TouristID');
const Tourist = require('../models/Tourist');
const { protect, restrictTo } = require('../middleware/auth');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');
const { computeHash } = require('../utils/touristId');

const router = express.Router();

// GET /api/ids/verify/:code  - PUBLIC. Lets a check-post "scan" an ID and verify it hasn't been tampered with.
router.get(
  '/verify/:code',
  asyncHandler(async (req, res) => {
    const id = await TouristID.findOne({ touristId: req.params.code.toUpperCase() }).populate({
      path: 'tourist',
      populate: { path: 'user', select: 'name' },
    });
    if (!id) return res.json({ valid: false, reason: 'ID not found' });
    const expected = computeHash({
      touristId: id.touristId,
      name: id.tourist?.user?.name,
      validFrom: id.validFrom,
      validUntil: id.validUntil,
      previousHash: id.previousHash,
    });
    const intact = expected === id.hash;
    const expired = id.validUntil && id.validUntil < new Date();
    res.json({
      valid: intact && id.status === 'active' && !expired,
      integrityOk: intact,
      status: expired ? 'expired' : id.status,
      name: id.tourist?.user?.name,
      touristId: id.touristId,
      validUntil: id.validUntil,
    });
  })
);

router.use(protect);

// GET /api/ids/me  (tourist)
router.get(
  '/me',
  restrictTo('tourist'),
  asyncHandler(async (req, res) => {
    const tourist = await Tourist.findOne({ user: req.user._id });
    if (!tourist) throw new ApiError(404, 'Tourist profile not found.');
    const id = await TouristID.findOne({ tourist: tourist._id });
    if (!id) throw new ApiError(404, 'Digital ID not found.');
    res.json({ digitalId: id, tourist, name: req.user.name });
  })
);

// GET /api/ids  (admin)
router.get(
  '/',
  restrictTo('admin'),
  asyncHandler(async (req, res) => {
    res.json(
      await TouristID.find()
        .populate({ path: 'tourist', select: 'user', populate: { path: 'user', select: 'name' } })
        .sort({ createdAt: -1 })
    );
  })
);

// PATCH /api/ids/:id/revoke  (admin)
router.patch(
  '/:id/revoke',
  restrictTo('admin'),
  asyncHandler(async (req, res) => {
    const id = await TouristID.findByIdAndUpdate(req.params.id, { status: 'revoked' }, { new: true });
    if (!id) throw new ApiError(404, 'ID not found.');
    res.json(id);
  })
);

module.exports = router;
