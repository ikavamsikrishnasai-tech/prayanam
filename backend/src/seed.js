// Seeds demo geo-fences (Visakhapatnam area) and demo accounts.
// Run with: npm run seed   (safe to run more than once)
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Tourist = require('./models/Tourist');
const TouristID = require('./models/TouristID');
const GeoFence = require('./models/GeoFence');
const { generateTouristIdCode, computeHash } = require('./utils/touristId');

const FENCES = [
  { name: 'RK Beach Tourist Zone', type: 'safe', lat: 17.7142, lng: 83.3231, radiusMeters: 1500, description: 'Popular, patrolled beach area.' },
  { name: 'Kailasagiri Hill Park', type: 'safe', lat: 17.7487, lng: 83.3426, radiusMeters: 1200, description: 'Hilltop park with security.' },
  { name: 'Rushikonda Beach Rip-Current Area', type: 'moderate', lat: 17.7825, lng: 83.3856, radiusMeters: 800, description: 'Strong currents. Swim only in marked zones.' },
  { name: 'Yarada Cliff Edge', type: 'high', lat: 17.6596, lng: 83.2737, radiusMeters: 600, description: 'Unfenced cliff edges and slippery rocks.' },
  { name: 'Naval Dockyard (Restricted)', type: 'restricted', lat: 17.6935, lng: 83.2944, radiusMeters: 900, description: 'Restricted defence area. Entry prohibited.' },
  { name: 'Borra Caves Forest Section', type: 'high', lat: 18.2813, lng: 83.0371, radiusMeters: 1500, description: 'Remote cave and forest area with poor connectivity.' },
];

async function ensureTourist({ name, email, password }) {
  let user = await User.findOne({ email });
  if (user) return user;
  user = await User.create({ name, email, password, role: 'tourist' });
  const tripStart = new Date();
  const tripEnd = new Date(Date.now() + 7 * 86400000);
  const tourist = await Tourist.create({
    user: user._id,
    nationality: 'Indian',
    phone: '9000000001',
    documentType: 'Aadhaar-Demo',
    documentNumberMasked: 'XXXX-1234',
    emergencyContact: { name: 'Demo Contact', phone: '9000000002', relation: 'Parent' },
    bloodGroup: 'B+',
    medicalInfo: 'No known allergies (demo).',
    tripStart,
    tripEnd,
    registeredZone: 'Visakhapatnam',
    itinerary: [
      { day: 1, place: 'RK Beach', lat: 17.7142, lng: 83.3231, note: 'Sunset walk' },
      { day: 2, place: 'Kailasagiri', lat: 17.7487, lng: 83.3426, note: 'Ropeway and view point' },
      { day: 3, place: 'Rushikonda Beach', lat: 17.7825, lng: 83.3856, note: 'Beach day' },
    ],
  });
  const last = await TouristID.findOne().sort({ createdAt: -1 });
  const previousHash = last ? last.hash : 'GENESIS';
  const touristId = generateTouristIdCode();
  await TouristID.create({
    tourist: tourist._id,
    touristId,
    validFrom: tripStart,
    validUntil: tripEnd,
    previousHash,
    hash: computeHash({ touristId, name, validFrom: tripStart, validUntil: tripEnd, previousHash }),
  });
  return user;
}

async function run() {
  await connectDB(process.env.MONGODB_URI);

  if (!(await User.findOne({ email: 'police@safetour.demo' }))) {
    await User.create({ name: 'Inspector Demo', email: 'police@safetour.demo', password: 'police123', role: 'admin' });
    console.log('Created admin: police@safetour.demo / police123');
  }
  await ensureTourist({ name: 'Demo Tourist', email: 'tourist@safetour.demo', password: 'tourist123' });
  console.log('Demo tourist: tourist@safetour.demo / tourist123');

  for (const f of FENCES) {
    const exists = await GeoFence.findOne({ name: f.name });
    if (!exists) {
      await GeoFence.create({ name: f.name, type: f.type, description: f.description, center: { lat: f.lat, lng: f.lng }, radiusMeters: f.radiusMeters });
      console.log(`Created geo-fence: ${f.name}`);
    }
  }
  await mongoose.disconnect();
  console.log('Seed complete.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
