import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Badge, Card, Empty, fmt, severityKind } from '../components/Ui';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get('/alerts/me'), api.get('/incidents/me')])
      .then(([a, i]) => {
        setAlerts(a);
        setIncidents(i);
      })
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="page">
      {error && <p className="error">{error}</p>}
      <Card title={`Alert history (${alerts.length})`}>
        {alerts.length === 0 ? (
          <Empty>No alerts yet.</Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Time</th><th>Type</th><th>Severity</th><th>Message</th><th>Status</th></tr></thead>
              <tbody>
                {alerts.map((a) => (
                  <tr key={a._id}>
                    <td>{fmt(a.createdAt)}</td>
                    <td>{a.type}</td>
                    <td><Badge kind={severityKind(a.severity)}>{a.severity}</Badge></td>
                    <td>{a.message}</td>
                    <td>{a.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title={`Incident history (${incidents.length})`}>
        {incidents.length === 0 ? (
          <Empty>No incidents.</Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Opened</th><th>Title</th><th>Severity</th><th>Status</th><th>Police notes</th></tr></thead>
              <tbody>
                {incidents.map((i) => (
                  <tr key={i._id}>
                    <td>{fmt(i.createdAt)}</td>
                    <td>{i.title}</td>
                    <td><Badge kind={severityKind(i.severity)}>{i.severity}</Badge></td>
                    <td>{i.status.replace('_', ' ')}</td>
                    <td>{i.notes?.length ? i.notes.map((n) => n.text).join(' | ') : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
