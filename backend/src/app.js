const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Render/Railway sit behind a proxy; needed for rate limiting to see real IPs.
app.set('trust proxy', 1);

app.use(helmet());

// CORS: allow the frontend URL(s) listed in CLIENT_URL (comma separated).
const allowed = (process.env.CLIENT_URL || "http://localhost:5173",
  "http://localhost:5174","https://prayanam-c142.vercel.app")
  .split(',')
  .map((s) => s.trim().replace(/\/$/, ''))
  .filter(Boolean);
app.use(
  cors({
    origin(origin, cb) {
      // allow tools like curl/Postman (no origin) and listed origins
      if (!origin || allowed.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

app.use('/api', rateLimit({ windowMs: 60 * 1000, limit: 600, standardHeaders: true, legacyHeaders: false }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: true, legacyHeaders: false }));

app.get('/', (req, res) => res.json({ name: 'SafeTour API', status: 'ok' }));
app.get('/api/health', (req, res) =>
  res.json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    time: new Date().toISOString(),
  })
);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/tourists', require('./routes/tourists'));
app.use('/api/locations', require('./routes/locations'));
app.use('/api/sos', require('./routes/sos'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/incidents', require('./routes/incidents'));
app.use('/api/geofences', require('./routes/geofences'));
app.use('/api/ids', require('./routes/ids'));
app.use('/api/stats', require('./routes/stats'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
