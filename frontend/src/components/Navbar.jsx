import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  if (!user) return null;

  const links =
    user.role === 'admin'
      ? [['/police', 'Command Centre']]
      : [
          ['/dashboard', 'Dashboard'],
          ['/id', 'Digital ID'],
          ['/alerts', 'Alerts & History'],
          ['/profile', 'Profile'],
        ];

  return (
    <header className="navbar">
      <div className="nav-inner">
        <div className="brand">
          <span className="brand-dot" /> SafeTour
        </div>
        <nav className="nav-links">
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="nav-user">
          <span className="nav-name">
            {user.name} <small>({user.role === 'admin' ? 'Police' : 'Tourist'})</small>
          </span>
          <button
            className="btn btn-ghost"
            onClick={() => {
              logout();
              nav('/login');
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
