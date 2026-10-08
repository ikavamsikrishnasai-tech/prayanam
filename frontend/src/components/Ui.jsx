// Small reusable UI pieces.

export function Badge({ kind = 'neutral', children }) {
  return <span className={`badge badge-${kind}`}>{children}</span>;
}

export const severityKind = (s) => ({ low: 'neutral', medium: 'warn', high: 'high', critical: 'danger' }[s] || 'neutral');
export const statusKind = (s) => ({ safe: 'ok', warning: 'warn', danger: 'danger' }[s] || 'neutral');
export const zoneKind = (z) => ({ safe: 'ok', moderate: 'warn', high: 'high', restricted: 'danger' }[z] || 'neutral');

export function SafetyScore({ score = 100, status = 'safe' }) {
  const color = status === 'safe' ? '#16a34a' : status === 'warning' ? '#d97706' : '#dc2626';
  const r = 52;
  const c = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, score)) / 100) * c;
  return (
    <div className="score">
      <svg width="130" height="130" viewBox="0 0 130 130" role="img" aria-label={`Safety score ${score} out of 100`}>
        <circle cx="65" cy="65" r={r} fill="none" stroke="#e5e7eb" strokeWidth="12" />
        <circle
          cx="65"
          cy="65"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          transform="rotate(-90 65 65)"
        />
        <text x="65" y="65" textAnchor="middle" fontSize="30" fontWeight="700" fill="#111827">
          {score}
        </text>
        <text x="65" y="86" textAnchor="middle" fontSize="11" fill="#6b7280">
          / 100
        </text>
      </svg>
      <Badge kind={statusKind(status)}>{status.toUpperCase()}</Badge>
    </div>
  );
}

export function Card({ title, action, children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <div className="card-head">
          <h3>{title}</h3>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Empty({ children }) {
  return <p className="empty">{children}</p>;
}

export const fmt = (d) => (d ? new Date(d).toLocaleString() : '-');
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '-');
