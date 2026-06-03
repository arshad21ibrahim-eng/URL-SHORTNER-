import React, { createContext, useCallback, useEffect, useMemo, useState, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { Link2, LogOut, LayoutDashboard } from 'lucide-react';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import AnalyticsDetail from './pages/AnalyticsDetail';
import LandingPage from './pages/LandingPage';
import GhostCursor from './components/GhostCursor/GhostCursor';
import NetworkBackground from './components/backgrounds/NetworkBackground';
import ThemeSwitcher from './components/ThemeSwitcher/ThemeSwitcher';
import { ThemeProvider } from './context/ThemeContext';
import './styles/index.css';

// Create Authentication Context
export const AuthContext = createContext(null);

// Custom Hook to use Auth Context
export const useAuth = () => useContext(AuthContext);

// Protected Route Wrapper Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-box">
        <div className="spinner"></div>
        <p>Restoring session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

// Main Navbar Component
const Navigation = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar container">
      <Link to="/" className="brand">
        <Link2 size={28} />
        <span>Shorty</span>
      </Link>

      <div className="nav-links">
        <ThemeSwitcher />
        {user ? (
          <>
            <Link to="/dashboard" className="btn-secondary">
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </Link>
            <span className="nav-user">
              Hi, <strong>{user.username}</strong>
            </span>
            <button onClick={logout} className="btn-danger" title="Log Out">
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          </>
        ) : (
          <>
            <Link to="/auth" className="btn-primary">
              Get Started
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showGhostCursor, setShowGhostCursor] = useState(false);

  // Restore user session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('shorty_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('shorty_user');
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const query = window.matchMedia('(hover: hover) and (pointer: fine)');
      setShowGhostCursor(query.matches);
    }
  }, []);

  const login = useCallback((userData) => {
    setUser(userData);
    localStorage.setItem('shorty_user', JSON.stringify(userData));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('shorty_user');
  }, []);

  const authContextValue = useMemo(
    () => ({ user, loading, login, logout }),
    [user, loading, login, logout]
  );

  return (
    <ThemeProvider>
      <AuthContext.Provider value={authContextValue}>
        <NetworkBackground />
        <Router>
          {showGhostCursor && <GhostCursor />}

          <div className="app-wrapper">
            <Navigation />
            <main className="content-layer">
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/auth" element={user ? <Navigate to="/dashboard" replace /> : <Auth />} />

                {/* Private Protected Routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/analytics/:id"
                  element={
                    <ProtectedRoute>
                      <AnalyticsDetail />
                    </ProtectedRoute>
                  }
                />

                {/* Catch-all Not Found */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </Router>
      </AuthContext.Provider>
    </ThemeProvider>
  );
}
