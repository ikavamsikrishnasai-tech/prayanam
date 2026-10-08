import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import MapView from '../components/MapView';
import SosButton from '../components/SosButton';
import { Badge, Card, Empty, SafetyScore, fmt, severityKind, zoneKind } from '../components/Ui';

const SEND_EVERY_MS = 15000;

export default function TouristDashboard() {
  const [tourist, setTourist] = useState(null);
  const [zones, setZones] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [trail, setTrail] = useState([]);
  const [pos, setPos] = useState(null); // {lat,lng}
  const [mode, setMode] = useState('simulate'); // 'gps' | 'simulate'
  const [currentZone, setCurrentZone] = useState('safe');
  const [banner, setBanner] = useState(null);
  const [error, setError] = useState('');
  const posRef = useRef(null);
  const lastSent = useRef(0);

  const load = useCallback(async () => {
    try {
      const [t, z, a, l] = await Promise.all([
        api.get('/tourists/me'),
        api.get('/geofences'),
        api.get('/alerts/me'),
        api.get('/locations/me?limit=50'),
      ]);
      setTourist(t);
      setZones(z);
      setAlerts(a);
      setTrail(l);
      if (t.lastLocation?.lat !== undefined && !posRef.current) {
        const p = { lat: t.lastLocation.lat, lng: t.lastLocation.lng };
        posRef.current = p;
        setPos(p);
      }
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sendLocation = useCallback(
    async (lat, lng) => {
      try {
        const d = await api.post('/locations', { lat, lng });
        setCurrentZone(d.currentZone);
        setTourist((t) => (t ? { ...t, safetyScore: d.safetyScore, status: d.status } : t));
        if (d.newAlerts?.length) {
          setBanner(d.newAlerts[0]);
          const a = await api.get('/alerts/me');
          setAlerts(a);
        }
        const l = await api.get('/locations/me?limit=50');
        setTrail(l);
        lastSent.current = Date.now();
        setError('');
      } catch (e) {
        setError(e.message);
      }
    },
    []
  );

  async function toggleTracking() {
    try {
      const d = await api.patch('/tourists/me/tracking', { enabled: !tourist.trackingEnabled });
      setTourist({ ...tourist, trackingEnabled: d.trackingEnabled });
    } catch (e) {
      setError(e.message);
    }
  }

  // Real GPS mode
  useEffect(() => {
    if (mode !== 'gps' || !tourist?.trackingEnabled) return;
    if (!navigator.geolocation) {
      setError('This browser does not support GPS.');
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (p) => {
        const np = { lat: p.coords.latitude, lng: p.coords.longitude };
        posRef.current = np;
        setPos(np);
        if (Date.now() - lastSent.current > SEND_EVERY_MS) sendLocation(np.lat, np.lng);
      },
      (err) => setError(`GPS error: ${err.message}`),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [mode, tourist?.trackingEnabled, sendLocation]);

  // Demo mode: jump to a point (map click or zone button)
  function simulateAt(lat, lng) {
    if (mode !== 'simulate') return;
    const np = { lat, lng };
    posRef.current = np;
    setPos(np);
    if (tourist?.trackingEnabled) sendLocation(lat, lng);
    else setError('Turn on live tracking (opt-in) first so your location can be shared.');
  }

  if (!tourist) return <div className="page">{error ? <p className="error">{error}</p> : <p>Loading...</p>}</div>;

  const trackingOn = tourist.trackingEnabled;

  return (
    <div className="page">
      {banner && (
        <div className={`banner banner-${banner.severity}`}>
          <div>
            <strong>Safety alert:</strong> {banner.message}
          </div>
          <button className="btn btn-ghost small" onClick={() => setBanner(null)}>
            Dismiss
          </button>
        </div>
      )}
      {error && <p className="error">{error}</p>}

      <div className="grid-dash">
        <Card title="Your safety">
          <SafetyScore score={tourist.safetyScore} status={tourist.status} />
          <p className="muted center">
            Current zone: <Badge kind={zoneKind(currentZone)}>{currentZone.toUpperCase()}</Badge>
          </p>
        </Card>

        <Card title="Live tracking">
          <div className="row-between">
            <div>
              <Badge kind={trackingOn ? 'ok' : 'neutral'}>{trackingOn ? 'TRACKING ON' : 'TRACKING OFF'}</Badge>
              <p className="muted small">Sharing your location is optional. You can turn it off anytime. SOS always works.</p>
            </div>
            <button className={`btn ${trackingOn ? 'btn-ghost' : ''}`} onClick={toggleTracking}>
              {trackingOn ? 'Turn off' : 'Turn on'}
            </button>
          </div>
          <div className="seg" style={{ marginTop: 12 }}>
            <button className={mode === 'simulate' ? 'on' : ''} onClick={() => setMode('simulate')}>
              Demo (click map)
            </button>
            <button className={mode === 'gps' ? 'on' : ''} onClick={() => setMode('gps')}>
              Real GPS
            </button>
          </div>
          {mode === 'simulate' && (
            <p className="muted small">Demo mode: click anywhere on the map, or a zone below, to pretend you are there.</p>
          )}
          <p className="muted small">
            Last update: {tourist.lastLocation?.updatedAt ? fmt(tourist.lastLocation.updatedAt) : 'none yet'}
          </p>
        </Card>

        <Card title="Trip">
          <p>
            <strong>{tourist.registeredZone}</strong>
          </p>
          <p className="muted small">
            {new Date(tourist.tripStart).toLocaleDateString()} - {new Date(tourist.tripEnd).toLocaleDateString()}
          </p>
          <ul className="plain">
            {tourist.itinerary?.length ? (
              tourist.itinerary.map((i, k) => (
                <li key={k}>
                  Day {i.day}: {i.place}
                </li>
              ))
            ) : (
              <li className="muted">No itinerary added. Add one in Profile.</li>
            )}
          </ul>
        </Card>
      </div>

      <Card title="Live map & risk zones">
        <MapView
          center={pos ? [pos.lat, pos.lng] : [17.72, 83.31]}
          zones={zones}
          me={pos}
          trail={trail}
          onMapClick={mode === 'simulate' ? simulateAt : undefined}
          followMe={mode === 'gps'}
        />
        <div className="legend">
          <span><i style={{ background: '#16a34a' }} />Safe</span>
          <span><i style={{ background: '#d97706' }} />Moderate</span>
          <span><i style={{ background: '#ea580c' }} />High risk</span>
          <span><i style={{ background: '#b91c1c' }} />Restricted</span>
        </div>
        {mode === 'simulate' && (
          <div className="chips">
            {zones.map((z) => (
              <button key={z._id} className="chip" onClick={() => simulateAt(z.center.lat, z.center.lng)}>
                Go to: {z.name}
              </button>
            ))}
          </div>
        )}
      </Card>

      <Card title="Recent alerts">
        {alerts.length === 0 ? (
          <Empty>No alerts. You are all clear.</Empty>
        ) : (
          <ul className="list">
            {alerts.slice(0, 5).map((a) => (
              <li key={a._id}>
                <Badge kind={severityKind(a.severity)}>{a.severity}</Badge> {a.message}
                <small className="muted"> - {fmt(a.createdAt)}</small>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <SosButton
        getPosition={() => posRef.current}
        onSent={() => {
          load();
        }}
      />
    </div>
  );
}
