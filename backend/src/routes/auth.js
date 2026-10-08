const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Tourist = require('../models/Tourist');
const TouristID = require('../models/TouristID');
const { protect } = require('../middleware/auth');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');
const { requireFields, isEmail } = require('../middleware/validate');
const { generateTouristIdCode, computeHash } = require('../utils/touristId');

const router = express.Router();

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role });

async function issueDigitalId(tourist, name) {
  const last = await TouristID.findOne().sort({ createdAt: -1 });
  const previousHash = last ? last.hash : 'GENESIS';
  const touristId = generateTouristIdCode();
  const hash = computeHash({
    touristId,
    name,
    validFrom: tourist.tripStart,
    validUntil: tourist.tripEnd,
    previousHash,
  });
  return TouristID.create({
    tourist: tourist._id,
    touristId,
    validFrom: tourist.tripStart,
    validUntil: tourist.tripEnd,
    hash,
    previousHash,
  });
}

// POST /api/auth/register
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const b = req.body;
    requireFields(b, ['name', 'email', 'password']);
    if (!isEmail(b.email)) throw new ApiError(400, 'Please provide a valid email address.');
    if (String(b.password).length < 6) throw new ApiError(400, 'Password must be at least 6 characters.');

    let role = 'tourist';
    if (b.role === 'admin') {
      if (!b.adminCode || b.adminCode !== process.env.ADMIN_REGISTRATION_CODE) {
        throw new ApiError(403, 'Invalid police/admin registration code.');
      }
      role = 'admin';
    }

    if (await User.findOne({ email: String(b.email).toLowerCase() })) {
      throw new ApiError(409, 'An account with this email already exists.');
    }

    const user = await User.create({ name: b.name, email: b.email, password: b.password, role });

    let tourist = null;
    let digitalId = null;
    if (role === 'tourist') {
      const tripStart = b.tripStart ? new Date(b.tripStart) : new Date();
      const tripEnd = b.tripEnd ? new Date(b.tripEnd) : new Date(Date.now() + 7 * 86400000);
      if (tripEnd < tripStart) throw new ApiError(400, 'Trip end date must be after trip start date.');
      tourist = await Tourist.create({
        user: user._id,
        nationality: b.nationality || 'Indian',
        phone: b.phone || '',
        documentType: b.documentType === 'Aadhaar-Demo' ? 'Aadhaar-Demo' : 'Passport-Demo',
        documentNumberMasked: 'XXXX-' + String(b.documentLast4 || '0000').slice(-4),
        emergencyContact: {
          name: b.emergencyContact?.name || '',
          phone: b.emergencyContact?.phone || '',
          relation: b.emergencyContact?.relation || '',
        },
        bloodGroup: b.bloodGroup || '',
        medicalInfo: b.medicalInfo || '',
        tripStart,
        tripEnd,
        itinerary: Array.isArray(b.itinerary) ? b.itinerary : [],
        registeredZone: b.registeredZone || 'Visakhapatnam',
      });
      digitalId = await issueDigitalId(tourist, user.name);
    }

    res.status(201).json({ token: signToken(user._id), user: publicUser(user), tourist, digitalId });
  })
);

// POST /api/auth/login
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['email', 'password']);
    const user = await User.findOne({ email: String(req.body.email).toLowerCase() }).select('+password');
    if (!user || !(await user.matchPassword(req.body.password))) {
      throw new ApiError(401, 'Incorrect email or password.');
    }
    res.json({ token: signToken(user._id), user: publicUser(user) });
  })
);

// GET /api/auth/me
router.get(
  '/me',
  protect,
  asyncHandler(async (req, res) => {
    res.json({ user: publicUser(req.user) });
  })
);

module.exports = router;
