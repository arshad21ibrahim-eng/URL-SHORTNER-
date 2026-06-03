 import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { ArrowRight, Link2, BarChart3, Shield, Sparkles, Smartphone } from 'lucide-react';

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="container">
      {/* Hero Section */}
      <section className="hero-sec">
        <div className="hero-badge">
          <Sparkles size={14} style={{ marginRight: '6px', display: 'inline' }} />
          <span>Next-Generation URL Management</span>
        </div>
        <h1>
          Shorten. Share. Track.<br />
          <span>Real-time Link Analytics.</span>
        </h1>
        <p>
          Take complete control of your links. Generate unique short URLs with custom aliases, 
          expiration dates, QR codes, and gain crystal-clear granular insights into your audience.
        </p>
        <div className="hero-btns">
          {user ? (
            <Link to="/dashboard" className="btn-primary" style={{ padding: '14px 28px', fontSize: '1.05rem' }}>
              <span style={{ color: '#000000' }}>Go to Dashboard</span>
              <ArrowRight size={20} />
            </Link>
          ) : (
            <>
              <Link to="/auth" className="btn-primary" style={{ padding: '14px 28px', fontSize: '1.05rem' }}>
                <span style={{ color: '#000000' }}>Get Started Now</span>
                <ArrowRight size={20} />
              </Link>
              <Link to="/auth?mode=login" className="btn-secondary" style={{ padding: '14px 28px', fontSize: '1.05rem' }}>
                Sign In
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Features Grid */}
      <section style={{ paddingBottom: '80px' }}>
        <h2 style={{ textAlign: 'center', fontSize: '1.8rem', marginBottom: '40px', fontWeight: 700 }}>
          Engineered for Deep Insights & Flexibility
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '25px'
        }}>
          {/* Card 1 */}
          <div className="glass-panel" style={{ padding: '30px', borderRadius: '16px' }}>
            <div className="stat-icon" style={{ marginBottom: '20px', color: '#6366f1' }}>
              <Link2 size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '10px' }}>Smart URL Shortening</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
              Convert messy long links into clean, unique short codes instantly. Fully automated destination validation.
            </p>
          </div>

          {/* Card 2 */}
          <div className="glass-panel" style={{ padding: '30px', borderRadius: '16px' }}>
            <div className="stat-icon" style={{ marginBottom: '20px', color: '#8b5cf6' }}>
              <BarChart3 size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '10px' }}>Granular Analytics</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
              Log device, operating system, browser configuration, exact click timestamp, and simulate geolocation visual metrics.
            </p>
          </div>

          {/* Card 3 */}
          <div className="glass-panel" style={{ padding: '30px', borderRadius: '16px' }}>
            <div className="stat-icon" style={{ marginBottom: '20px', color: '#10b981' }}>
              <Smartphone size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '10px' }}>QR Codes & Custom Aliases</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
              Establish custom memorable aliases for brand promotion and download high-resolution QR codes directly from the panel.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
