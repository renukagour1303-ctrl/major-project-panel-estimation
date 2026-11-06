import React, { useState, useEffect } from 'react';
import { 
  Inbox, 
  Sun, 
  LogOut, 
  ArrowLeft,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Calendar,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCompany } from '../../context/CompanyContext.jsx';
import { fetchLeads, updateLeadStatus, fetchLeadStats } from '../../services/leadService.js';

export default function StaffDashboard() {
  const { user, token, logout } = useAuth();
  const { companyConfig } = useCompany();
  const navigate = useNavigate();

  const [leads, setLeads] = useState([]);
  const [leadStats, setLeadStats] = useState(null);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [leadStatusFilter, setLeadStatusFilter] = useState('All');
  const [leadSearch, setLeadSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);

  const loadLeads = async () => {
    if (!token) return;
    setIsLoadingLeads(true);
    try {
      const [leadsRes, statsRes] = await Promise.all([
        fetchLeads(token, { status: leadStatusFilter, search: leadSearch }),
        fetchLeadStats(token)
      ]);
      if (leadsRes.success) setLeads(leadsRes.data || []);
      if (statsRes.success) setLeadStats(statsRes.stats || null);
    } catch (err) {
      console.error('Failed to load leads:', err);
    } finally {
      setIsLoadingLeads(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, [leadStatusFilter]);

  const handleUpdateStatus = async (leadId, newStatus) => {
    try {
      await updateLeadStatus(token, leadId, newStatus);
      await loadLeads();
      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      alert('Failed to update lead status.');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="portal-dashboard-layout">
      {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
      <header className="portal-topbar">
        <div className="pt-brand">
          <Link to="/" className="pt-home-link" title="Return to Public Website">
            <ArrowLeft size={16} />
            <span>Public Site</span>
          </Link>
          <div className="pt-brand-title">
            <Sun size={22} className="text-emerald" />
            <div>
              <h2>{companyConfig.companyName || 'Sungroves'}</h2>
              <span>Staff & Consultant Lead Desk</span>
            </div>
          </div>
        </div>

        <div className="pt-user-actions">
          <div className="pt-user-tag">
            <span className="user-role-badge staff">STAFF</span>
            <span className="user-name">{user?.fullName || user?.username}</span>
          </div>

          <button type="button" className="btn-logout" onClick={handleLogout} title="Sign Out">
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* ── Main Content Area ────────────────────────────────────────────── */}
      <div className="portal-main-container">
        {/* Role Privileges Banner */}
        <div className="staff-privilege-banner">
          <Info size={18} className="text-emerald" />
          <span>
            <strong>Consultant Access:</strong> You are viewing customer inquiries and deterministic solar feasibility reports. Company configuration and user accounts are managed by Administrators.
          </span>
        </div>

        <div className="portal-card-body">
          <div className="card-header-bar">
            <div>
              <h3>Customer Leads & Feasibility Assessments</h3>
              <p>Review customer contact information, calculated solar estimates, and update status workflow.</p>
            </div>
          </div>

          {/* Metrics Row */}
          {leadStats && (
            <div className="lead-stats-row">
              <div className="stat-pill-box">
                <label>Total Inquiries</label>
                <span>{leadStats.total}</span>
              </div>
              <div className="stat-pill-box new">
                <label>New Inquiries</label>
                <span>{leadStats.newLeads}</span>
              </div>
              <div className="stat-pill-box audit">
                <label>Audit Scheduled</label>
                <span>{leadStats.auditScheduled}</span>
              </div>
              <div className="stat-pill-box quote">
                <label>Quote Sent</label>
                <span>{leadStats.quoteSent}</span>
              </div>
              <div className="stat-pill-box closed">
                <label>Closed</label>
                <span>{leadStats.closed}</span>
              </div>
              <div className="stat-pill-box capacity">
                <label>Total Inquired kWp</label>
                <span>{leadStats.totalCapacityKWp} kWp</span>
              </div>
            </div>
          )}

          {/* Filters Bar */}
          <div className="leads-filter-bar">
            <div className="search-input-box">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search customer, phone, email, city..."
                value={leadSearch}
                onChange={(e) => setLeadSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadLeads()}
              />
            </div>

            <div className="status-filter-tabs">
              {['All', 'New', 'Audit Scheduled', 'Quote Sent', 'Closed'].map((st) => (
                <button
                  key={st}
                  type="button"
                  className={`filter-pill-btn ${leadStatusFilter === st ? 'active' : ''}`}
                  onClick={() => setLeadStatusFilter(st)}
                >
                  {st}
                </button>
              ))}
            </div>

            <button type="button" className="btn-secondary" onClick={loadLeads} title="Refresh leads">
              <RefreshCw size={15} />
              <span>Refresh</span>
            </button>
          </div>

          {isLoadingLeads ? (
            <div className="portal-loading-center">
              <span className="spinner-sm"></span>
              <span>Loading customer inquiries...</span>
            </div>
          ) : leads.length === 0 ? (
            <div className="empty-leads-box">
              <Inbox size={40} className="text-muted" />
              <h4>No Leads Found</h4>
              <p>Customer inquiries submitted on the public website will show up in this queue.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Customer Name</th>
                    <th>Contact Details</th>
                    <th>Calculated System Capacity</th>
                    <th>Subsidy & Net Cost</th>
                    <th>Lead Status</th>
                    <th>Date Received</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((l) => (
                    <tr key={l.id}>
                      <td>#{l.id}</td>
                      <td>
                        <strong>{l.customerName}</strong>
                        {l.address && <div className="text-muted-xs">{l.address}</div>}
                      </td>
                      <td>
                        <div>{l.phone}</div>
                        {l.email && <div className="text-muted-xs">{l.email}</div>}
                      </td>
                      <td>
                        {l.calculatedSystemCapacity ? (
                          <div className="calc-summary-tag">
                            <strong>{l.calculatedSystemCapacity} kWp</strong>
                            {l.panelInfo && <span> ({l.panelInfo})</span>}
                          </div>
                        ) : (
                          <span>{l.targetCapacity || 'General Inquiry'}</span>
                        )}
                      </td>
                      <td>
                        {l.subsidyAmount !== null && l.subsidyAmount !== undefined ? (
                          <div>
                            <div className="text-emerald">Subsidy: ₹{Number(l.subsidyAmount).toLocaleString('en-IN')}</div>
                            {l.estimatedNetCost && <div className="text-muted-xs">Net: ₹{Number(l.estimatedNetCost).toLocaleString('en-IN')}</div>}
                          </div>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        <select
                          className={`status-dropdown-select status-${l.status.toLowerCase().replace(/\s+/g, '-')}`}
                          value={l.status}
                          onChange={(e) => handleUpdateStatus(l.id, e.target.value)}
                        >
                          <option value="New">New</option>
                          <option value="Audit Scheduled">Audit Scheduled</option>
                          <option value="Quote Sent">Quote Sent</option>
                          <option value="Closed">Closed</option>
                        </select>
                      </td>
                      <td>{new Date(l.createdAt).toLocaleDateString()}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-icon-action"
                          onClick={() => setSelectedLead(l)}
                          title="View complete customer estimate"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Lead Detail Modal ─────────────────────────────────────────────── */}
      {selectedLead && (
        <div className="modal-overlay" onClick={() => setSelectedLead(null)}>
          <div className="modal-content lead-detail-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-block flex-between">
              <div>
                <h2>Customer Lead #{selectedLead.id}</h2>
                <p>Submitted on {new Date(selectedLead.createdAt).toLocaleString()}</p>
              </div>
              <span className={`status-pill status-${selectedLead.status.toLowerCase().replace(/\s+/g, '-')}`}>
                {selectedLead.status}
              </span>
            </div>

            <div className="lead-detail-grid">
              <div className="ld-section">
                <h4>Customer Contact Details</h4>
                <div className="ld-row"><label>Customer Name:</label> <strong>{selectedLead.customerName}</strong></div>
                <div className="ld-row"><label>Phone Number:</label> <strong>{selectedLead.phone}</strong></div>
                <div className="ld-row"><label>Email:</label> <span>{selectedLead.email || '—'}</span></div>
                <div className="ld-row"><label>Installation Address:</label> <span>{selectedLead.address || '—'}</span></div>
                <div className="ld-row"><label>Lead Source:</label> <span>{selectedLead.source}</span></div>
              </div>

              <div className="ld-section highlight-panel">
                <h4>Calculated System Feasibility (Deterministic Engine)</h4>
                <div className="ld-row"><label>System Capacity:</label> <strong>{selectedLead.calculatedSystemCapacity ? `${selectedLead.calculatedSystemCapacity} kWp` : (selectedLead.targetCapacity || '—')}</strong></div>
                <div className="ld-row"><label>Panel Specification:</label> <span>{selectedLead.panelInfo || '—'}</span></div>
                <div className="ld-row"><label>PM Surya Ghar Subsidy:</label> <strong className="text-emerald">{selectedLead.subsidyAmount ? `₹${Number(selectedLead.subsidyAmount).toLocaleString('en-IN')}` : '—'}</strong></div>
                <div className="ld-row"><label>Estimated Net Investment:</label> <strong>{selectedLead.estimatedNetCost ? `₹${Number(selectedLead.estimatedNetCost).toLocaleString('en-IN')}` : '—'}</strong></div>
                <div className="ld-row"><label>Estimated Annual Savings:</label> <span>{selectedLead.estimatedAnnualSavings ? `₹${Number(selectedLead.estimatedAnnualSavings).toLocaleString('en-IN')} / yr` : '—'}</span></div>
              </div>
            </div>

            {selectedLead.message && (
              <div className="lead-message-box">
                <label>Customer Message / Request Notes:</label>
                <p>{selectedLead.message}</p>
              </div>
            )}

            <div className="lead-status-update-row">
              <label>Update Status:</label>
              <select
                className="status-dropdown-select"
                value={selectedLead.status}
                onChange={(e) => handleUpdateStatus(selectedLead.id, e.target.value)}
              >
                <option value="New">New</option>
                <option value="Audit Scheduled">Audit Scheduled</option>
                <option value="Quote Sent">Quote Sent</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-primary" onClick={() => setSelectedLead(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
