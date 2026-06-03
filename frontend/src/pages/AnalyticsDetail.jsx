import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../App';
import { 
  ArrowLeft, BarChart3, Clock, Globe, 
  Smartphone, Laptop, Compass, AlertCircle, 
  Calendar, ShieldAlert, Link2
} from 'lucide-react';

export default function AnalyticsDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  
  // States
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch detailed analytics
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/urls/${id}`, {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        });
        const json = await res.ok ? await res.json() : null;
        if (!res.ok) throw new Error(json?.message || 'Failed to retrieve analytics');
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [id, user]);

  if (loading) {
    return (
      <div className="container loading-box glass-panel">
        <div className="spinner"></div>
        <p>Analyzing link metrics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container" style={{ maxWidth: '600px', marginTop: '40px' }}>
        <div className="glass-panel" style={{ padding: '35px', textAlign: 'center' }}>
          <ShieldAlert size={48} color="var(--error)" style={{ marginBottom: '15px' }} />
          <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '10px' }}>Analytics Retrieval Failed</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>{error || 'Link analytics could not be found.'}</p>
          <Link to="/dashboard" className="btn-primary">
            <ArrowLeft size={16} />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  const { url, totalClicks, lastVisited, deviceStats, browserStats, osStats, recentVisits } = data;

  // Process Click Trends (group recent visits by day for the last 7 days)
  const getDailyTrends = () => {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7Days.push({
        dateStr: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        rawDate: d.toDateString(),
        count: 0
      });
    }

    recentVisits.forEach(visit => {
      const visitDate = new Date(visit.timestamp).toDateString();
      const match = last7Days.find(day => day.rawDate === visitDate);
      if (match) {
        match.count++;
      }
    });

    // Calculate maximum click count to scale the bars
    const maxCount = Math.max(...last7Days.map(d => d.count), 1);
    
    return last7Days.map(day => ({
      ...day,
      percentage: (day.count / maxCount) * 100
    }));
  };

  const dailyTrends = getDailyTrends();

  // Helper color map for statistics bars
  const colors = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#3b82f6', '#ec4899'];

  return (
    <div className="container">
      {/* Back to Dashboard Link */}
      <div className="analytics-title-sec">
        <Link to="/dashboard" className="btn-icon" style={{ padding: '8px', border: '1px solid var(--glass-border)' }}>
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BarChart3 size={28} color="#6366f1" />
            <span>Link Performance Insights</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Detailed metrics for: <strong>http://localhost:5000/r/{url.customAlias || url.shortCode}</strong>
          </p>
        </div>
      </div>

      {/* Basic Metrics Dashboard Stats Tiles */}
      <div className="stats-grid">
        {/* Card 1 */}
        <div className="glass-panel stat-card">
          <div className="stat-icon" style={{ color: '#6366f1' }}>
            <BarChart3 size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-val">{totalClicks}</span>
            <span className="stat-lbl">Total Clicks</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="glass-panel stat-card">
          <div className="stat-icon" style={{ color: '#10b981' }}>
            <Clock size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-val" style={{ fontSize: lastVisited ? '0.95rem' : '1.4rem', fontWeight: lastVisited ? '600' : '800' }}>
              {lastVisited ? new Date(lastVisited).toLocaleDateString() : 'Never'}
            </span>
            <span className="stat-lbl">Last Visited</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="glass-panel stat-card">
          <div className="stat-icon" style={{ color: '#8b5cf6' }}>
            <Calendar size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-val">{new Date(url.createdAt).toLocaleDateString()}</span>
            <span className="stat-lbl">Created Date</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="glass-panel stat-card">
          <div className="stat-icon" style={{ color: '#f59e0b' }}>
            <Link2 size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-val" style={{ fontSize: '1rem', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px', whiteSpace: 'nowrap' }} title={url.originalUrl}>
              {new URL(url.originalUrl).hostname}
            </span>
            <span className="stat-lbl">Destination Host</span>
          </div>
        </div>
      </div>

      {/* Main Charts & Categorized Breakdowns Row */}
      <div className="charts-section-grid">
        {/* Click Trends Column Chart */}
        <div className="glass-panel chart-card">
          <h4>
            <Clock size={18} color="#6366f1" />
            <span>Click Activity Trend (Last 7 Days)</span>
          </h4>
          
          <div className="svg-chart-container">
            <div className="trend-bars-wrapper">
              {dailyTrends.map((day, i) => (
                <div className="trend-bar-column" key={i}>
                  <div className="trend-tooltip">
                    <strong>{day.count} clicks</strong><br />
                    <span>{day.dateStr}</span>
                  </div>
                  <div 
                    className="trend-bar-fill" 
                    style={{ height: `${day.percentage}%` }}
                  ></div>
                  <span className="trend-label">{day.dateStr}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Device Categories & OS breakdown */}
        <div className="glass-panel chart-card">
          <h4>
            <Smartphone size={18} color="#8b5cf6" />
            <span>Device breakdown</span>
          </h4>

          {deviceStats.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '40px 0' }}>No device metrics logged yet</p>
          ) : (
            <div className="donut-stats-wrapper">
              {deviceStats.map((stat, i) => {
                const percentage = totalClicks > 0 ? Math.round((stat.value / totalClicks) * 100) : 0;
                return (
                  <div className="donut-stat-row" key={i}>
                    <div className="donut-stat-meta">
                      <span className="donut-stat-label">
                        <span className="donut-color-dot" style={{ backgroundColor: colors[i % colors.length] }}></span>
                        <span>{stat.name}</span>
                      </span>
                      <span>{stat.value} ({percentage}%)</span>
                    </div>
                    <div className="donut-stat-bar-bg">
                      <div 
                        className="donut-stat-bar-fill" 
                        style={{ width: `${percentage}%`, backgroundColor: colors[i % colors.length] }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Browser and Operating System Breakdown row */}
      <div className="charts-section-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {/* Browser Stats */}
        <div className="glass-panel chart-card">
          <h4>
            <Compass size={18} color="#10b981" />
            <span>Browsers Share</span>
          </h4>

          {browserStats.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '40px 0' }}>No browser data yet</p>
          ) : (
            <div className="donut-stats-wrapper">
              {browserStats.map((stat, i) => {
                const percentage = totalClicks > 0 ? Math.round((stat.value / totalClicks) * 100) : 0;
                return (
                  <div className="donut-stat-row" key={i}>
                    <div className="donut-stat-meta">
                      <span className="donut-stat-label">
                        <span className="donut-color-dot" style={{ backgroundColor: colors[(i + 2) % colors.length] }}></span>
                        <span>{stat.name}</span>
                      </span>
                      <span>{stat.value} ({percentage}%)</span>
                    </div>
                    <div className="donut-stat-bar-bg">
                      <div 
                        className="donut-stat-bar-fill" 
                        style={{ width: `${percentage}%`, backgroundColor: colors[(i + 2) % colors.length] }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* OS Stats */}
        <div className="glass-panel chart-card">
          <h4>
            <Laptop size={18} color="#f59e0b" />
            <span>Operating Systems Share</span>
          </h4>

          {osStats.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '40px 0' }}>No OS data yet</p>
          ) : (
            <div className="donut-stats-wrapper">
              {osStats.map((stat, i) => {
                const percentage = totalClicks > 0 ? Math.round((stat.value / totalClicks) * 100) : 0;
                return (
                  <div className="donut-stat-row" key={i}>
                    <div className="donut-stat-meta">
                      <span className="donut-stat-label">
                        <span className="donut-color-dot" style={{ backgroundColor: colors[(i + 4) % colors.length] }}></span>
                        <span>{stat.name}</span>
                      </span>
                      <span>{stat.value} ({percentage}%)</span>
                    </div>
                    <div className="donut-stat-bar-bg">
                      <div 
                        className="donut-stat-bar-fill" 
                        style={{ width: `${percentage}%`, backgroundColor: colors[(i + 4) % colors.length] }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Visitor Log Table */}
      <div className="glass-panel table-card">
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Globe size={18} color="#6366f1" />
          <span>Recent Visitor Logs (Last 100 Clicks)</span>
        </h4>

        {recentVisits.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', textAlign: 'center', padding: '40px 0' }}>No click history logged for this shortened URL yet.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>IP Address</th>
                  <th>Country</th>
                  <th>Device</th>
                  <th>OS</th>
                  <th>Browser</th>
                </tr>
              </thead>
              <tbody>
                {recentVisits.map((visit) => (
                  <tr key={visit._id}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      {new Date(visit.timestamp).toLocaleString()}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {visit.ipAddress}
                    </td>
                    <td>
                      <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.08)', color: '#6ee7b7', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                        {visit.country}
                      </span>
                    </td>
                    <td>{visit.device}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{visit.os}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{visit.browser}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
