import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Card } from '../components/Ui';

const dateVal = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

export default function Profile() {
  const [f, setF] = useState(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/tourists/me')
      .then((t) =>
        setF({
          name: t.user.name,
          email: t.user.email,
          phone: t.phone,
          nationality: t.nationality,
          bloodGroup: t.bloodGroup,
          medicalInfo: t.medicalInfo,
          registeredZone: t.registeredZone,
          tripStart: dateVal(t.tripStart),
          tripEnd: dateVal(t.tripEnd),
          emergencyContact: { name: '', phone: '', relation: '', ...t.emergencyContact },
          itinerary: t.itinerary || [],
        })
      )
      .catch((e) => setError(e.message));
  }, []);

  if (!f) return <div className="page">{error ? <p className="error">{error}</p> : 'Loading...'}</div>;

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const setEc = (k) => (e) => setF({ ...f, emergencyContact: { ...f.emergencyContact, [k]: e.target.value } });
  const setIt = (i, k, v) => {
    const it = f.itinerary.map((row, idx) => (idx === i ? { ...row, [k]: v } : row));
    setF({ ...f, itinerary: it });
  };
  const addIt = () => setF({ ...f, itinerary: [...f.itinerary, { day: f.itinerary.length + 1, place: '', lat: '', lng: '', note: '' }] });
  const delIt = (i) => setF({ ...f, itinerary: f.itinerary.filter((_, idx) => idx !== i) });

  async function save(e) {
    e.preventDefault();
    setMsg('');
    setError('');
    try {
      const itinerary = f.itinerary
        .filter((r) => r.place)
        .map((r, i) => ({
          day: Number(r.day) || i + 1,
          place: r.place,
          lat: r.lat === '' ? undefined : Number(r.lat),
          lng: r.lng === '' ? undefined : Number(r.lng),
          note: r.note,
        }));
      await api.put('/tourists/me', { ...f, itinerary });
      setMsg('Profile saved to the database.');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page narrow">
      <form onSubmit={save}>
        <Card title="Personal details">
          <div className="grid2">
            <label>Name<input value={f.name} onChange={set('name')} required /></label>
            <label>Email<input value={f.email} disabled /></label>
            <label>Phone<input value={f.phone} onChange={set('phone')} /></label>
            <label>Nationality<input value={f.nationality} onChange={set('nationality')} /></label>
            <label>Blood group<input value={f.bloodGroup} onChange={set('bloodGroup')} /></label>
            <label>Medical info<input value={f.medicalInfo} onChange={set('medicalInfo')} /></label>
            <label>Registered zone<input value={f.registeredZone} onChange={set('registeredZone')} /></label>
          </div>
        </Card>

        <Card title="Emergency contact">
          <div className="grid2">
            <label>Name<input value={f.emergencyContact.name} onChange={setEc('name')} /></label>
            <label>Phone<input value={f.emergencyContact.phone} onChange={setEc('phone')} /></label>
            <label>Relation<input value={f.emergencyContact.relation} onChange={setEc('relation')} /></label>
          </div>
        </Card>

        <Card title="Trip itinerary" action={<button type="button" className="btn btn-ghost small" onClick={addIt}>+ Add stop</button>}>
          <p className="muted small">Itinerary coordinates are used to detect if you wander far from your plan.</p>
          {f.itinerary.map((r, i) => (
            <div className="it-row" key={i}>
              <input type="number" value={r.day} onChange={(e) => setIt(i, 'day', e.target.value)} placeholder="Day" />
              <input value={r.place} onChange={(e) => setIt(i, 'place', e.target.value)} placeholder="Place" />
              <input type="number" step="any" value={r.lat ?? ''} onChange={(e) => setIt(i, 'lat', e.target.value)} placeholder="Lat" />
              <input type="number" step="any" value={r.lng ?? ''} onChange={(e) => setIt(i, 'lng', e.target.value)} placeholder="Lng" />
              <button type="button" className="btn btn-ghost small" onClick={() => delIt(i)}>X</button>
            </div>
          ))}
        </Card>

        {msg && <p className="success">{msg}</p>}
        {error && <p className="error">{error}</p>}
        <button className="btn">Save profile</button>
      </form>
    </div>
  );
}
