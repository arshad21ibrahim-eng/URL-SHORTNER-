import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { QRCodeCanvas } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { 
  Link2, Copy, Trash2, Calendar, Eye, 
  Settings, QrCode, FileSpreadsheet, Plus, 
  HelpCircle, ChevronDown, ChevronUp, Check, 
  AlertCircle, ArrowRight, Edit3, X, Download
} from 'lucide-react';
import API_URL from '../config';

export default function Dashboard() {
  const { user } = useAuth();
  
  // States
  const [urls, setUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [originalUrl, setOriginalUrl] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [description, setDescription] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Modal and Interactive States
  const [activeQrUrl, setActiveQrUrl] = useState(null); // URL object for QR modal
  const [activeEditUrl, setActiveEditUrl] = useState(null); // URL object for Edit modal
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkCsvText, setBulkCsvText] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [csvFileName, setCsvFileName] = useState('');
  const [csvUploadError, setCsvUploadError] = useState('');
  const [csvUploadMessage, setCsvUploadMessage] = useState('');
  const [csvParsing, setCsvParsing] = useState(false);
  const [csvSkipped, setCsvSkipped] = useState(0);
  const [csvProcessedCount, setCsvProcessedCount] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteSelectedLoading, setDeleteSelectedLoading] = useState(false);

  const selectedCount = selectedIds.length;
  const allSelected = urls.length > 0 && selectedCount === urls.length;

  const toggleUrlSelection = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((selectedId) => selectedId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(urls.map((url) => url._id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedCount === 0) return;
    if (!window.confirm(`Delete ${selectedCount} selected link${selectedCount === 1 ? '' : 's'}? This cannot be undone.`)) {
      return;
    }

    setDeleteSelectedLoading(true);
    setError('');
    setSuccess('');

    try {
      const responses = await Promise.all(
        selectedIds.map((id) =>
          fetch(`${API_URL}/api/urls/${id}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${user.token}`
            }
          })
        )
      );

      const failed = await Promise.all(
        responses.map(async (res, index) => ({
          ok: res.ok,
          message: res.ok ? '' : (await res.json()).message || 'Delete failed',
          id: selectedIds[index]
        }))
      );

      const errors = failed.filter((item) => !item.ok);
      if (errors.length > 0) {
        throw new Error(errors.map((item) => item.message).join(', '));
      }

      setSuccess(`${selectedCount} selected link${selectedCount === 1 ? '' : 's'} deleted successfully.`);
      setSelectedIds([]);
      fetchUrls();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleteSelectedLoading(false);
    }
  };

  // Clipboard tracking for tooltip feedback
  const [copiedCode, setCopiedCode] = useState(null);

  // Edit fields states
  const [editOriginalUrl, setEditOriginalUrl] = useState('');
  const [editCustomAlias, setEditCustomAlias] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editExpiresAt, setEditExpiresAt] = useState('');
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Fetch user links
  const fetchUrls = async () => {
    try {
      const res = await fetch(`${API_URL}/api/urls`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch links');
      setUrls(data);
      setSelectedIds([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUrls();
  }, [user]);

  // Handle URL creation
  const handleShorten = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!originalUrl) {
      setError('Please provide a long URL');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/urls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          originalUrl,
          customAlias: customAlias || undefined,
          description: description || undefined,
          expiresAt: expiresAt || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Shortening failed');

      // Pop confetti on success!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      setSuccess('Short URL generated successfully!');
      
      // Reset form
      setOriginalUrl('');
      setCustomAlias('');
      setDescription('');
      setExpiresAt('');
      setShowAdvanced(false);

      // Refresh list
      fetchUrls();
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle Copy to clipboard
  const handleCopy = (code) => {
    const fullShortUrl = `${API_URL}/r/${code}`;
    navigator.clipboard.writeText(fullShortUrl);
    setCopiedCode(code);
    
    // Reset copy state after 2 seconds
    setTimeout(() => {
      setCopiedCode(null);
    }, 2000);
  };

  // Handle URL Deletion
  const handleDelete = async (id) => {
    if (!window.confirm('Are you absolutely sure you want to delete this shortened URL? This will permanently wipe all visitor click analytics.')) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/urls/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete URL');

      setSuccess('URL and analytics deleted successfully');
      fetchUrls();
    } catch (err) {
      setError(err.message);
    }
  };

  // Open Edit Modal & Populate Form
  const openEditModal = (urlObj) => {
    setActiveEditUrl(urlObj);
    setEditOriginalUrl(urlObj.originalUrl);
    setEditCustomAlias(urlObj.customAlias || '');
    setEditDescription(urlObj.description || '');
    setEditExpiresAt(urlObj.expiresAt ? new Date(urlObj.expiresAt).toISOString().split('T')[0] : '');
    setEditError('');
  };

  // Submit Edit URL
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError('');
    setEditLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/urls/${activeEditUrl._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          originalUrl: editOriginalUrl,
          customAlias: editCustomAlias,
          description: editDescription,
          expiresAt: editExpiresAt || null
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update URL');

      setSuccess('Short URL configuration updated successfully!');
      setActiveEditUrl(null);
      fetchUrls();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditLoading(false);
    }
  };

  // Handle Bulk Shorten Submission
  const parseCsvText = (text) => {
    const rows = [];
    let field = '';
    let row = [];
    let inQuotes = false;

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      if (inQuotes) {
        if (char === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i += 1;
          } else {
            inQuotes = false;
          }
        } else {
          field += char;
        }
      } else if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(field);
        field = '';
      } else if (char === '\r') {
        continue;
      } else if (char === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else {
        field += char;
      }
    }

    if (field.length > 0 || row.length > 0) {
      row.push(field);
      rows.push(row);
    }

    return rows;
  };

  const isValidUrl = (value) => {
    try {
      const url = new URL(value.trim());
      return ['http:', 'https:'].includes(url.protocol);
    } catch {
      return false;
    }
  };

  const isHeaderRow = (cells) => {
    const normalized = cells.map((cell) => cell.trim().toLowerCase());
    return normalized.length > 0 && normalized[0].includes('original') &&
      (normalized.length < 2 || normalized[1].includes('alias') || normalized[1].includes('custom')) &&
      (normalized.length < 3 || normalized[2].includes('description'));
  };

  const buildBulkTextFromCsv = (csvText) => {
    const parsedRows = parseCsvText(csvText);
    const trimmedRows = parsedRows.map((cells) => cells.map((cell) => cell.trim()));
    const nonEmptyRows = trimmedRows.filter((cells) => cells.some((cell) => cell.length > 0));

    if (nonEmptyRows.length === 0) {
      return { text: '', validCount: 0, skipped: 0, errors: ['CSV file contains no data.'] };
    }

    const rows = nonEmptyRows.slice();
    if (isHeaderRow(rows[0])) {
      rows.shift();
    }

    const validLines = [];
    const errors = [];
    let skipped = 0;

    rows.forEach((cells, index) => {
      const originalUrl = (cells[0] || '').trim();
      const customAlias = (cells[1] || '').trim();
      const description = (cells[2] || '').trim();

      if (!originalUrl) {
        skipped += 1;
        errors.push(`Row ${index + 2} is missing a URL.`);
        return;
      }

      if (!isValidUrl(originalUrl)) {
        skipped += 1;
        errors.push(`Row ${index + 2} contains an invalid URL.`);
        return;
      }

      validLines.push([originalUrl, customAlias, description].join(','));
    });

    return {
      text: validLines.join('\n'),
      validCount: validLines.length,
      skipped,
      errors,
    };
  };

  const processCsvFile = async (file) => {
    if (!file) return;

    const name = file.name || '';
    if (!name.toLowerCase().endsWith('.csv')) {
      setCsvUploadError('Please upload a valid .csv file.');
      return;
    }

    setCsvParsing(true);
    setCsvUploadError('');
    setCsvUploadMessage('');
    setCsvFileName(name);
    setCsvSkipped(0);
    setCsvProcessedCount(0);

    try {
      const csvText = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file, 'utf-8');
      });

      const { text, validCount, skipped, errors } = buildBulkTextFromCsv(String(csvText));
      if (!text && validCount === 0) {
        throw new Error(errors[0] || 'No valid CSV rows found.');
      }

      setBulkCsvText(text);
      setCsvSkipped(skipped);
      setCsvProcessedCount(validCount);
      setCsvUploadMessage(
        `${validCount} valid row${validCount === 1 ? '' : 's'} loaded.` +
        (skipped > 0 ? ` ${skipped} invalid row${skipped === 1 ? '' : 's'} skipped.` : '')
      );
    } catch (err) {
      setCsvUploadError(err.message || 'Failed to read CSV file.');
      setBulkCsvText('');
      setCsvProcessedCount(0);
      setCsvSkipped(0);
    } finally {
      setCsvParsing(false);
    }
  };

  const handleFileInputChange = async (event) => {
    const file = event.target.files?.[0];
    if (file) {
      await processCsvFile(file);
    }
    event.target.value = null;
  };

  const handleDragEnter = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(true);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
    setDragActive(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      await processCsvFile(file);
    }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (!bulkCsvText.trim()) return;

    setBulkLoading(true);
    setBulkResult(null);

    try {
      const res = await fetch(`${API_URL}/api/urls/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ csvText: bulkCsvText })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Bulk processing failed');

      confetti({
        particleCount: 150,
        spread: 80,
      });

      setBulkResult(data);
      setBulkCsvText('');
      setCsvFileName('');
      setCsvUploadMessage('');
      setCsvSkipped(0);
      setCsvProcessedCount(0);
      fetchUrls();
    } catch (err) {
      setError(err.message);
    } finally {
      setBulkLoading(false);
    }
  };

  // Download QR Code PNG utility
  const downloadQrPng = (code) => {
    const canvas = document.getElementById(`qr-canvas-${code}`);
    if (!canvas) return;
    const pngUrl = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
    let downloadLink = document.createElement('a');
    downloadLink.href = pngUrl;
    downloadLink.download = `qrcode_${code}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  return (
    <div className="container">
      {/* Welcome Banner */}
      <div className="dashboard-header">
        <div className="welcome-sec">
          <h1>Welcome, {user.username}!</h1>
          <p>Create shortened links, customize aliases, and monitor performance in real-time.</p>
        </div>
      </div>

      {/* Main Success & Error Alerts */}
      {success && (
        <div className="success-message" style={{ animation: 'fadeIn 0.3s' }}>
          <Check size={18} />
          <span>{success}</span>
          <button style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', font: 'inherit' }} onClick={() => setSuccess('')}>✕</button>
        </div>
      )}
      {error && (
        <div className="error-message" style={{ animation: 'fadeIn 0.3s' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
          <button style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', font: 'inherit' }} onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* URL Shortener Form Box */}
      <div className="glass-panel shortener-box">
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link2 size={20} color="#6366f1" />
          <span>Shorten a New URL</span>
        </h3>
        
        <form onSubmit={handleShorten} className="shortener-form">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <input 
              type="url" 
              placeholder="Paste a long URL here (e.g., https://example.com/very-long-path)"
              value={originalUrl}
              onChange={(e) => setOriginalUrl(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }}>
            <Plus size={20} />
            <span>Shorten Link</span>
          </button>
        </form>

        {/* Toggle Advanced Configurations */}
        <button 
          onClick={() => setShowAdvanced(!showAdvanced)} 
          className="shortener-advanced-btn"
        >
          <span>Advanced Options (Alias, Expiry, Description)</span>
          {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showAdvanced && (
          <div className="advanced-options" style={{ animation: 'fadeIn 0.3s' }}>
            <div className="form-group">
              <label>Custom Alias (Optional)</label>
              <input 
                type="text" 
                placeholder="e.g. promo2026"
                value={customAlias}
                onChange={(e) => setCustomAlias(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Link Expiration Date (Optional)</label>
              <input 
                type="date" 
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="form-group">
              <label>Description / Note</label>
              <input 
                type="text" 
                placeholder="e.g. Newsletter campaign"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Link Action Bar */}
      <div className="dashboard-actions">
        <div>
          <h3>Your Shortened Links</h3>
          {selectedCount > 0 && (
            <p className="selection-summary">{selectedCount} selected</p>
          )}
        </div>

        <div className="selection-toolbar">
          <label className="select-all-toggle">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={handleSelectAll}
            />
            <span>{allSelected ? 'Unselect all' : 'Select all'}</span>
          </label>
          <button
            type="button"
            className="btn-danger"
            onClick={handleDeleteSelected}
            disabled={selectedCount === 0 || deleteSelectedLoading}
          >
            <Trash2 size={18} />
            <span>{deleteSelectedLoading ? 'Deleting...' : 'Delete Selected'}</span>
          </button>
          <button
            type="button"
            onClick={() => { setShowBulkModal(true); setBulkResult(null); }}
            className="btn-secondary"
          >
            <FileSpreadsheet size={18} />
            <span>Bulk Shorten (CSV)</span>
          </button>
        </div>
      </div>

      {/* Links List View */}
      {loading ? (
        <div className="loading-box glass-panel">
          <div className="spinner"></div>
          <p>Loading links...</p>
        </div>
      ) : urls.length === 0 ? (
        <div className="empty-box glass-panel">
          <Link2 size={48} />
          <h4>No shortened links yet</h4>
          <p>Enter a long URL above to generate your first trackable short link!</p>
        </div>
      ) : (
        <div className="links-grid">
          {urls.map((urlObj) => {
            const isExpired = urlObj.expiresAt && new Date(urlObj.expiresAt) < new Date();
            const displayCode = urlObj.customAlias || urlObj.shortCode;
            const fullShortUrl = `${API_URL}/r/${displayCode}`;
            const isSelected = selectedIds.includes(urlObj._id);

            return (
              <div
                className={`glass-panel link-card${isSelected ? ' selected' : ''}`}
                key={urlObj._id}
                style={{ opacity: isExpired ? 0.7 : 1 }}
              >
                <div className="link-card-top">
                  <label className="selection-checkbox-wrapper">
                    <input
                      type="checkbox"
                      className="selection-checkbox"
                      checked={isSelected}
                      onChange={() => toggleUrlSelection(urlObj._id)}
                      aria-label={`Select link ${displayCode}`}
                    />
                  </label>
                  <div className="link-details">
                    <div className="link-title-row">
                      {urlObj.description ? (
                        <span className="link-description">{urlObj.description}</span>
                      ) : (
                      <span className="link-description" style={{ color: 'var(--text-muted)', fontWeight: 400 }}>No Description</span>
                    )}
                    <span className="link-date">
                      {new Date(urlObj.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Short Link display with copy helper */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '6px 0' }}>
                    <a 
                      href={fullShortUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="link-short-url"
                    >
                      {fullShortUrl}
                    </a>
                    
                    {/* Copy to Clipboard Tooltip */}
                    <div className="tooltip-container">
                      <button onClick={() => handleCopy(displayCode)} className="btn-icon">
                        {copiedCode === displayCode ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
                      </button>
                      <span className="tooltip-text">
                        {copiedCode === displayCode ? 'Copied!' : 'Copy Short Link'}
                      </span>
                    </div>
                  </div>

                  {/* Original URL (cropped) */}
                  <span className="link-long-url" title={urlObj.originalUrl}>
                    Dest: {urlObj.originalUrl}
                  </span>

                  {/* Badges metadata row */}
                  <div className="link-stats-row">
                    <span className="badge badge-clicks">
                      <strong>{urlObj.totalClicks}</strong> clicks
                    </span>
                    {urlObj.customAlias && (
                      <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#c084fc', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                        Alias: {urlObj.customAlias}
                      </span>
                    )}
                    {urlObj.expiresAt && (
                      <span className={`badge ${isExpired ? 'badge-expired' : 'badge-active'}`}>
                        <Calendar size={12} />
                        <span>Exp: {new Date(urlObj.expiresAt).toLocaleDateString()}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

                {/* Operations column */}
                <div className="link-actions-box">
                  <Link to={`/analytics/${urlObj._id}`} className="btn-secondary" title="View Detailed Visitor Insights">
                    <Eye size={16} />
                    <span>Analytics</span>
                  </Link>
                  <button onClick={() => openEditModal(urlObj)} className="btn-secondary" title="Edit short URL configurations">
                    <Settings size={16} />
                    <span>Edit</span>
                  </button>
                  <button onClick={() => setActiveQrUrl(urlObj)} className="btn-secondary" title="Show QR Code">
                    <QrCode size={16} />
                  </button>
                  <button onClick={() => handleDelete(urlObj._id)} className="btn-danger" title="Delete Short Link">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* QR Code Popup Modal */}
      {activeQrUrl && (
        <div className="modal-overlay" onClick={() => setActiveQrUrl(null)}>
          <div className="glass-panel modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>QR Code Generator</h3>
              <button onClick={() => setActiveQrUrl(null)} className="btn-icon">
                <X size={20} />
              </button>
            </div>
            
            <div className="qr-container">
              <div className="qr-wrapper">
                <QRCodeCanvas 
                  id={`qr-canvas-${activeQrUrl.customAlias || activeQrUrl.shortCode}`}
                  value={`${API_URL}/r/${activeQrUrl.customAlias || activeQrUrl.shortCode}`}
                  size={200}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="H"
                  includeMargin={true}
                />
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', wordBreak: 'break-all' }}>
                Scan to redirect to:<br />
                <strong>{API_URL}/r/{activeQrUrl.customAlias || activeQrUrl.shortCode}</strong>
              </p>
              
              <button 
                onClick={() => downloadQrPng(activeQrUrl.customAlias || activeQrUrl.shortCode)} 
                className="btn-primary" 
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <Download size={18} />
                <span>Download QR Code (PNG)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit URL configuration Popup Modal */}
      {activeEditUrl && (
        <div className="modal-overlay" onClick={() => setActiveEditUrl(null)}>
          <div className="glass-panel modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3>Edit Short Link</h3>
              <button onClick={() => setActiveEditUrl(null)} className="btn-icon">
                <X size={20} />
              </button>
            </div>
            
            {editError && (
              <div className="error-message">
                <AlertCircle size={18} />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label>Destination Long URL</label>
                <input 
                  type="url" 
                  value={editOriginalUrl} 
                  onChange={(e) => setEditOriginalUrl(e.target.value)} 
                  required 
                />
              </div>

              <div className="form-group">
                <label>Custom Alias (Letters, numbers, dash, underscore)</label>
                <input 
                  type="text" 
                  value={editCustomAlias} 
                  placeholder="e.g. discount50"
                  onChange={(e) => setEditCustomAlias(e.target.value)} 
                />
              </div>

              <div className="form-group">
                <label>Link Expiration Date</label>
                <input 
                  type="date" 
                  value={editExpiresAt} 
                  onChange={(e) => setEditExpiresAt(e.target.value)} 
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="form-group">
                <label>Description / Note</label>
                <input 
                  type="text" 
                  value={editDescription} 
                  onChange={(e) => setEditDescription(e.target.value)} 
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button type="button" onClick={() => setActiveEditUrl(null)} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={editLoading}>
                  {editLoading ? <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px', margin: 0 }}></div> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Bulk Shorten Popup Modal */}
      {showBulkModal && (
        <div className="modal-overlay" onClick={() => setShowBulkModal(false)}>
          <div className="glass-panel modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>Bulk URL Shortening</h3>
              <button onClick={() => setShowBulkModal(false)} className="btn-icon">
                <X size={20} />
              </button>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '15px', lineHeight: 1.5 }}>
              Paste comma-separated link items. Format: <strong>originalUrl,customAlias,description</strong> (one item per line). Custom alias and description are optional.
            </p>

            <form onSubmit={handleBulkSubmit}>
              <div
                className={`csv-upload-box${dragActive ? ' drag-active' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileInputChange}
                  style={{ display: 'none' }}
                />
                <p style={{ margin: 0, fontWeight: 600 }}>Upload a CSV file</p>
                <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
                  Drag and drop a .csv file here or click to select. Header row is optional.
                </p>
                {csvFileName && (
                  <p style={{ margin: '10px 0 0', color: 'var(--text-primary)' }}>
                    <strong>Selected:</strong> {csvFileName}
                  </p>
                )}
                {csvParsing && (
                  <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Processing file...
                  </p>
                )}
                {csvUploadMessage && !csvUploadError && (
                  <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    {csvUploadMessage}
                  </p>
                )}
                {csvUploadError && (
                  <p style={{ margin: '8px 0 0', color: 'var(--error)', fontSize: '0.9rem' }}>
                    {csvUploadError}
                  </p>
                )}
              </div>

              <div className="form-group">
                <textarea 
                  rows="6"
                  placeholder="https://example.com/item1,alias1,First item&#10;https://example.com/item2,,Second item without alias"
                  value={bulkCsvText}
                  onChange={(e) => setBulkCsvText(e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                  required
                />
              </div>

              {bulkResult && (
                <div style={{ marginBottom: '20px' }}>
                  <div className="success-message" style={{ marginBottom: '10px' }}>
                    <Check size={18} />
                    <span>Processed: {bulkResult.successCount} succeeded, {bulkResult.errorCount} failed.</span>
                  </div>

                  {bulkResult.errors.length > 0 && (
                    <div className="csv-preview-list">
                      <strong style={{ color: 'var(--error)' }}>Failures:</strong>
                      <ul style={{ paddingLeft: '15px', marginTop: '5px' }}>
                        {bulkResult.errors.map((err, i) => (
                          <li key={i} style={{ color: '#fda4af' }}>
                            Line {err.line}: {err.error} ({err.originalUrl || 'Missing URL'})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button type="button" onClick={() => setShowBulkModal(false)} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
                  Close
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={bulkLoading}>
                  {bulkLoading ? <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px', margin: 0 }}></div> : 'Shorten Links'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}