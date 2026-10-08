const crypto = require('crypto');

function generateTouristIdCode() {
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  const year = new Date().getFullYear();
  return `STM-${year}-${rand}`;
}

// SHA-256 fingerprint of the ID contents + previous hash (simple tamper-evidence demo).
function computeHash({ touristId, name, validFrom, validUntil, previousHash }) {
  const payload = [
    touristId,
    name,
    validFrom ? new Date(validFrom).toISOString() : '',
    validUntil ? new Date(validUntil).toISOString() : '',
    previousHash,
  ].join('|');
  return crypto.createHash('sha256').update(payload).digest('hex');
}

module.exports = { generateTouristIdCode, computeHash };
