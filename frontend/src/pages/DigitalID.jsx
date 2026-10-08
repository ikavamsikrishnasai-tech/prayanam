import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Badge, Card, fmtDate } from '../components/Ui';

export default function DigitalID() {
  const [data, setData] = useState(null);
  const [verify, setVerify] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/ids/me').then(setData).catch((e) => setError(e.message));
  }, []);

  async function runVerify() {
    try {
      setVerify(await api.get(`/ids/verify/${data.digitalId.touristId}`));
    } catch (e) {
      setError(e.message);
    }
  }

  if (error) return <div className="page"><p className="error">{error}</p></div>;
  if (!data) return <div className="page">Loading...</div>;
  const { digitalId: id, tourist: t, name } = data;

  return (
    <div className="page narrow">
      <div className="id-card">
        <div className="id-top">
          <div>
            <small>DIGITAL TOURIST ID (DEMO)</small>
            <h2>{name}</h2>
          </div>
          <Badge kind={id.status === 'active' ? 'ok' : 'danger'}>{id.status.toUpperCase()}</Badge>
        </div>
        <div className="id-code">{id.touristId}</div>
        <div className="id-grid">
          <div><small>Nationality</small><b>{t.nationality}</b></div>
          <div><small>Document</small><b>{t.documentType} {t.documentNumberMasked}</b></div>
          <div><small>Trip</small><b>{fmtDate(id.validFrom)} - {fmtDate(id.validUntil)}</b></div>
          <div><small>Blood group</small><b>{t.bloodGroup || '-'}</b></div>
          <div><small>Emergency contact</small><b>{t.emergencyContact?.name || '-'} {t.emergencyContact?.phone}</b></div>
          <div><small>Registered zone</small><b>{t.registeredZone}</b></div>
        </div>
        <div className="id-hash">
          <small>Integrity hash (SHA-256)</small>
          <code>{id.hash}</code>
          <small>Previous: {id.previousHash === 'GENESIS' ? 'GENESIS' : id.previousHash.slice(0, 16) + '...'}</small>
        </div>
      </div>

      <Card title="Verify this ID">
        <p className="muted">
          A check-post can recompute the hash from the ID details. If anything was edited in the database, verification fails.
          This is a simple tamper-evidence demo, not a real blockchain.
        </p>
        <button className="btn" onClick={runVerify}>Run verification</button>
        {verify && (
          <p style={{ marginTop: 12 }}>
            <Badge kind={verify.valid ? 'ok' : 'danger'}>{verify.valid ? 'VALID' : 'INVALID'}</Badge>{' '}
            Integrity: {verify.integrityOk ? 'intact' : 'FAILED'} - Status: {verify.status}
          </p>
        )}
        <p className="muted small">
          Public verification endpoint: <code>/api/ids/verify/{id.touristId}</code>
        </p>
      </Card>
    </div>
  );
}
