'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useApp } from '@/context/AppContext';
import api from '@/lib/api';
import styles from '../attendance/page.module.css';
import permStyles from './permissions.module.css';
import pageStyles from '../page.module.css';
import { FileText, Clock, CheckCircle, XCircle, AlertCircle, Calendar, Send } from 'lucide-react';

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

const PERMISSION_TYPES: { value: PermissionType; label: string }[] = [
  { value: 'LATE_PERMISSION', label: 'Late Permission' },
  { value: 'HALF_DAY',        label: 'Half Day' },
  { value: 'LEAVE',           label: 'Full Leave' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function permBadgeClass(p: PermissionStatus): string {
  const map: Record<PermissionStatus, string> = {
    NONE:     styles.permBadgeNone,
    PENDING:  styles.permBadgePending,
    APPROVED: styles.permBadgeApproved,
    REJECTED: styles.permBadgeRejected,
  };
  return `${styles.badge} ${map[p]}`;
}

function statusBadgeClass(s: AttendanceStatus): string {
  const map: Record<AttendanceStatus, string> = {
    PRESENT:    styles.badgePresent,
    LATE:       styles.badgeLate,
    ABSENT:     styles.badgeAbsent,
    HALF_DAY:   styles.badgeHalfDay,
    LEAVE:      styles.badgeLeave,
    SUNDAY:     styles.badgeSunday,
    NOT_MARKED: styles.badgeNotMarked,
  };
  return `${styles.badge} ${map[s] ?? styles.badgeNotMarked}`;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PermissionsPage() {
  const { currentUser, showToast } = useApp();
  const role      = currentUser?.role;
  const isManager = role === 'MANAGER';
  const isAdmin   = role === 'ADMIN';
  const isSuper   = role === 'SUPER_ADMIN';

  const [loading,            setLoading]            = useState(true);
  const [submitting,         setSubmitting]         = useState(false);
  const [pendingPermissions, setPendingPermissions] = useState<AttendanceRecord[]>([]);
  const [myHistory,          setMyHistory]          = useState<AttendanceRecord[]>([]);
  const [activeTab,          setActiveTab]          = useState<'apply' | 'pending' | 'my'>('apply');

  const [permType,           setPermType]           = useState<PermissionType>('LATE_PERMISSION');
  const [permReason,         setPermReason]         = useState('');
  const [permDate,           setPermDate]           = useState<Date | null>(new Date());

  const loadPending = useCallback(async () => {
    try {
      const endpoint = isSuper || isAdmin || isManager ? '/attendance/permission/team' : null;
      if (!endpoint) return;
      const r = await api.get(endpoint);
      if (r.data?.success) setPendingPermissions(r.data.data);
    } catch { /* silent */ }
  }, [isSuper, isAdmin, isManager]);

  const loadMyHistory = useCallback(async () => {
    try {
      const r = await api.get('/attendance/my');
      if (r.data?.success) {
        const filtered = r.data.data.filter((rec: AttendanceRecord) => rec.permission !== 'NONE');
        setMyHistory(filtered);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadPending(), loadMyHistory()]);
      setLoading(false);
    })();
  }, [loadPending, loadMyHistory]);

  const handleApplyPermission = async () => {
    if (!permReason.trim()) { showToast('Missing Reason', 'Please provide a reason', 'error'); return; }
    if (!permDate) { showToast('Missing Date', 'Please select a date', 'error'); return; }
    setSubmitting(true);
    try {
      const dateStr = permDate.toISOString().split('T')[0];
      await api.post('/attendance/permission/apply', { permissionType: permType, reason: permReason, date: dateStr });
      setPermReason(''); 
      await loadMyHistory();
      setActiveTab('my');
      showToast('Request Submitted', 'Your leave request has been sent for approval.', 'success');
    } catch (e: any) { showToast('Request Failed', e.response?.data?.message ?? 'Failed to apply permission', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.patch(`/attendance/permission/${id}/approve`);
      await loadPending();
      showToast('Approved', 'Permission request approved.', 'success');
    } catch (e: any) { showToast('Error', e.response?.data?.message ?? 'Failed', 'error'); }
  };

  const handleReject = async (id: string) => {
    try {
      await api.patch(`/attendance/permission/${id}/reject`);
      await loadPending();
      showToast('Rejected', 'Permission request rejected.', 'info');
    } catch (e: any) { showToast('Error', e.response?.data?.message ?? 'Failed', 'error'); }
  };

  return (
    <div className={pageStyles.wrapper}>
      <Sidebar />
      <main className={pageStyles.main}>
        <Header title="Permissions" subtitle="Apply for leaves, half-days, or late permissions" />

        <div className={pageStyles.pageTitleRow}>
          <div>
            <h2>Permission Management</h2>
            <p>Handle your requests and team approvals in one place</p>
          </div>
        </div>

        <div className={styles.tabs}>
          <button className={`${styles.tab} ${activeTab === 'apply' ? styles.activeTab : ''}`} onClick={() => setActiveTab('apply')}>Apply Permission</button>
          {(isSuper || isAdmin || isManager) && (
            <button className={`${styles.tab} ${activeTab === 'pending' ? styles.activeTab : ''}`} onClick={() => setActiveTab('pending')}>
              Pending Approvals ({pendingPermissions.length})
            </button>
          )}
          <button className={`${styles.tab} ${activeTab === 'my' ? styles.activeTab : ''}`} onClick={() => setActiveTab('my')}>My Requests</button>
        </div>

        {activeTab === 'apply' && (
          <div className={permStyles.container}>
            <div className={permStyles.card}>
              <div className={permStyles.title}>
                <FileText size={24} color="var(--primary)" />
                New Permission Request
              </div>
              
              <div className={permStyles.formGrid}>
                <div className={permStyles.field}>
                  <label className={permStyles.label}>Request Type</label>
                  <select 
                    className={permStyles.select} 
                    value={permType} 
                    onChange={e => setPermType(e.target.value as PermissionType)}
                  >
                    {PERMISSION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>

                <div className={permStyles.field}>
                  <CustomDatePicker 
                    label="Select Date"
                    selected={permDate}
                    onChange={setPermDate}
                  />
                </div>

                <div className={`${permStyles.field} ${permStyles.fullWidth}`}>
                  <label className={permStyles.label}>Reason / Explanation</label>
                  <textarea 
                    className={permStyles.textarea} 
                    value={permReason} 
                    onChange={e => setPermReason(e.target.value)} 
                    placeholder="Provide details about your request..." 
                  />
                </div>
              </div>

              <button 
                className={permStyles.submitBtn} 
                onClick={handleApplyPermission} 
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : (
                  <>
                    Submit Request <Send size={18} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'pending' && (
          <div className={styles.sectionCard}>
            <div className={styles.sectionTitle}><Clock size={18} /> Pending Team Approvals</div>
            {pendingPermissions.length === 0 ? (
              <div className={styles.empty}>No pending permission requests</div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr><th>Employee</th><th>Date</th><th>Type</th><th>Reason</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {pendingPermissions.map(r => (
                      <tr key={r.id}>
                        <td><strong>{r.user?.name}</strong><br/><small>{r.user?.email}</small></td>
                        <td>{formatDate(r.date)}</td>
                        <td><span className={styles.rolePill}>{r.permissionType?.replace('_',' ')}</span></td>
                        <td><div style={{ maxWidth: 200, fontSize: '0.8rem' }}>{r.permissionReason}</div></td>
                        <td>
                          <button className={styles.approveBtn} onClick={() => handleApprove(r.id)}>Approve</button>
                          <button className={styles.rejectBtn} onClick={() => handleReject(r.id)}>Reject</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'my' && (
          <div className={styles.sectionCard}>
            <div className={styles.sectionTitle}><Calendar size={18} /> My Permission History</div>
            {myHistory.length === 0 ? (
              <div className={styles.empty}>You haven't applied for any permissions yet</div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr><th>Date</th><th>Type</th><th>Status</th><th>Reason</th></tr>
                  </thead>
                  <tbody>
                    {myHistory.map(r => (
                      <tr key={r.id}>
                        <td>{formatDate(r.date)}</td>
                        <td><span className={styles.rolePill}>{r.permissionType?.replace('_',' ')}</span></td>
                        <td><span className={permBadgeClass(r.permission)}>{r.permission}</span></td>
                        <td><div style={{ maxWidth: 250, fontSize: '0.8rem' }}>{r.permissionReason}</div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
