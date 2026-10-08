import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const u = await login(email, password);
      nav(u.role === 'admin' ? '/police' : '/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <div className="brand big">
          <span className="brand-dot" /> SafeTour
        </div>
        <p className="muted">Smart Tourist Safety Monitoring &amp; Incident Response</p>

        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn btn-block" disabled={busy}>
          {busy ? 'Signing in...' : 'Sign in'}
        </button>
        <p className="muted center">
          New here? <Link to="/register">Create an account</Link>
        </p>

        <div className="demo-box">
          <strong>Demo accounts (after running the seed script)</strong>
          <div>
            Tourist: tourist@safetour.demo / tourist123
            <br />
            Police: police@safetour.demo / police123
          </div>
          <div className="row-gap">
            <button type="button" className="btn btn-ghost small" onClick={() => { setEmail('tourist@safetour.demo'); setPassword('tourist123'); }}>
              Fill tourist
            </button>
            <button type="button" className="btn btn-ghost small" onClick={() => { setEmail('police@safetour.demo'); setPassword('police123'); }}>
              Fill police
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
