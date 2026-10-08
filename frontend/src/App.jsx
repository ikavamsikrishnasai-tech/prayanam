import { Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import TouristDashboard from './pages/TouristDashboard';
import DigitalID from './pages/DigitalID';
import Alerts from './pages/Alerts';
import Profile from './pages/Profile';
import PoliceDashboard from './pages/PoliceDashboard';

function Home() {
  const { user, loading } = useAuth();
  if (loading) return <div className="center-msg">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'admin' ? '/police' : '/dashboard'} replace />;
}

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<ProtectedRoute role="tourist"><TouristDashboard /></ProtectedRoute>} />
        <Route path="/id" element={<ProtectedRoute role="tourist"><DigitalID /></ProtectedRoute>} />
        <Route path="/alerts" element={<ProtectedRoute role="tourist"><Alerts /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute role="tourist"><Profile /></ProtectedRoute>} />
        <Route path="/police" element={<ProtectedRoute role="admin"><PoliceDashboard /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
