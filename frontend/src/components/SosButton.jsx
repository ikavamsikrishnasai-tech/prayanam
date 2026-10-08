import { useState } from 'react';
import { api } from '../api/client';

const TYPES = [
  ['medical', 'Medical emergency'],
  ['lost', 'Lost / missing'],
  ['threat', 'Threat / harassment'],
  ['accident', 'Accident'],
  ['other', 'Other'],
];

// getPosition: function returning {lat,lng} or null (current real/simulated position)
export default function SosButton({ getPosition, onSent }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('medical');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function send() {
    setBusy(true);
    setError('');
    try {
      const pos = getPosition();
      const body = { emergencyType: type, message: msg };
      if (pos) {
        body.lat = pos.lat;
        body.lng = pos.lng;
      }
      const d = await api.post('/sos', body);
      setResult(d);
      onSent && onSent(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setOpen(false);
    setResult(null);
    setError('');
    setMsg('');
  }

  return (
    <>
      <button className="sos-btn" onClick={() => setOpen(true)} aria-label="Send SOS emergency alert">
        SOS
      </button>

      {open && (
        <div className="modal-backdrop" onClick={close}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            {!result ? (
              <>
                <h3>Send emergency alert?</h3>
                <p className="muted">Police will receive your Tourist ID, name, GPS location, emergency contact and the time.</p>
                <label>
                  Emergency type
                  <select value={type} onChange={(e) => setType(e.target.value)}>
                    {TYPES.map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Message (optional)
                  <textarea rows={2} value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={300} />
                </label>
                {error && <p className="error">{error}</p>}
                <div className="row-end">
                  <button className="btn btn-ghost" onClick={close}>
                    Cancel
                  </button>
                  <button className="btn btn-danger" onClick={send} disabled={busy}>
                    {busy ? 'Sending...' : 'SEND SOS NOW'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3>SOS sent</h3>
                <p>{result.message}</p>
                <p className="muted">
                  Incident logged at {new Date(result.alert.createdAt).toLocaleTimeString()}. Stay where you are if it is safe.
                </p>
                <div className="row-end">
                  <button className="btn" onClick={close}>
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
