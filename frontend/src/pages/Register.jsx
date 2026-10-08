import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [role, setRole] = useState('tourist');
  const [f, setF] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    nationality: 'Indian',
    documentType: 'Passport-Demo',
    documentLast4: '',
    bloodGroup: '',
    medicalInfo: '',
    ecName: '',
    ecPhone: '',
    ecRelation: '',
    tripStart: today(),
    tripEnd: plusDays(7),
    adminCode: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload =
        role === 'admin'
          ? { name: f.name, email: f.email, password: f.password, role: 'admin', adminCode: f.adminCode }
          : {
              name: f.name,
              email: f.email,
              password: f.password,
              phone: f.phone,
              nationality: f.nationality,
              documentType: f.documentType,
              documentLast4: f.documentLast4,
              bloodGroup: f.bloodGroup,
              medicalInfo: f.medicalInfo,
              emergencyContact: { name: f.ecName, phone: f.ecPhone, relation: f.ecRelation },
              tripStart: f.tripStart,
              tripEnd: f.tripEnd,
            };
      const u = await register(payload);
      nav(u.role === 'admin' ? '/police' : '/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card wide" onSubmit={submit}>
        <div className="brand big">
          <span className="brand-dot" /> Create account
        </div>

        <div className="seg">
          <button type="button" className={role === 'tourist' ? 'on' : ''} onClick={() => setRole('tourist')}>
            Tourist
          </button>
          <button type="button" className={role === 'admin' ? 'on' : ''} onClick={() => setRole('admin')}>
            Police / Admin
          </button>
        </div>

        <div className="grid2">
          <label>
            Full name
            <input value={f.name} onChange={set('name')} required maxLength={100} />
          </label>
          <label>
            Email
            <input type="email" value={f.email} onChange={set('email')} required />
          </label>
          <label>
            Password (min 6)
            <input type="password" value={f.password} onChange={set('password')} required minLength={6} />
          </label>
          {role === 'admin' && (
            <label>
              Police registration code
              <input value={f.adminCode} onChange={set('adminCode')} required placeholder="Demo code from your .env" />
            </label>
          )}
        </div>

        {role === 'tourist' && (
          <>
            <h4>Identity (demo data only - do not enter real Aadhaar/passport numbers)</h4>
            <div className="grid2">
              <label>
                Phone
                <input value={f.phone} onChange={set('phone')} />
              </label>
              <label>
                Nationality
                <input value={f.nationality} onChange={set('nationality')} />
              </label>
              <label>
                Document type (demo)
                <select value={f.documentType} onChange={set('documentType')}>
                  <option value="Passport-Demo">Passport (demo)</option>
                  <option value="Aadhaar-Demo">Aadhaar (demo)</option>
                </select>
              </label>
              <label>
                Any 4 demo digits
                <input value={f.documentLast4} onChange={set('documentLast4')} maxLength={4} placeholder="1234" />
              </label>
              <label>
                Blood group
                <select value={f.bloodGroup} onChange={set('bloodGroup')}>
                  <option value="">Select</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </label>
              <label>
                Medical info
                <input value={f.medicalInfo} onChange={set('medicalInfo')} placeholder="Allergies, conditions..." />
              </label>
            </div>

            <h4>Emergency contact</h4>
            <div className="grid2">
              <label>
                Name
                <input value={f.ecName} onChange={set('ecName')} />
              </label>
              <label>
                Phone
                <input value={f.ecPhone} onChange={set('ecPhone')} />
              </label>
              <label>
                Relation
                <input value={f.ecRelation} onChange={set('ecRelation')} />
              </label>
            </div>

            <h4>Trip dates</h4>
            <div className="grid2">
              <label>
                Start
                <input type="date" value={f.tripStart} onChange={set('tripStart')} required />
              </label>
              <label>
                End
                <input type="date" value={f.tripEnd} onChange={set('tripEnd')} required />
              </label>
            </div>
          </>
        )}

        {error && <p className="error">{error}</p>}
        <button className="btn btn-block" disabled={busy}>
          {busy ? 'Creating...' : role === 'tourist' ? 'Register & get Digital ID' : 'Register'}
        </button>
        <p className="muted center">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
