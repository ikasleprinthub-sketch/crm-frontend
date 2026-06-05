'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useApp } from '@/context/AppContext';
import api from '@/lib/api';
import pageStyles from '../page.module.css';
import {
  FileText, Clock, CheckCircle, XCircle, AlertCircle,
  Calendar, Send, Search, Users, Filter,
  ChevronDown, ChevronRight, ShieldCheck,
} from 'lucide-react';
import CustomDatePicker from '@/components/CustomDatePicker';

// ─── Types ───────────────────────────────────────────────────────────────────

type AttendanceStatus = 'NOT_MARKED' | 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'LEAVE' | 'SUNDAY';
type PermissionStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
type PermissionType   = 'HALF_DAY' | 'LEAVE' | 'LATE_PERMISSION';

interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  status: AttendanceStatus;
  checkIn: string | null;
  checkOut: string | null;
  totalHours: number | null;
  permission: PermissionStatus;
  permissionType: PermissionType | null;
  permissionReason: string | null;
  user?: { id: string; name: string; email: string; role: string };
}

const PERMISSION_TYPES: { value: PermissionType; label: string; color: string; bg: string }[] = [
  { value: 'LATE_PERMISSION', label: 'Late Permission', color: '#ea580c', bg: 'rgba(249,115,22,0.1)' },
  { value: 'HALF_DAY',        label: 'Half Day',        color: '#b45309', bg: 'rgba(234,179,8,0.1)'  },
  { value: 'LEAVE',           label: 'Full Leave',      color: '#4f46e5', bg: 'rgba(99,102,241,0.1)' },
];

const STATUS_META: Record<PermissionStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  NONE:     { label: 'None',     color: '#9ca3af', bg: 'rgba(156,163,175,0.1)', icon: <AlertCircle size={11} /> },
  PENDING:  { label: 'Pending',  color: '#b45309', bg: 'rgba(234,179,8,0.1)',   icon: <Clock size={11} /> },
  APPROVED: { label: 'Approved', color: '#16a34a', bg: 'rgba(34,197,94,0.1)',   icon: <CheckCircle size={11} /> },
  REJECTED: { label: 'Rejected', color: '#dc2626', bg: 'rgba(239,68,68,0.1)',   icon: <XCircle size={11} /> },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', weekday: 'short' });
}

function roleLabel(role: string | undefined) {
  if (role === 'SUPER_ADMIN') return 'Super Admin';
  if (role === 'ADMIN')       return 'Admin';
  if (role === 'MANAGER')     return 'Team Leader';
  return 'Employee';
}

function initials(name: string | undefined) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// ─── Request Card ─────────────────────────────────────────────────────────────

