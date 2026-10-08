import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import MapView from '../components/MapView';
import { Badge, Card, Empty, fmt, severityKind, statusKind, zoneKind } from '../components/Ui';

const TABS = ['Overview', 'Tourists', 'Alerts', 'Incidents', 'Risk zones'];

export default function PoliceDashboard() {
  const [tab, setTab] = useState('Overview');
  const [stats, setStats] = useState(null);
  const [tourists, setTourists] = useState([]);
  const [positions, setPositions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [zones, setZones] = useState([]);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [updated, setUpdated] = useState(null);

  const load = useCallback(async () => {
    try {
      const [s, t, p, a, i, z] = await Promise.all([
        api.get('/stats'),
        api.get('/tourists'),
        api.get('/locations/latest'),
        api.get('/alerts'),
        api.get('/incidents'),
        api.get('/geofences'),
      ]);
      setStats(s);
      setTourists(t);
      setPositions(p);
      setAlerts(a);
      setIncidents(i);
      setZones(z);
      setUpdated(new Date());
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 10000); // auto refresh every 10s
    return () => clearInterval(id);
  }, [load]);

  async function setAlertStatus(id, status) {
    await api.patch(`/alerts/${id}`, { status });
    load();
  }

  return (
    <div className="page">
      <div className="row-between">
        <h2 style={{ margin: 0 }}>Police Command Centre</h2>
        <small className="muted">Auto-refresh 10s - last: {updated ? updated.toLocaleTimeString() : '-'}</small>
      </div>
      {error && <p className="error">{error}</p>}

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
            {t}
            {t === 'Alerts' && stats?.openAlerts ? <span className="pill">{stats.openAlerts}</span> : null}
            {t === 'Incidents' && stats?.openIncidents ? <span className="pill">{stats.openIncidents}</span> : null}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <>
          {stats && (
            <div className="stats">
              <Stat label="Registered tourists" value={stats.tourists} />
              <Stat label="Sharing location" value={stats.tracking} />
              <Stat label="In danger" value={stats.inDanger} tone="danger" />
              <Stat label="Warnings" value={stats.inWarning} tone="warn" />
              <Stat label="Open alerts" value={stats.openAlerts} tone={stats.criticalAlerts ? 'danger' : ''} />
              <Stat label="Open incidents" value={stats.openIncidents} />
              <Stat label="Resolved" value={stats.resolvedIncidents} tone="ok" />
              <Stat label="Risk zones" value={stats.zones} />
            </div>
          )}
          <Card title="Live tourist map">
            <MapView center={[17.72, 83.31]} zones={zones} tourists={positions} height={460} />
            <div className="legend">
              <span><i style={{ background: '#16a34a' }} />Tourist safe</span>
              <span><i style={{ background: '#d97706' }} />Warning</span>
              <span><i style={{ background: '#dc2626' }} />Danger</span>
            </div>
          </Card>
          <Card title="Latest open alerts">
            <AlertTable alerts={alerts.filter((a) => a.status !== 'resolved').slice(0, 5)} onStatus={setAlertStatus} />
          </Card>
        </>
      )}

      {tab === 'Tourists' && (
        <Card title={`Tourists (${tourists.length})`}>
          {tourists.length === 0 ? (
            <Empty>No tourists registered yet.</Empty>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Name</th><th>Tourist ID</th><th>Status</th><th>Score</th><th>Tracking</th><th>Last seen</th><th>Emergency contact</th></tr>
                </thead>
                <tbody>
                  {tourists.map((t) => (
                    <tr key={t._id} onClick={() => setSelected(t)} className="clickable">
                      <td>{t.user?.name}</td>
                      <td><code>{t.touristIdCode}</code></td>
                      <td><Badge kind={statusKind(t.status)}>{t.status}</Badge></td>
                      <td>{t.safetyScore}</td>
                      <td>{t.trackingEnabled ? 'On' : 'Off'}</td>
                      <td>{t.lastLocation?.updatedAt ? fmt(t.lastLocation.updatedAt) : '-'}</td>
                      <td>{t.emergencyContact?.name} {t.emergencyContact?.phone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {selected && (
            <div className="detail">
              <h4>{selected.user?.name} <small className="muted">({selected.user?.email})</small></h4>
              <p>Blood group: {selected.bloodGroup || '-'} | Medical: {selected.medicalInfo || '-'} | Phone: {selected.phone || '-'}</p>
              <p>Trip: {fmt(selected.tripStart)} to {fmt(selected.tripEnd)}</p>
              <p>Itinerary: {selected.itinerary?.map((i) => i.place).join(' > ') || '-'}</p>
            </div>
          )}
        </Card>
      )}

      {tab === 'Alerts' && (
        <Card title={`Alerts (${alerts.length})`}>
          <AlertTable alerts={alerts} onStatus={setAlertStatus} />
        </Card>
      )}

      {tab === 'Incidents' && <Incidents incidents={incidents} reload={load} />}

      {tab === 'Risk zones' && <Zones zones={zones} reload={load} />}
    </div>
  );
}

function Stat({ label, value, tone = '' }) {
  return (
    <div className={`stat ${tone}`}>
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}

function AlertTable({ alerts, onStatus }) {
  if (!alerts.length) return <Empty>No alerts.</Empty>;
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Time</th><th>Tourist</th><th>Type</th><th>Severity</th><th>Message</th><th>Status</th><th /></tr></thead>
        <tbody>
          {alerts.map((a) => (
            <tr key={a._id}>
              <td>{fmt(a.createdAt)}</td>
              <td>{a.tourist?.user?.name || '-'}</td>
              <td>{a.type}</td>
              <td><Badge kind={severityKind(a.severity)}>{a.severity}</Badge></td>
              <td>{a.message}</td>
              <td>{a.status}</td>
              <td className="nowrap">
                {a.status === 'open' && <button className="btn small" onClick={() => onStatus(a._id, 'acknowledged')}>Acknowledge</button>}{' '}
                {a.status !== 'resolved' && <button className="btn btn-ghost small" onClick={() => onStatus(a._id, 'resolved')}>Resolve</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Incidents({ incidents, reload }) {
  const [filter, setFilter] = useState('active');
  const [open, setOpen] = useState(null);
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');

  const list = incidents.filter((i) => (filter === 'active' ? ['open', 'in_progress'].includes(i.status) : filter === 'done' ? ['resolved', 'closed'].includes(i.status) : true));
  const current = incidents.find((i) => i._id === open);

  async function update(id, body) {
    try {
      await api.patch(`/incidents/${id}`, body);
      await reload();
    } catch (e) {
      setErr(e.message);
    }
  }
  async function addNote(id) {
    if (!note.trim()) return;
    try {
      await api.post(`/incidents/${id}/notes`, { text: note });
      setNote('');
      await reload();
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <Card
      title="Incident management"
      action={
        <div className="seg">
          {[['active', 'Active'], ['done', 'Resolved'], ['all', 'All']].map(([v, l]) => (
            <button key={v} className={filter === v ? 'on' : ''} onClick={() => setFilter(v)}>{l}</button>
          ))}
        </div>
      }
    >
      {err && <p className="error">{err}</p>}
      {list.length === 0 ? (
        <Empty>No incidents in this view.</Empty>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Opened</th><th>Tourist</th><th>Title</th><th>Severity</th><th>Status</th><th>Assigned</th></tr></thead>
            <tbody>
              {list.map((i) => (
                <tr key={i._id} className="clickable" onClick={() => setOpen(i._id)}>
                  <td>{fmt(i.createdAt)}</td>
                  <td>{i.tourist?.user?.name || '-'}</td>
                  <td>{i.title}</td>
                  <td><Badge kind={severityKind(i.severity)}>{i.severity}</Badge></td>
                  <td>{i.status.replace('_', ' ')}</td>
                  <td>{i.assignedTo?.name || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {current && (
        <div className="detail">
          <h4>{current.title}</h4>
          <p className="muted">{current.description}</p>
          {current.location?.lat !== undefined && (
            <>
              <p>Location: {current.location.lat.toFixed(5)}, {current.location.lng.toFixed(5)}</p>
              <MapView center={[current.location.lat, current.location.lng]} zones={[]} tourists={[{ touristId: current._id, name: current.tourist?.user?.name, lat: current.location.lat, lng: current.location.lng, status: 'danger' }]} height={240} />
            </>
          )}
          <div className="row-gap" style={{ margin: '12px 0' }}>
            <button className="btn small" onClick={() => update(current._id, { status: 'in_progress', assignToMe: true })}>Take / In progress</button>
            <button className="btn small" onClick={() => update(current._id, { status: 'resolved' })}>Mark resolved</button>
            <button className="btn btn-ghost small" onClick={() => update(current._id, { status: 'closed' })}>Close</button>
            <button className="btn btn-ghost small" onClick={() => update(current._id, { status: 'open' })}>Reopen</button>
          </div>
          <h5>Notes</h5>
          {current.notes?.length ? (
            <ul className="list">{current.notes.map((n, k) => <li key={k}><b>{n.byName}</b>: {n.text} <small className="muted">{fmt(n.at)}</small></li>)}</ul>
          ) : (
            <p className="muted small">No notes yet.</p>
          )}
          <div className="row-gap">
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note (e.g. Patrol dispatched)" style={{ flex: 1 }} />
            <button className="btn small" onClick={() => addNote(current._id)}>Add</button>
          </div>
        </div>
      )}
    </Card>
  );
}

function Zones({ zones, reload }) {
  const empty = { name: '', type: 'high', lat: '', lng: '', radiusMeters: 500, description: '' };
  const [f, setF] = useState(empty);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function create(e) {
    e.preventDefault();
    setErr('');
    try {
      await api.post('/geofences', { ...f, lat: Number(f.lat), lng: Number(f.lng), radiusMeters: Number(f.radiusMeters) });
      setF(empty);
      reload();
    } catch (er) {
      setErr(er.message);
    }
  }
  async function remove(id) {
    if (!window.confirm('Delete this zone?')) return;
    await api.del(`/geofences/${id}`);
    reload();
  }

  return (
    <>
      <Card title="Risk zones & geo-fences">
        <p className="muted small">Click the map to pick a centre point for a new zone.</p>
        <MapView
          center={[17.72, 83.31]}
          zones={zones}
          me={f.lat !== '' && f.lng !== '' ? { lat: Number(f.lat), lng: Number(f.lng) } : null}
          onMapClick={(lat, lng) => setF({ ...f, lat: lat.toFixed(5), lng: lng.toFixed(5) })}
          height={380}
        />
        <form onSubmit={create} className="zone-form">
          <input placeholder="Zone name" value={f.name} onChange={set('name')} required />
          <select value={f.type} onChange={set('type')}>
            <option value="safe">Safe</option>
            <option value="moderate">Moderate risk</option>
            <option value="high">High risk</option>
            <option value="restricted">Restricted</option>
          </select>
          <input type="number" step="any" placeholder="Lat" value={f.lat} onChange={set('lat')} required />
          <input type="number" step="any" placeholder="Lng" value={f.lng} onChange={set('lng')} required />
          <input type="number" placeholder="Radius (m)" value={f.radiusMeters} onChange={set('radiusMeters')} min={50} required />
          <input placeholder="Description" value={f.description} onChange={set('description')} />
          <button className="btn">Add zone</button>
        </form>
        {err && <p className="error">{err}</p>}
      </Card>

      <Card title={`All zones (${zones.length})`}>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Type</th><th>Radius</th><th>Centre</th><th /></tr></thead>
            <tbody>
              {zones.map((z) => (
                <tr key={z._id}>
                  <td>{z.name}</td>
                  <td><Badge kind={zoneKind(z.type)}>{z.type}</Badge></td>
                  <td>{z.radiusMeters} m</td>
                  <td>{z.center.lat.toFixed(4)}, {z.center.lng.toFixed(4)}</td>
                  <td><button className="btn btn-ghost small" onClick={() => remove(z._id)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
