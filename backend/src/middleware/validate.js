const { ApiError } = require('./errorHandler');

// Tiny validation helpers (keeps dependencies low for beginners).
const isEmail = (v) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

function requireFields(body, fields) {
  const missing = fields.filter((f) => body[f] === undefined || body[f] === null || body[f] === '');
  if (missing.length) throw new ApiError(400, `Missing required field(s): ${missing.join(', ')}`);
}

function validateCoords(lat, lng) {
  if (!isNum(lat) || !isNum(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new ApiError(400, 'lat and lng must be valid numbers (lat -90..90, lng -180..180).');
  }
}

module.exports = { isEmail, isNum, requireFields, validateCoords };