function RequestCard({
  rec,
  canManage,
  onApprove,
  onReject,
}: {
  rec: AttendanceRecord;
  canManage: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const st = STATUS_META[rec.permission];
  const pt = PERMISSION_TYPES.find(t => t.value === rec.permissionType);

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      overflow: 'hidden',
      transition: 'border-color 0.15s',
    }}>
      {/* Main row */}
      <div style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>

        {/* Avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1 1 180px', minWidth: 0 }}>
          <div style={{
            width: 38, height: 38, borderRadius: '10px', flexShrink: 0,
            background: 'var(--primary-light)', color: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '0.8rem', letterSpacing: '0.5px',
          }}>
            {initials(rec.user?.name)}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {rec.user?.name ?? '—'}
            </p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: 0, fontWeight: 600 }}>
              {roleLabel(rec.user?.role)}
            </p>
          </div>
        </div>

        {/* Date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
          <Calendar size={13} color="var(--text-secondary)" />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600 }}>{fmtDate(rec.date)}</span>
        </div>

        {/* Type badge */}
        {pt && (
          <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', background: pt.bg, color: pt.color, flexShrink: 0, whiteSpace: 'nowrap' }}>
            {pt.label}
          </span>
        )}

        {/* Status badge */}
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', background: st.bg, color: st.color, flexShrink: 0 }}>
          {st.icon} {st.label}
        </span>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: 'auto', flexShrink: 0 }}>
          {canManage && rec.permission === 'PENDING' && (
            <>
              <button
                onClick={() => onApprove(rec.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0.35rem 0.75rem', borderRadius: '8px', border: 'none', background: 'rgba(34,197,94,0.1)', color: '#16a34a', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem', fontFamily: 'inherit' }}>
                <CheckCircle size={12} /> Approve
              </button>
              <button
                onClick={() => onReject(rec.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0.35rem 0.75rem', borderRadius: '8px', border: 'none', background: 'rgba(239,68,68,0.1)', color: '#dc2626', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem', fontFamily: 'inherit' }}>
                <XCircle size={12} /> Reject
              </button>
            </>
          )}
          <button
            onClick={() => setExpanded(e => !e)}
            style={{ width: 30, height: 30, borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>
      </div>

      {/* Expanded reason */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '0.9rem 1.25rem', background: 'var(--background)' }}>
          <p style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Reason / Explanation</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.6, margin: 0 }}>
            {rec.permissionReason || <em style={{ color: 'var(--text-secondary)' }}>No reason provided</em>}
          </p>
          {rec.user?.email && (
            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.5rem', margin: '0.5rem 0 0' }}>{rec.user.email}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PermissionsPage() {
  const { currentUser, showToast } = useApp();
  const role      = currentUser?.role;
  const isManager = role === 'MANAGER';
  const isAdmin   = role === 'ADMIN';
  const isSuper   = role === 'SUPER_ADMIN';
  const canManage = isSuper || isAdmin || isManager;

  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [allRequests, setAllRequests] = useState<AttendanceRecord[]>([]);
  const [myHistory,   setMyHistory]   = useState<AttendanceRecord[]>([]);

  // Default tab: managers/admins go to approvals first; employees go to apply
  const [activeTab, setActiveTab]   = useState<'apply' | 'pending' | 'my'>(canManage ? 'pending' : 'apply');

  // Filter state
  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | PermissionStatus>('PENDING');
  const [filterType,   setFilterType]   = useState<'ALL' | PermissionType>('ALL');

  // Apply form state
  const [permType,   setPermType]   = useState<PermissionType>('LATE_PERMISSION');
  const [permReason, setPermReason] = useState('');
  const [permDate,   setPermDate]   = useState<Date | null>(new Date());

  const loadRequests = useCallback(async () => {
    if (!canManage) return;
    try {
      const r = await api.get('/attendance/permission/team');
      if (r.data?.success) setAllRequests(r.data.data ?? []);
    } catch { /* silent */ }
  }, [canManage]);

  const loadMyHistory = useCallback(async () => {
    try {
      const r = await api.get('/attendance/my');
      if (r.data?.success) {
        setMyHistory((r.data.data ?? []).filter((rec: AttendanceRecord) => rec.permission !== 'NONE'));
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadRequests(), loadMyHistory()]);
      setLoading(false);
    })();
  }, [loadRequests, loadMyHistory]);

  // Stats
  const pendingCount  = useMemo(() => allRequests.filter(r => r.permission === 'PENDING').length,  [allRequests]);
  const approvedCount = useMemo(() => allRequests.filter(r => r.permission === 'APPROVED').length, [allRequests]);
  const rejectedCount = useMemo(() => allRequests.filter(r => r.permission === 'REJECTED').length, [allRequests]);

  // Filtered list
  const filtered = useMemo(() => allRequests.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !search
      || r.user?.name?.toLowerCase().includes(q)
      || r.user?.email?.toLowerCase().includes(q);
    const matchStatus = filterStatus === 'ALL' || r.permission === filterStatus;
    const matchType   = filterType   === 'ALL' || r.permissionType === filterType;
    return matchSearch && matchStatus && matchType;
  }).sort((a, b) => b.date.localeCompare(a.date)), [allRequests, search, filterStatus, filterType]);

  const handleApplyPermission = async () => {
    if (!permReason.trim()) { showToast('Missing Reason', 'Please provide a reason', 'error'); return; }
    if (!permDate)           { showToast('Missing Date',   'Please select a date',    'error'); return; }
    setSubmitting(true);
    try {
      const dateStr = permDate.toISOString().split('T')[0];
      await api.post('/attendance/permission/apply', { permissionType: permType, reason: permReason, date: dateStr });
      setPermReason('');
      await loadMyHistory();
      setActiveTab('my');
      showToast('Request Submitted', 'Your leave request has been sent for approval.', 'success');
    } catch (e: any) {
      showToast('Request Failed', e.response?.data?.message ?? 'Failed to apply permission', 'error');
    } finally { setSubmitting(false); }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.patch(`/attendance/permission/${id}/approve`);
      await loadRequests();
      showToast('Approved', 'Permission request approved.', 'success');
    } catch (e: any) { showToast('Error', e.response?.data?.message ?? 'Failed', 'error'); }
  };

  const handleReject = async (id: string) => {
    try {
      await api.patch(`/attendance/permission/${id}/reject`);
      await loadRequests();
      showToast('Rejected', 'Permission request rejected.', 'info');
    } catch (e: any) { showToast('Error', e.response?.data?.message ?? 'Failed', 'error'); }
  };

  return (
    <div className={pageStyles.wrapper}>
      <Sidebar />
      <main className={pageStyles.main}>
        <Header title="Permissions" subtitle="Manage leave and permission requests" />

        {/* ── Stats row (managers/admins only) ── */}
        {canManage && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Total Requests', value: allRequests.length, color: 'var(--primary)', bg: 'rgba(26,75,140,0.08)', icon: <ShieldCheck size={18} /> },
              { label: 'Pending',        value: pendingCount,        color: '#b45309',       bg: 'rgba(234,179,8,0.08)', icon: <Clock size={18} /> },
              { label: 'Approved',       value: approvedCount,       color: '#16a34a',       bg: 'rgba(34,197,94,0.08)', icon: <CheckCircle size={18} /> },
              { label: 'Rejected',       value: rejectedCount,       color: '#dc2626',       bg: 'rgba(239,68,68,0.08)', icon: <XCircle size={18} /> },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: '10px', background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {s.icon}
                </div>
                <div>
                  <p style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1, margin: 0 }}>{s.value}</p>
                  <p style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px', margin: '3px 0 0' }}>{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.25rem' }}>
          {canManage && (
            <button
              onClick={() => setActiveTab('pending')}
              style={{ flex: 1, padding: '0.6rem 1rem', borderRadius: '9px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', transition: 'all 0.15s',
                background: activeTab === 'pending' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'pending' ? '#fff' : 'var(--text-secondary)',
              }}>
              <Users size={14} /> All Requests
              {pendingCount > 0 && (
                <span style={{ background: activeTab === 'pending' ? 'rgba(255,255,255,0.25)' : 'rgba(239,68,68,0.1)', color: activeTab === 'pending' ? '#fff' : '#dc2626', fontSize: '0.65rem', fontWeight: 800, padding: '1px 6px', borderRadius: '20px' }}>
                  {pendingCount}
                </span>
              )}
            </button>
          )}
          <button
            onClick={() => setActiveTab('apply')}
            style={{ flex: 1, padding: '0.6rem 1rem', borderRadius: '9px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', transition: 'all 0.15s',
              background: activeTab === 'apply' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'apply' ? '#fff' : 'var(--text-secondary)',
            }}>
            <FileText size={14} /> Apply Permission
          </button>
          <button
            onClick={() => setActiveTab('my')}
            style={{ flex: 1, padding: '0.6rem 1rem', borderRadius: '9px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', transition: 'all 0.15s',
              background: activeTab === 'my' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'my' ? '#fff' : 'var(--text-secondary)',
            }}>
            <Calendar size={14} /> My Requests
            {myHistory.length > 0 && (
              <span style={{ background: activeTab === 'my' ? 'rgba(255,255,255,0.25)' : 'var(--primary-light)', color: activeTab === 'my' ? '#fff' : 'var(--primary)', fontSize: '0.65rem', fontWeight: 800, padding: '1px 6px', borderRadius: '20px' }}>
                {myHistory.length}
              </span>
            )}
          </button>
        </div>

        {/* ─── All Requests Tab ──────────────────────────────────────── */}
        {activeTab === 'pending' && canManage && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Filter bar */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Search */}
              <div style={{ position: 'relative', flex: '1 1 200px' }}>
                <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                <input
                  placeholder="Search by name or email…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 2rem', borderRadius: '9px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '0.82rem', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>

              {/* Status filter */}
              <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(s => {
                  const active = filterStatus === s;
                  const meta = s === 'ALL' ? null : STATUS_META[s];
                  return (
                    <button key={s} onClick={() => setFilterStatus(s)}
                      style={{ padding: '0.35rem 0.75rem', borderRadius: '20px', border: `1px solid ${active && meta ? meta.color : active ? 'var(--primary)' : 'var(--border)'}`, background: active && meta ? meta.bg : active ? 'var(--primary-light)' : 'transparent', color: active && meta ? meta.color : active ? 'var(--primary)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 700, fontSize: '0.72rem', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      {meta && meta.icon}
                      {s === 'ALL' ? 'All Status' : s.charAt(0) + s.slice(1).toLowerCase()}
                    </button>
                  );
                })}
              </div>

              {/* Type filter */}
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value as 'ALL' | PermissionType)}
                style={{ padding: '0.45rem 0.75rem', borderRadius: '9px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '0.8rem', fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
                <option value="ALL">All Types</option>
                {PERMISSION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>

              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Request cards */}
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '0.875rem' }}>
                Loading requests…
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '3rem 2rem', textAlign: 'center', background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: '16px', color: 'var(--text-secondary)' }}>
                <ShieldCheck size={28} style={{ marginBottom: '0.75rem', opacity: 0.3 }} />
                <p style={{ fontWeight: 600, fontSize: '0.9rem', margin: '0 0 0.25rem' }}>No requests found</p>
                <p style={{ fontSize: '0.8rem', margin: 0 }}>
                  {allRequests.length === 0 ? 'No permission requests have been submitted yet.' : 'Try changing the filters.'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {filtered.map(r => (
                  <RequestCard
                    key={r.id}
                    rec={r}
                    canManage={canManage}
                    onApprove={handleApprove}
                    onReject={handleReject}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Apply Permission Tab ─────────────────────────────────── */}
        {activeTab === 'apply' && (
          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>

              {/* Card header */}
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: 34, height: 34, borderRadius: '9px', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
                  <FileText size={16} />
                </div>
                <div>
                  <p style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', margin: 0 }}>New Permission Request</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Submit a request for leave, half-day, or late arrival</p>
                </div>
              </div>

              {/* Form body */}
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                {/* Type selector — visual cards */}
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '0.6rem' }}>
                    Request Type
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                    {PERMISSION_TYPES.map(t => {
                      const active = permType === t.value;
                      return (
                        <button key={t.value} onClick={() => setPermType(t.value)}
                          style={{ padding: '0.7rem 0.5rem', borderRadius: '10px', border: `1.5px solid ${active ? t.color : 'var(--border)'}`, background: active ? t.bg : 'var(--background)', color: active ? t.color : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem', fontFamily: 'inherit', textAlign: 'center', transition: 'all 0.15s' }}>
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Date picker */}
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '0.6rem' }}>
                    Date
                  </label>
                  <CustomDatePicker label="" selected={permDate} onChange={setPermDate} />
                </div>

                {/* Reason */}
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '0.6rem' }}>
                    Reason / Explanation <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <textarea
                    value={permReason}
                    onChange={e => setPermReason(e.target.value)}
                    placeholder="Describe the reason for your request in detail…"
                    rows={4}
                    style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '10px', border: `1.5px solid ${permReason.trim() ? 'var(--primary)' : 'var(--border)'}`, background: 'var(--background)', color: 'var(--text-primary)', fontSize: '0.875rem', fontFamily: 'inherit', outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6, transition: 'border-color 0.15s' }}
                  />
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: '0.35rem 0 0', fontWeight: 600 }}>
                    {permReason.trim().length}/500 characters
                  </p>
                </div>

                {/* Submit */}
                <button
                  onClick={handleApplyPermission}
                  disabled={submitting || !permReason.trim()}
                  style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: submitting || !permReason.trim() ? 'not-allowed' : 'pointer', opacity: submitting || !permReason.trim() ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontFamily: 'inherit', transition: 'opacity 0.15s' }}>
                  <Send size={15} /> {submitting ? 'Submitting…' : 'Submit Request'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── My Requests Tab ─────────────────────────────────────── */}
        {activeTab === 'my' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '0.875rem' }}>
                Loading your requests…
              </div>
            ) : myHistory.length === 0 ? (
              <div style={{ padding: '3.5rem 2rem', textAlign: 'center', background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
                <Calendar size={28} style={{ opacity: 0.25 }} />
                <p style={{ fontWeight: 700, color: 'var(--text-primary)', margin: 0, fontSize: '0.9rem' }}>No permission requests yet</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>Your submitted requests will appear here.</p>
                <button onClick={() => setActiveTab('apply')}
                  style={{ marginTop: '0.5rem', padding: '0.5rem 1.25rem', borderRadius: '9px', border: 'none', background: 'var(--primary)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', fontFamily: 'inherit' }}>
                  Apply Now
                </button>
              </div>
            ) : (
              myHistory.sort((a, b) => b.date.localeCompare(a.date)).map(r => {
                const st = STATUS_META[r.permission];
                const pt = PERMISSION_TYPES.find(t => t.value === r.permissionType);
                return (
                  <div key={r.id} style={{ background: 'var(--surface)', border: `1px solid ${r.permission === 'PENDING' ? 'rgba(234,179,8,0.4)' : r.permission === 'APPROVED' ? 'rgba(34,197,94,0.3)' : r.permission === 'REJECTED' ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`, borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>

                    {/* Status icon */}
                    <div style={{ width: 34, height: 34, borderRadius: '9px', background: st.bg, color: st.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                      {r.permission === 'APPROVED' ? <CheckCircle size={16} /> : r.permission === 'REJECTED' ? <XCircle size={16} /> : <Clock size={16} />}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{fmtDate(r.date)}</span>
                        {pt && <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: pt.bg, color: pt.color }}>{pt.label}</span>}
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: st.bg, color: st.color, display: 'flex', alignItems: 'center', gap: '3px' }}>{st.icon} {st.label}</span>
                      </div>
                      {r.permissionReason && (
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{r.permissionReason}</p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>
    </div>
  );
}
