const Alert = require('../models/Alert');
const GeoFence = require('../models/GeoFence');
const Location = require('../models/Location');
const Incident = require('../models/Incident');
const { distanceMeters, insideFence } = require('./geo');

const DEDUPE_MINUTES = 10; // don't spam the same alert type repeatedly

const FENCE_RULES = {
  restricted: { severity: 'critical', label: 'RESTRICTED zone' },
  high: { severity: 'high', label: 'HIGH-RISK zone' },
  moderate: { severity: 'medium', label: 'MODERATE-RISK zone' },
};

async function recentSimilarAlert(touristId, type, extra = {}) {
  const since = new Date(Date.now() - DEDUPE_MINUTES * 60 * 1000);
  return Alert.findOne({ tourist: touristId, type, createdAt: { $gte: since }, ...extra });
}

async function raise(tourist, { type, severity, message, location, geoFence }) {
  const alert = await Alert.create({
    tourist: tourist._id,
    type,
    severity,
    message,
    location,
    geoFence,
  });

  // High/critical alerts automatically open an incident for police to manage.
  if (severity === 'high' || severity === 'critical') {
    const incident = await Incident.create({
      tourist: tourist._id,
      title: message,
      type: type === 'geofence' ? 'restricted-entry' : 'anomaly',
      severity,
      location,
      description: `Auto-generated from ${type} alert.`,
    });
    alert.incident = incident._id;
    await alert.save();
  }
  return alert;
}

// 1. Geo-fence check
async function checkGeoFences(tourist, lat, lng) {
  const fences = await GeoFence.find({ active: true });
  const hits = fences.filter((f) => insideFence(lat, lng, f));
  const raised = [];
  let currentZone = 'safe';
  const rank = { safe: 0, moderate: 1, high: 2, restricted: 3 };

  for (const f of hits) {
    if (rank[f.type] > rank[currentZone]) currentZone = f.type;
    const rule = FENCE_RULES[f.type];
    if (!rule) continue; // entering a safe zone raises nothing
    const dup = await recentSimilarAlert(tourist._id, 'geofence', { geoFence: f._id });
    if (dup) continue;
    raised.push(
      await raise(tourist, {
        type: 'geofence',
        severity: rule.severity,
        message: `Entered ${rule.label}: ${f.name}`,
        location: { lat, lng },
        geoFence: f._id,
      })
    );
  }
  return { raised, currentZone, fences: hits };
}

// 2. Inactivity: no meaningful movement for STOP_MINUTES
async function checkInactivity(tourist, lat, lng) {
  const minutes = Number(process.env.STOP_MINUTES_THRESHOLD || 20);
  const since = new Date(Date.now() - minutes * 60 * 1000);
  const recent = await Location.find({ tourist: tourist._id, recordedAt: { $gte: since } }).sort({ recordedAt: 1 });
  if (recent.length < 3) return null;
  // Need coverage across (most of) the window, not 3 points a few seconds apart.
  const spanMin = (recent[recent.length - 1].recordedAt - recent[0].recordedAt) / 60000;
  if (spanMin < minutes * 0.8) return null;
  const maxMove = Math.max(...recent.map((p) => distanceMeters(lat, lng, p.lat, p.lng)));
  if (maxMove > 30) return null;
  if (await recentSimilarAlert(tourist._id, 'inactivity')) return null;
  return raise(tourist, {
    type: 'inactivity',
    severity: 'high',
    message: `No movement for about ${Math.round(spanMin)} minutes`,
    location: { lat, lng },
  });
}

// 3. Deviation from the planned itinerary
async function checkDeviation(tourist, lat, lng) {
  const thresholdKm = Number(process.env.DEVIATION_KM_THRESHOLD || 5);
  const pts = (tourist.itinerary || []).filter((p) => typeof p.lat === 'number' && typeof p.lng === 'number');
  if (!pts.length) return null;
  const nearestKm = Math.min(...pts.map((p) => distanceMeters(lat, lng, p.lat, p.lng))) / 1000;
  if (nearestKm <= thresholdKm) return null;
  if (await recentSimilarAlert(tourist._id, 'deviation')) return null;
  return raise(tourist, {
    type: 'deviation',
    severity: 'medium',
    message: `Tourist is ${nearestKm.toFixed(1)} km away from the planned itinerary`,
    location: { lat, lng },
  });
}

// 4. Erratic / impossible movement (teleport jumps or heavy back-and-forth)
async function checkErratic(tourist, lat, lng) {
  const last = await Location.find({ tourist: tourist._id }).sort({ recordedAt: -1 }).limit(6);
  if (!last.length) return null;

  const prev = last[0];
  const dtHours = Math.max((Date.now() - prev.recordedAt.getTime()) / 3600000, 1 / 3600);
  const speedKmh = distanceMeters(lat, lng, prev.lat, prev.lng) / 1000 / dtHours;
  let reason = null;
  if (speedKmh > 150 && distanceMeters(lat, lng, prev.lat, prev.lng) > 1000) {
    reason = `Unusual movement speed (${Math.round(speedKmh)} km/h)`;
  }

  // Direction reversals over last few points
  if (!reason && last.length >= 5) {
    const pts = [{ lat, lng }, ...last.map((p) => ({ lat: p.lat, lng: p.lng }))];
    let reversals = 0;
    for (let i = 2; i < pts.length; i++) {
      const d1 = [pts[i - 1].lat - pts[i - 2].lat, pts[i - 1].lng - pts[i - 2].lng];
      const d2 = [pts[i].lat - pts[i - 1].lat, pts[i].lng - pts[i - 1].lng];
      if (d1[0] * d2[0] + d1[1] * d2[1] < 0) reversals++;
    }
    const spread = Math.max(...pts.map((p) => distanceMeters(lat, lng, p.lat, p.lng)));
    if (reversals >= 4 && spread > 50) reason = 'Repeated back-and-forth movement detected';
  }

  if (!reason) return null;
  if (await recentSimilarAlert(tourist._id, 'erratic')) return null;
  return raise(tourist, { type: 'erratic', severity: 'medium', message: reason, location: { lat, lng } });
}

// Safety score: 100 minus penalties for current zone and recent unresolved alerts.
async function computeSafetyScore(tourist, currentZone) {
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const alerts = await Alert.find({ tourist: tourist._id, status: { $ne: 'resolved' }, createdAt: { $gte: since } });
  const sevPenalty = { low: 2, medium: 6, high: 12, critical: 20 };
  const zonePenalty = { safe: 0, moderate: 8, high: 20, restricted: 35 };
  let score = 100 - (zonePenalty[currentZone] || 0);
  for (const a of alerts) score -= sevPenalty[a.severity] || 0;
  return Math.max(0, Math.min(100, score));
}

function statusFromScore(score) {
  if (score >= 75) return 'safe';
  if (score >= 45) return 'warning';
  return 'danger';
}

// Main entry: run all checks for a new GPS point.
async function analyzeLocation(tourist, lat, lng) {
  const alerts = [];
  const geo = await checkGeoFences(tourist, lat, lng);
  alerts.push(...geo.raised);
  for (const check of [checkInactivity, checkDeviation, checkErratic]) {
    const a = await check(tourist, lat, lng);
    if (a) alerts.push(a);
  }
  const score = await computeSafetyScore(tourist, geo.currentZone);
  return { alerts, currentZone: geo.currentZone, zones: geo.fences, safetyScore: score, status: statusFromScore(score) };
}

module.exports = { analyzeLocation, computeSafetyScore, statusFromScore, raise };
