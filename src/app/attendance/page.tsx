'use client';

import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';


import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useApp } from '@/context/AppContext';
import api from '@/lib/api';
import styles from './page.module.css';
import pageStyles from '../page.module.css';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  Clock, LogIn, LogOut, FileText, Users, ShieldCheck, CheckCircle,
  XCircle, Search, RefreshCw, UserCheck, UserX, Calendar,
  ChevronDown, ChevronRight, Activity, History, ClipboardEdit, X, Download, User
} from 'lucide-react';
import CustomDatePicker from '@/components/CustomDatePicker';

// ─── Types ────────────────────────────────────────────────────────────────────

type AttendanceStatus = 'NOT_MARKED' | 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'LEAVE' | 'SUNDAY';
type CheckInStatus = 'ON_TIME' | 'LATE' | 'VERY_LATE';
type PermissionStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
type PermissionType = 'HALF_DAY' | 'LEAVE' | 'LATE_PERMISSION';
type CorrectionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  status: AttendanceStatus;
  checkIn: string | null;
  checkOut: string | null;
  totalHours: number | null;
  todayPlan: string | null;
  morningPlan?: string | null;
  afternoonPlan: string | null;
  dayCompletion: string | null;
  permission: PermissionStatus;
  permissionType: PermissionType | null;
  permissionReason: string | null;
  checkInStatus: CheckInStatus | null;
  user?: { id: string; name: string; email: string; role: string };
}

interface DashboardStats {
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  pendingPermissions: number;
  approvedPermissions: number;
  activeNow: number;
}

interface AuditLog {
  id: string;
  attendanceId: string;
  changedById: string;
  oldStatus: AttendanceStatus | null;
  newStatus: AttendanceStatus | null;
  oldCheckIn: string | null;
  newCheckIn: string | null;
  oldCheckOut: string | null;
  newCheckOut: string | null;
  reason: string | null;
  createdAt: string;
  changedBy?: { id: string; name: string; role: string };
  attendance?: AttendanceRecord & { user?: { id: string; name: string; email: string } };
}

interface CorrectionRequest {
  id: string;
  userId: string;
  date: string;
  requestedStatus: AttendanceStatus;
  requestedCheckIn: string | null;
  requestedCheckOut: string | null;
  reason: string;
  status: CorrectionStatus;
  reviewedById: string | null;
  reviewNote: string | null;
  createdAt: string;
  user?: { id: string; name: string; email: string; role: string };
  reviewedBy?: { id: string; name: string } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  });
}

function formatDateShort(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function formatDuration(hours: number | null): string {
  if (hours === null) return '—';
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

function calculateLiveDiff(checkInIso: string | null): string {
  if (!checkInIso) return '—';
  const start = new Date(checkInIso).getTime();
  const diff = Date.now() - start;
  if (diff < 0) return '0h 0m';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m`;
}

function formatConfigTime(time24: string): string {
  if (!time24) return '—';
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${period}`;
}

function statusBadgeClass(s: AttendanceStatus): string {
  const map: Record<AttendanceStatus, string> = {
    PRESENT: styles.badgePresent,
    LATE: styles.badgeLate,
    ABSENT: styles.badgeAbsent,
    HALF_DAY: styles.badgeHalfDay,
    LEAVE: styles.badgeLeave,
    SUNDAY: styles.badgeSunday,
    NOT_MARKED: styles.badgeNotMarked,
  };
  return `${styles.badge} ${map[s] ?? styles.badgeNotMarked}`;
}

function permBadgeClass(p: PermissionStatus): string {
  const map: Record<PermissionStatus, string> = {
    NONE: styles.permBadgeNone,
    PENDING: styles.permBadgePending,
    APPROVED: styles.permBadgeApproved,
    REJECTED: styles.permBadgeRejected,
  };
  return `${styles.badge} ${map[p]}`;
}

function correctionBadgeClass(s: CorrectionStatus): string {
  if (s === 'APPROVED') return `${styles.badge} ${styles.permBadgeApproved}`;
  if (s === 'REJECTED') return `${styles.badge} ${styles.permBadgeRejected}`;
  return `${styles.badge} ${styles.permBadgePending}`;
}

function roleLabel(role: string | undefined): string {
  if (role === 'SUPER_ADMIN') return 'Super Admin';
  if (role === 'ADMIN') return 'Admin';
  if (role === 'MANAGER') return 'Team Leader';
  if (role === 'EMPLOYEE') return 'Employee';
  return role ?? '—';
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const PERMISSION_TYPES: { value: PermissionType; label: string }[] = [
  { value: 'LATE_PERMISSION', label: 'Late Permission' },
  { value: 'HALF_DAY', label: 'Half Day' },
  { value: 'LEAVE', label: 'Full Leave' },
];

const PIE_COLORS: Record<AttendanceStatus, string> = {
  PRESENT: '#22c55e',
  LATE: '#f97316',
  ABSENT: '#ef4444',
  HALF_DAY: '#eab308',
  LEAVE: '#6366f1',
  SUNDAY: '#9ca3af',
  NOT_MARKED: '#d1d5db',
};


// ─── TeamRow ──────────────────────────────────────────────────────────────────

interface TeamData {
  managerId: string;
  managerName: string;
  records: AttendanceRecord[];
  present: number;
  total: number;
}

function TeamRow({ team }: { team: TeamData }) {
  const [expanded, setExpanded] = useState(false);
  const rate = team.total > 0 ? Math.round((team.present / team.total) * 100) : 0;
  const rateColor = rate >= 80 ? '#16a34a' : rate >= 60 ? '#ea580c' : '#dc2626';

  return (
    <div className={styles.teamRow}>
      <div className={styles.teamHeader} onClick={() => setExpanded(e => !e)}>
        <div className={styles.teamInfo}>
          {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          <span className={styles.teamName}>{team.managerName} Team</span>
          <span className={styles.teamCount}>{team.total} member{team.total !== 1 ? 's' : ''}</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.15rem 0.5rem', fontWeight: 600 }}>Team Leader</span>
        </div>
        <div className={styles.teamStats}>
          <span style={{ color: '#16a34a', fontSize: '0.82rem', fontWeight: 700 }}>{team.present} present</span>
          <span style={{ color: rateColor, fontSize: '0.82rem', fontWeight: 800, marginLeft: '0.75rem' }}>{rate}%</span>
        </div>
      </div>
      {expanded && (
        <div className={styles.teamBody}>
          <table className={styles.table}>
            <thead>
              <tr><th>Employee</th><th>Status</th><th>Check In</th><th>Check Out</th><th>Hours</th></tr>
            </thead>
            <tbody>
              {team.records.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.user?.name ?? '—'}</td>
                  <td><span className={statusBadgeClass(r.status)}>{r.status.replace('_', ' ')}</span></td>
                  <td>{formatTime(r.checkIn)}</td>
                  <td>{formatTime(r.checkOut)}</td>
                  <td>
                    {r.checkIn && !r.checkOut
                      ? <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{calculateLiveDiff(r.checkIn)} (Active)</span>
                      : formatDuration(r.totalHours)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── LiveStatusCard ───────────────────────────────────────────────────────────

function LiveStatusCard({
  title, count, color, records, extra,
}: {
  title: string; count: number; color: string;
  records: AttendanceRecord[];
  extra?: (r: AttendanceRecord) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const isActive = title.toLowerCase().includes('active');

  return (
    <div className={styles.liveStatusCard} style={{ '--glow-color': `${color}60`, '--shadow-color': `${color}20` } as React.CSSProperties}>
      <div onClick={() => setOpen(o => !o)} className={styles.liveStatusHeader}>
        <div className={styles.liveStatusIconBox} style={{ background: `${color}12`, color }}>
          {isActive ? <Activity size={20} /> : <Clock size={20} />}
          {isActive && <span className={styles.pulsingDot} />}
        </div>
        <div className={styles.liveStatusDetails}>
          <p className={styles.liveStatusVal} style={{ color }}>{count}</p>
          <p className={styles.liveStatusLbl}>{title}</p>
        </div>
        <div className={`${styles.liveStatusChevron} ${open ? styles.liveStatusChevronOpen : ''}`}>
          <ChevronDown size={14} />
        </div>
      </div>
      {open && (
        <div className={styles.liveStatusContent}>
          {records.length === 0 ? (
            <p className={styles.liveStatusEmpty}>No employees to display</p>
          ) : records.map(r => (
            <div key={r.id} className={styles.liveStatusRow}>
              <div className={styles.liveStatusAvatar} style={{ background: `linear-gradient(135deg, ${color}15, ${color}25)`, color }}>
                {(r.user?.name ?? '?').slice(0, 2).toUpperCase()}
              </div>
              <div className={styles.liveStatusInfo}>
                <p className={styles.liveStatusName}>{r.user?.name ?? '—'}</p>
                <p className={styles.liveStatusRole}>{roleLabel(r.user?.role)}</p>
              </div>
              {extra && <span className={styles.liveStatusExtra} style={{ color }}>{extra(r)}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CustomTooltip ────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.customTooltip}>
      <p className={styles.tooltipLabel}>{label}</p>
      <div className={styles.tooltipDivider} />
      {payload.map((entry: any) => (
        <div key={entry.name} className={styles.tooltipItem}>
          <span className={styles.tooltipDot} style={{ backgroundColor: entry.color || entry.fill }} />
          <span className={styles.tooltipName}>{entry.name}:</span>
          <span className={styles.tooltipVal}>{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── DownloadReportModal ─────────────────────────────────────────────────────

type PeriodType = 'monthly' | 'yearly' | 'custom';

function DownloadReportModal({ onClose }: { onClose: () => void }) {
  const now = new Date();
  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [downloading, setDownloading] = useState(false);

  const years = [now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear()];

  const handleDownload = async () => {
    setDownloading(true);
    try {
      let url = `/attendance/report/download?periodType=${periodType}&format=csv`;
      if (periodType === 'monthly') url += `&month=${month}&year=${year}`;
      else if (periodType === 'yearly') url += `&year=${year}`;
      else url += `&startDate=${startDate}&endDate=${endDate}`;

      // Use fetch directly so we can handle the blob
      const crmUser = typeof window !== 'undefined' ? localStorage.getItem('crm_user') : null;
      const token = crmUser ? JSON.parse(crmUser)?.token : null;
      const baseURL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api';
      const res = await fetch(`${baseURL}${url}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any)?.message ?? 'Download failed');
      }

      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? 'Attendance_Report.csv';

      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
      onClose();
    } catch (err: any) {
      alert(err?.message ?? 'Download failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const isValid = periodType === 'custom'
    ? Boolean(startDate && endDate && startDate <= endDate)
    : true;

  return (
    <div className={styles.modalOverlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal} style={{ maxWidth: 500 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px -4px rgba(99,102,241,0.4)' }}>
              <Download size={18} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>Download Attendance Report</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>Export as CSV — all employees</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={14} /></button>
        </div>

        {/* Period Type Selector */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Report Period</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            {(['monthly', 'yearly', 'custom'] as PeriodType[]).map(pt => (
              <button
                key={pt}
                onClick={() => setPeriodType(pt)}
                style={{
                  padding: '0.65rem 0.5rem',
                  borderRadius: 10,
                  border: periodType === pt ? '2px solid #6366f1' : '1.5px solid var(--border)',
                  background: periodType === pt ? 'rgba(99,102,241,0.08)' : 'var(--surface)',
                  color: periodType === pt ? '#6366f1' : 'var(--text-secondary)',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  transition: 'all 0.2s',
                }}
              >
                {pt === 'monthly' ? '📅 Monthly' : pt === 'yearly' ? '📆 Yearly' : '🗓️ Custom'}
              </button>
            ))}
          </div>
        </div>

        {/* Monthly Options */}
        {periodType === 'monthly' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Month</label>
              <select className={styles.formSelect} value={month} onChange={e => setMonth(Number(e.target.value))}>
                {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Year</label>
              <select className={styles.formSelect} value={year} onChange={e => setYear(Number(e.target.value))}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Yearly Options */}
        {periodType === 'yearly' && (
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Year</label>
            <select className={styles.formSelect} value={year} onChange={e => setYear(Number(e.target.value))}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}

        {/* Custom Date Range */}
        {periodType === 'custom' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Start Date</label>
              <input type="date" className={styles.formInput} value={startDate} onChange={e => setStartDate(e.target.value)} max={endDate || undefined} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>End Date</label>
              <input type="date" className={styles.formInput} value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate || undefined} />
            </div>
          </div>
        )}

        {/* Info Box */}
        <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          📊 The report includes a <strong>summary section</strong> (totals per employee) and a <strong>detailed daily records section</strong> with check-in/out times, status, and permissions.
        </div>

        {/* Buttons */}
        <div className={styles.modalBtns}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button
            onClick={handleDownload}
            disabled={downloading || !isValid}
            style={{
              padding: '0.65rem 1.5rem',
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: downloading || !isValid ? 'not-allowed' : 'pointer',
              opacity: downloading || !isValid ? 0.6 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'opacity 0.2s',
            }}
          >
            <Download size={14} />
            {downloading ? 'Preparing…' : 'Download CSV'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SuperAdminMonitor ────────────────────────────────────────────────────────

function SuperAdminMonitor() {
  const { users, departments, showToast, socket } = useApp();
  const now = new Date();

  const [loading, setLoading] = useState(true);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [allToday, setAllToday] = useState<AttendanceRecord[]>([]);
  const [monthlyData, setMonthlyData] = useState<AttendanceRecord[]>([]);
  const [pendingPermissions, setPendingPermissions] = useState<AttendanceRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [corrections, setCorrections] = useState<CorrectionRequest[]>([]);
  const [tick, setTick] = useState(0);
  const loadDataFired = useRef(false);

  // live clock tick
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  type AdminTab = 'teams' | 'records' | 'permissions' | 'corrections' | 'overrideHistory' | 'productivity';
  const [activeTab, setActiveTab] = useState<AdminTab>('productivity');
  const [showRolePerformance, setShowRolePerformance] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'permissions') setActiveTab('permissions');
    else if (t === 'corrections') setActiveTab('corrections');
  }, [searchParams]);

  const [chartView, setChartView] = useState<'weekly' | 'monthly'>('weekly');
  const [histMonth, setHistMonth] = useState(now.getMonth() + 1);
  const [histYear, setHistYear] = useState(now.getFullYear());
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterDept, setFilterDept] = useState('ALL');

  const [overrideRecord, setOverrideRecord] = useState<AttendanceRecord | null>(null);
  const [overrideStatus, setOverrideStatus] = useState<AttendanceStatus>('PRESENT');
  const [overrideCheckIn, setOverrideCheckIn] = useState('');
  const [overrideCheckOut, setOverrideCheckOut] = useState('');
  const [overrideRemarks, setOverrideRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [viewEmpRecord, setViewEmpRecord] = useState<AttendanceRecord | null>(null);
  const [empHistory, setEmpHistory] = useState<AttendanceRecord[]>([]);
  const [empHistLoading, setEmpHistLoading] = useState(false);
  const [empHistMonth, setEmpHistMonth] = useState(now.getMonth() + 1);
  const [empHistYear, setEmpHistYear] = useState(now.getFullYear());

  // Productivity Score state
  interface PerfStat {
    user: { id: string; name: string; role: string };
    present: number; late: number; halfDay: number; absent: number; working: number; score: number;
  }
  const [perfData, setPerfData] = useState<PerfStat[]>([]);
  const [perfMonth, setPerfMonth] = useState(now.getMonth() + 1);
  const [perfYear, setPerfYear] = useState(now.getFullYear());
  const [perfLoading, setPerfLoading] = useState(false);

  const loadEmpHistory = useCallback(async (userId: string, month: number, year: number) => {
    setEmpHistLoading(true);
    try {
      const res = await api.get(`/attendance/all?month=${month}&year=${year}`);
      if (res.data?.success) {
        setEmpHistory((res.data.data ?? []).filter((r: AttendanceRecord) => r.userId === userId));
      }
    } catch { /* silent */ }
    setEmpHistLoading(false);
  }, []);

  useEffect(() => {
    if (viewEmpRecord) loadEmpHistory(viewEmpRecord.userId, empHistMonth, empHistYear);
  }, [viewEmpRecord, empHistMonth, empHistYear, loadEmpHistory]);

  const loadPerformance = useCallback(async (month: number, year: number) => {
    setPerfLoading(true);
    try {
      const res = await api.get(`/attendance/performance?month=${month}&year=${year}`);
      if (res.data?.success) setPerfData(res.data.data ?? []);
    } catch { /* silent */ }
    setPerfLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === 'productivity') loadPerformance(perfMonth, perfYear);
  }, [activeTab, perfMonth, perfYear, loadPerformance]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, todayRes, pendingRes, auditRes, corrRes] = await Promise.all([
        api.get('/attendance/stats'),
        api.get('/attendance/all'),
        api.get('/attendance/permission/team'),
        api.get('/attendance/audit-logs'),
        api.get('/attendance/correction/requests'),
      ]);
      if (statsRes.data?.success) setStats(statsRes.data.data);
      if (todayRes.data?.success) setAllToday(todayRes.data.data ?? []);
      if (pendingRes.data?.success) setPendingPermissions(pendingRes.data.data ?? []);
      if (auditRes.data?.success) setAuditLogs(auditRes.data.data ?? []);
      if (corrRes.data?.success) setCorrections(corrRes.data.data ?? []);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (loadDataFired.current) return;
    loadDataFired.current = true;
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      console.log('⏰ Socket: Attendance updated, reloading monitor data...');
      loadData();
    };
    socket.on('attendance:updated', handleUpdate);
    return () => {
      socket.off('attendance:updated', handleUpdate);
    };
  }, [socket, loadData]);

  useEffect(() => {
    const controller = new AbortController();
    api.get(`/attendance/all?month=${histMonth}&year=${histYear}`, { signal: controller.signal })
      .then(res => { if (res.data?.success) setMonthlyData(res.data.data ?? []); })
      .catch(err => { if (err.code !== 'ERR_CANCELED') console.error(err); });
    return () => controller.abort();
  }, [histMonth, histYear]);

  // ── Derived data ───────────────────────────────────────────────────────────

  // Exclude SUPER_ADMIN from all attendance calculations
  const eligibleToday = useMemo(
    () => allToday.filter(r => r.user?.role !== 'SUPER_ADMIN'),
    [allToday],
  );

  const pieData = useMemo(() => {
    const counts: Partial<Record<AttendanceStatus, number>> = {};
    eligibleToday.forEach(r => { counts[r.status] = (counts[r.status] ?? 0) + 1; });
    return (Object.entries(counts) as [AttendanceStatus, number][])
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
  }, [eligibleToday]);

  const trendData = useMemo(() => {
    const byDate: Record<string, { date: string; present: number; late: number; absent: number; halfDay: number }> = {};
    monthlyData
      .filter(r => r.user?.role !== 'SUPER_ADMIN')
      .forEach(r => {
        const d = r.date.split('T')[0];
        if (!byDate[d]) byDate[d] = { date: d, present: 0, late: 0, absent: 0, halfDay: 0 };
        const isLate = r.status === 'LATE' || (r.checkInStatus === 'LATE' || r.checkInStatus === 'VERY_LATE');
        if (isLate) byDate[d].late++;
        else if (r.status === 'PRESENT') byDate[d].present++;
        else if (r.status === 'ABSENT') byDate[d].absent++;
        else if (r.status === 'HALF_DAY') byDate[d].halfDay++;
      });
    const sorted = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
    const slice = chartView === 'weekly' ? sorted.slice(-7) : sorted;
    return slice.map(d => ({
      ...d,
      label: chartView === 'weekly'
        ? new Date(d.date + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', timeZone: 'UTC' })
        : new Date(d.date + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', timeZone: 'UTC' }),
    }));
  }, [monthlyData, chartView]);

  // Role breakdown — ADMIN, MANAGER, EMPLOYEE only (SUPER_ADMIN excluded)
  const roleStats = useMemo(() => (
    ['ADMIN', 'MANAGER', 'EMPLOYEE'].map(role => {
      const recs = eligibleToday.filter(r => r.user?.role === role);
      const present = recs.filter(r => r.status === 'PRESENT').length;
      const late = recs.filter(r =>
        r.status === 'LATE' || r.checkInStatus === 'LATE' || r.checkInStatus === 'VERY_LATE',
      ).length;
      const halfDay = recs.filter(r => r.status === 'HALF_DAY').length;
      const absent = recs.filter(r => r.status === 'ABSENT').length;
      // Weighted performance: Present=1, Late=0.75, HalfDay=0.5, Absent=0
      const workingRecs = recs.filter(r => r.status !== 'SUNDAY' && r.status !== 'NOT_MARKED');
      const weighted = present * 1 + late * 0.75 + halfDay * 0.5;
      const rate = workingRecs.length > 0 ? Math.round((weighted / workingRecs.length) * 100) : 0;
      return { role, total: recs.length, present, late, halfDay, absent, rate };
    })
  ), [eligibleToday]);

  const teamMapping = useMemo<TeamData[]>(() => {
    const map: Record<string, TeamData> = {};
    eligibleToday.forEach(r => {
      const u = users.find(u => u.id === r.userId);
      const managerId = u?.managerId ?? 'unassigned';
      if (!map[managerId]) {
        const mgr = users.find(u => u.id === managerId);
        map[managerId] = {
          managerId,
          managerName: mgr?.name ?? (managerId === 'unassigned' ? 'Unassigned' : 'Unknown'),
          records: [],
          present: 0,
          total: 0,
        };
      }
      map[managerId].records.push(r);
      map[managerId].total++;
      if (['PRESENT', 'LATE', 'HALF_DAY'].includes(r.status)) map[managerId].present++;
    });
    return Object.values(map);
  }, [eligibleToday, users]);

  const filteredRecords = useMemo(() => eligibleToday.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !search || r.user?.name?.toLowerCase().includes(q) || r.user?.email?.toLowerCase().includes(q);
    const matchRole = filterRole === 'ALL' || r.user?.role === filterRole;
    let matchStatus = filterStatus === 'ALL';
    if (!matchStatus) {
      if (filterStatus === 'LATE') {
        matchStatus = r.status === 'LATE' || r.checkInStatus === 'LATE' || r.checkInStatus === 'VERY_LATE';
      } else {
        matchStatus = r.status === filterStatus;
      }
    }
    const userObj = users.find(u => u.id === r.userId);
    const matchDept = filterDept === 'ALL' || userObj?.departmentId === filterDept;
    return matchSearch && matchRole && matchStatus && matchDept;
  }), [eligibleToday, search, filterRole, filterStatus, filterDept, users]);

  const activeNow = useMemo(() => eligibleToday.filter(r => r.checkIn && !r.checkOut), [eligibleToday]);
  const completedDay = useMemo(() => eligibleToday.filter(r => r.checkIn && r.checkOut), [eligibleToday]);
  const notMarked = useMemo(() => eligibleToday.filter(r => !r.checkIn && r.status !== 'SUNDAY'), [eligibleToday]);
  const pendingCount = useMemo(() => pendingPermissions.filter(r => r.permission === 'PENDING').length, [pendingPermissions]);
  const pendingCorrections = useMemo(() => corrections.filter(c => c.status === 'PENDING').length, [corrections]);

  // Stats cards (exclude SUPER_ADMIN — backend already excludes, but guard on frontend)
  const eligibleUsers = useMemo(() => users.filter(u => u.role !== 'SUPER_ADMIN'), [users]);

  const openOverride = (rec: AttendanceRecord) => {
    setViewEmpRecord(null);
    setOverrideRecord(rec);
    setOverrideStatus(rec.status);
    setOverrideCheckIn(rec.checkIn ? new Date(rec.checkIn).toISOString().slice(0, 16) : '');
    setOverrideCheckOut(rec.checkOut ? new Date(rec.checkOut).toISOString().slice(0, 16) : '');
    setOverrideRemarks('');
  };

  const handleOverride = async () => {
    if (!overrideRecord) return;
    if (!overrideRemarks.trim()) {
      showToast('Reason Required', 'Please provide a reason for the override.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api.patch(`/attendance/${overrideRecord.id}`, {
        status: overrideStatus,
        checkIn: overrideCheckIn || null,
        checkOut: overrideCheckOut || null,
        remarks: overrideRemarks,
      });
      setOverrideRecord(null);
      await loadData();
      showToast('Override Saved', 'Attendance has been updated and logged.', 'success');
    } catch (e: any) {
      showToast('Override Failed', e.response?.data?.message ?? 'Override failed', 'error');
    } finally { setSubmitting(false); }
  };

  const handleApproveSA = async (id: string) => {
    try { await api.patch(`/attendance/permission/${id}/approve`); await loadData(); showToast('Approved', 'Permission approved', 'success'); }
    catch (e: any) { showToast('Error', e.response?.data?.message ?? 'Failed', 'error'); }
  };
  const handleRejectSA = async (id: string) => {
    try { await api.patch(`/attendance/permission/${id}/reject`); await loadData(); showToast('Rejected', 'Permission rejected', 'error'); }
    catch (e: any) { showToast('Error', e.response?.data?.message ?? 'Failed', 'error'); }
  };

  const handleApproveCorrection = async (id: string, note: string) => {
    try { await api.patch(`/attendance/correction/${id}/review`, { approved: true, note }); await loadData(); showToast('Approved', 'Correction approved and attendance updated.', 'success'); }
    catch (e: any) { showToast('Error', e.response?.data?.message ?? 'Failed', 'error'); }
  };
  const handleRejectCorrection = async (id: string, note: string) => {
    try { await api.patch(`/attendance/correction/${id}/review`, { approved: false, note }); await loadData(); showToast('Rejected', 'Correction rejected.', 'error'); }
    catch (e: any) { showToast('Error', e.response?.data?.message ?? 'Failed', 'error'); }
  };

  if (loading) return <div className={styles.empty}>Loading attendance data…</div>;

  const todayLabel = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <>
      {showDownloadModal && <DownloadReportModal onClose={() => setShowDownloadModal(false)} />}

      {/* Date + Refresh + Download */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 0 4px rgba(34,197,94,0.18)' }} />
            <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 800 }}>LIVE</span>
          </div>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600 }}>{todayLabel}</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            onClick={() => setShowDownloadModal(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.5rem 1.1rem',
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: 'white', border: 'none', borderRadius: 10,
              fontSize: '0.825rem', fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 12px -2px rgba(99,102,241,0.4)',
              transition: 'opacity 0.2s',
            }}
          >
            <Download size={13} /> Download Report
          </button>
          <button className={styles.refreshBtn} onClick={loadData}>
            <RefreshCw size={13} style={{ display: 'inline', marginRight: 5 }} />Refresh
          </button>
        </div>
      </div>

      {/* Pending alerts */}
      {(pendingCount > 0 || pendingCorrections > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.1rem' }}>
          {pendingCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)', borderLeft: '4px solid #f59e0b', borderRadius: '12px', padding: '0.75rem 1.1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#b45309', fontWeight: 700 }}>⚠ {pendingCount} permission request{pendingCount !== 1 ? 's' : ''} awaiting approval</span>
              <button onClick={() => router.push('/permissions')} style={{ fontSize: '0.78rem', fontWeight: 800, color: '#b45309', background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.3)', padding: '0.35rem 0.85rem', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit' }}>Review →</button>
            </div>
          )}
          {pendingCorrections > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)', borderLeft: '4px solid #6366f1', borderRadius: '12px', padding: '0.75rem 1.1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#4338ca', fontWeight: 700 }}>📋 {pendingCorrections} correction request{pendingCorrections !== 1 ? 's' : ''} a waiting review</span>
              <button onClick={() => router.push('/permissions')} style={{ fontSize: '0.78rem', fontWeight: 800, color: '#4338ca', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', padding: '0.35rem 0.85rem', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit' }}>Review →</button>
            </div>
          )}
        </div>
      )}

      {/* Stat Cards */}
      <div className={styles.monitorGrid}>
        {[
          { color: '#4f46e5', bg: 'rgba(99,102,241,0.08)', val: eligibleUsers.length, label: 'Total Employees' },
          { color: '#16a34a', bg: 'rgba(34,197,94,0.08)', val: stats?.present ?? 0, label: 'Present Today' },
          { color: '#dc2626', bg: 'rgba(239,68,68,0.08)', val: stats?.absent ?? 0, label: 'Absent Today' },
          { color: '#ea580c', bg: 'rgba(249,115,22,0.08)', val: stats?.late ?? 0, label: 'Late Arrivals' },
          { color: '#b45309', bg: 'rgba(234,179,8,0.08)', val: stats?.halfDay ?? 0, label: 'Half Day' },
        ].map(({ color, bg, val, label }) => (
          <div key={label} className={styles.monitorCard} style={{ '--glow-color': `${color}50`, '--shadow-color': `${color}20` } as React.CSSProperties}>
            <div className={styles.monitorIcon} style={{ background: bg, color }}>
              {label === 'Total Employees' ? <Users size={18} /> : label === 'Present Today' ? <UserCheck size={18} /> : label === 'Absent Today' ? <UserX size={18} /> : label === 'Late Arrivals' ? <Clock size={18} /> : <Calendar size={18} />}
            </div>
            <div className={styles.monitorVal} style={{ color }}>{val}</div>
            <div className={styles.monitorLbl}>{label}</div>
          </div>
        ))}
      </div>

      {/* Live Status Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
        <LiveStatusCard title="Active Now" count={activeNow.length} color="#16a34a" records={activeNow} extra={r => calculateLiveDiff(r.checkIn)} />
        <LiveStatusCard title="Not Marked Yet" count={notMarked.length} color="#ea580c" records={notMarked} />
        <LiveStatusCard title="Day Completed" count={completedDay.length} color="#4f46e5" records={completedDay} extra={r => formatDuration(r.totalHours)} />
      </div>

      {/* Charts */}
      <div className={styles.chartsRow}>
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Today&apos;s Distribution</div>
          {pieData.length === 0 ? <div className={styles.empty}>No data</div> : (
            <ResponsiveContainer width="100%" height={250} minWidth={0} minHeight={250}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {pieData.map(entry => <Cell key={entry.name} fill={PIE_COLORS[entry.name as AttendanceStatus] ?? '#94a3b8'} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [v, String(n).replace('_', ' ')]} />
                <Legend formatter={v => String(v).replace('_', ' ')} iconType="circle" iconSize={10} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className={styles.chartCard} style={{ flex: 2 }}>
          <div className={styles.chartTitleRow}>
            <div className={styles.chartTitle}>Attendance Trend</div>
            <div className={styles.toggleContainer}>
              {(['weekly', 'monthly'] as const).map(v => (
                <button key={v} className={`${styles.toggleBtn} ${chartView === v ? styles.toggleActive : ''}`} onClick={() => setChartView(v)}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>
          {chartView === 'monthly' && (
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <select className={styles.monthSelect} value={histMonth} onChange={e => setHistMonth(Number(e.target.value))}>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
              <select className={styles.monthSelect} value={histYear} onChange={e => setHistYear(Number(e.target.value))}>
                {[now.getFullYear() - 1, now.getFullYear()].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          )}
          {trendData.length === 0 ? <div className={styles.empty}>No trend data</div> : (
            <ResponsiveContainer width="100%" height={220} minWidth={0} minHeight={220}>
              <BarChart data={trendData} barSize={10} barGap={3}>
                <defs>
                  {[['colorPresent', '#22c55e', '#15803d'], ['colorLate', '#f97316', '#c2410c'], ['colorAbsent', '#ef4444', '#b91c1c'], ['colorHalfDay', '#eab308', '#a16207']].map(([id, s, e]) => (
                    <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={s} stopOpacity={0.95} />
                      <stop offset="95%" stopColor={e} stopOpacity={0.75} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--surface-hover)', opacity: 0.4 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.78rem', fontWeight: 600, paddingTop: '10px' }} />
                <Bar dataKey="present" fill="url(#colorPresent)" radius={[4, 4, 0, 0]} name="Present" />
                <Bar dataKey="late" fill="url(#colorLate)" radius={[4, 4, 0, 0]} name="Late" />
                <Bar dataKey="absent" fill="url(#colorAbsent)" radius={[4, 4, 0, 0]} name="Absent" />
                <Bar dataKey="halfDay" fill="url(#colorHalfDay)" radius={[4, 4, 0, 0]} name="Half Day" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Role Performance Toggle */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={() => setShowRolePerformance(!showRolePerformance)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '1rem 1.25rem',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: 700,
            color: 'var(--text-primary)',
            fontSize: '1rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Activity size={18} style={{ color: 'var(--primary)' }} />
            Role Performance Overview
          </div>
          {showRolePerformance ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>

        {showRolePerformance && (
          <div className={styles.rolesGrid} style={{ marginTop: '1rem' }}>
            {roleStats.map(rs => {
              const rateColor = rs.rate >= 80 ? '#16a34a' : rs.rate >= 60 ? '#ea580c' : '#dc2626';
              const barColor = rs.rate >= 80 ? '#22c55e' : rs.rate >= 60 ? '#f97316' : '#ef4444';
              return (
                <div key={rs.role} className={styles.roleCard}>
                  <div className={styles.roleCardHeader}>
                    <span className={styles.roleLabel}>{roleLabel(rs.role)}</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: rateColor }}>{rs.rate}%</span>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontWeight: 600 }}>
                    Weighted Score (Present×1 · Late×0.75 · Half Day×0.5)
                  </div>
                  <div className={styles.roleStatsRow}>
                    {[
                      { val: rs.present, lbl: 'Present', color: '#16a34a' },
                      { val: rs.late, lbl: 'Late', color: '#f97316' },
                      { val: rs.halfDay, lbl: 'Half Day', color: '#b45309' },
                      { val: rs.absent, lbl: 'Absent', color: '#dc2626' },
                    ].map(({ val, lbl, color }) => (
                      <div key={lbl} className={styles.roleStat}>
                        <div style={{ color, fontWeight: 800, fontSize: '1.1rem' }}>{val}</div>
                        <div className={styles.roleStatLbl}>{lbl}</div>
                      </div>
                    ))}
                  </div>
                  <div className={styles.progressBarWrap}>
                    <div className={styles.progressBar} style={{ width: `${rs.rate}%`, background: barColor }} />
                  </div>
                  <div className={styles.roleTotal}>{rs.total} total employees</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {([
          { key: 'productivity', label: 'Productivity Scores' },
          { key: 'teams', label: 'Team Mapping' },
          { key: 'records', label: `All Records (${eligibleToday.length})` },
          { key: 'permissions', label: `Requests${pendingPermissions.length > 0 ? ` (${pendingPermissions.length})` : ''}` },
          { key: 'corrections', label: `Corrections${pendingCorrections > 0 ? ` (${pendingCorrections})` : ''}` },
          { key: 'overrideHistory', label: 'Override History' },
        ] as const).map(t => (
          <button key={t.key} className={`${styles.tab} ${activeTab === t.key ? styles.activeTab : ''}`} onClick={() => setActiveTab(t.key)}>
            {t.key === 'corrections' && <ClipboardEdit size={12} style={{ display: 'inline', marginRight: 4 }} />}
            {t.key === 'overrideHistory' && <History size={12} style={{ display: 'inline', marginRight: 4 }} />}
            {t.label}
          </button>
        ))}
      </div>



      {/* Productivity Scores */}
      {activeTab === 'productivity' && (
        <div className={styles.sectionCard}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div className={styles.sectionTitle} style={{ margin: 0 }}><Activity size={16} /> Employee Productivity Scores</div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <select className={styles.monthSelect} value={perfMonth} onChange={e => setPerfMonth(Number(e.target.value))}>
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
              <select className={styles.monthSelect} value={perfYear} onChange={e => setPerfYear(Number(e.target.value))}>
                {[now.getFullYear() - 1, now.getFullYear()].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {perfLoading ? (
            <div className={styles.empty}>Loading performance data…</div>
          ) : perfData.length === 0 ? (
            <div className={styles.empty}>No attendance data for this period</div>
          ) : (
            <>
              {/* Top 3 podium */}
              {perfData.length >= 3 && (
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  {[
                    { rank: 1, data: perfData[0], bg: 'linear-gradient(135deg, #fbbf24, #f59e0b)', medal: '🥇', size: '1.6rem' },
                    { rank: 2, data: perfData[1], bg: 'linear-gradient(135deg, #94a3b8, #64748b)', medal: '🥈', size: '1.3rem' },
                    { rank: 3, data: perfData[2], bg: 'linear-gradient(135deg, #cd7f32, #a0522d)', medal: '🥉', size: '1.3rem' },
                  ].map(({ rank, data, bg, medal, size }) => (
                    <div key={rank} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.25rem 1.5rem', textAlign: 'center', minWidth: 140 }}>
                      <div style={{ fontSize: '1.8rem', marginBottom: '0.25rem' }}>{medal}</div>
                      <div style={{ fontWeight: 800, fontSize: size, background: bg, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{data.score}%</div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '0.25rem' }}>{data.user.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{roleLabel(data.user.role)}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                        P:{data.present} L:{data.late} H:{data.halfDay} A:{data.absent}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Full table */}
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>#</th>
                      <th>Employee</th>
                      <th>Role</th>
                      <th style={{ textAlign: 'center' }}>Working Days</th>
                      <th style={{ textAlign: 'center' }}>Present</th>
                      <th style={{ textAlign: 'center' }}>Late</th>
                      <th style={{ textAlign: 'center' }}>Half Day</th>
                      <th style={{ textAlign: 'center' }}>Absent</th>
                      <th>Productivity Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perfData.map((stat, idx) => {
                      const scoreColor = stat.score >= 80 ? '#16a34a' : stat.score >= 60 ? '#ea580c' : '#dc2626';
                      const barColor = stat.score >= 80 ? '#22c55e' : stat.score >= 60 ? '#f97316' : '#ef4444';
                      return (
                        <tr key={stat.user.id}>
                          <td style={{ fontWeight: 700, color: idx < 3 ? ['#f59e0b', '#64748b', '#cd7f32'][idx] : 'var(--text-muted)', textAlign: 'center' }}>
                            {idx + 1}
                          </td>
                          <td>
                            <div style={{ fontWeight: 700 }}>{stat.user.name}</div>
                          </td>
                          <td><span className={styles.rolePill}>{roleLabel(stat.user.role)}</span></td>
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>{stat.working}</td>
                          <td style={{ textAlign: 'center', color: '#16a34a', fontWeight: 700 }}>{stat.present}</td>
                          <td style={{ textAlign: 'center', color: '#ea580c', fontWeight: 700 }}>{stat.late}</td>
                          <td style={{ textAlign: 'center', color: '#b45309', fontWeight: 700 }}>{stat.halfDay}</td>
                          <td style={{ textAlign: 'center', color: '#dc2626', fontWeight: 700 }}>{stat.absent}</td>
                          <td style={{ minWidth: 160 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--surface-hover)', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${stat.score}%`, background: barColor, borderRadius: 4, transition: 'width 0.4s ease' }} />
                              </div>
                              <span style={{ fontWeight: 800, fontSize: '0.9rem', color: scoreColor, minWidth: 38, textAlign: 'right' }}>{stat.score}%</span>
                            </div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                              P×1 + L×0.75 + H×0.5
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Team Mapping */}
      {activeTab === 'teams' && (
        <div className={styles.sectionCard}>
          <div className={styles.sectionTitle}><Users size={16} /> Team Attendance Mapping — Today</div>
          {teamMapping.length === 0
            ? <div className={styles.empty}>No team data available</div>
            : teamMapping.map(team => <TeamRow key={team.managerId} team={team} />)
          }
        </div>
      )}

      {/* All Records with LATE filter */}
      {activeTab === 'records' && (
        <div className={styles.sectionCard}>
          <div className={styles.filterBarSA}>
            <div className={styles.searchWrap}>
              <Search size={13} />
              <input className={styles.searchInput} placeholder="Search name or email…" value={search} onChange={e => setSearch(e.target.value)} />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    padding: 0,
                    display: 'flex'
                  }}
                  title="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <select className={styles.monthSelect} value={filterRole} onChange={e => setFilterRole(e.target.value)}>
              <option value="ALL">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="MANAGER">Team Leader</option>
              <option value="EMPLOYEE">Employee</option>
            </select>
            <select className={styles.monthSelect} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="ALL">All Status</option>
              {(['PRESENT', 'LATE', 'HALF_DAY', 'ABSENT', 'LEAVE', 'NOT_MARKED'] as AttendanceStatus[]).map(s =>
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              )}
            </select>
            <select className={styles.monthSelect} value={filterDept} onChange={e => setFilterDept(e.target.value)}>
              <option value="ALL">All Departments</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr><th>Employee</th><th>Role</th><th>Dept</th><th>Status</th><th>Check In</th><th>Check Out</th><th>Hours</th><th>Permission</th><th>Action</th></tr>
              </thead>
              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No records found</td></tr>
                ) : filteredRecords.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.user?.name ?? '—'}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{r.user?.email}</div>
                    </td>
                    <td><span className={styles.rolePill}>{roleLabel(r.user?.role)}</span></td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {departments.find(d => d.id === users.find(u => u.id === r.userId)?.departmentId)?.name || '—'}
                    </td>
                    <td><span className={statusBadgeClass(r.status)}>{r.status.replace('_', ' ')}</span></td>
                    <td>{formatTime(r.checkIn)}</td>
                    <td>{formatTime(r.checkOut)}</td>
                    <td>
                      {r.checkIn && !r.checkOut
                        ? <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{calculateLiveDiff(r.checkIn)} (Active)</span>
                        : formatDuration(r.totalHours)}
                    </td>
                    <td>{r.permission !== 'NONE' ? <span className={permBadgeClass(r.permission)}>{r.permission}</span> : <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>—</span>}</td>
                    <td style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <button className={styles.viewBtn} onClick={() => { setOverrideRecord(null); setViewEmpRecord(r); setEmpHistMonth(now.getMonth() + 1); setEmpHistYear(now.getFullYear()); }}>View</button>
                      <button className={styles.overrideBtn} onClick={() => openOverride(r)}>Override</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Permission Requests */}
      {activeTab === 'permissions' && (
        <div className={styles.sectionCard}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div className={styles.sectionTitle} style={{ margin: 0 }}><ShieldCheck size={16} /> Permission Requests</div>
            {pendingCount > 0 && <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#b45309', background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.3)', padding: '0.25rem 0.75rem', borderRadius: '20px' }}>{pendingCount} pending</span>}
          </div>
          {pendingPermissions.length === 0 ? <div className={styles.empty}>No permission requests</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {pendingPermissions.map(r => {
                const typeColor = r.permissionType === 'LEAVE' ? '#4f46e5' : r.permissionType === 'HALF_DAY' ? '#b45309' : '#ea580c';
                const typeBg = r.permissionType === 'LEAVE' ? 'rgba(99,102,241,0.1)' : r.permissionType === 'HALF_DAY' ? 'rgba(234,179,8,0.1)' : 'rgba(249,115,22,0.1)';
                return (
                  <div key={r.id} style={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', borderLeft: `4px solid ${r.permission === 'PENDING' ? '#f59e0b' : r.permission === 'APPROVED' ? '#16a34a' : '#ef4444'}` }}>
                    <div style={{ width: 38, height: 38, borderRadius: '9px', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: 900, flexShrink: 0 }}>
                      {(r.user?.name ?? '?').slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 150 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{r.user?.name ?? '—'}</span>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', background: 'var(--surface)', border: '1px solid var(--border)', padding: '1px 7px', borderRadius: '20px' }}>{roleLabel(r.user?.role)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{formatDate(r.date)}</span>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: typeColor, background: typeBg, padding: '2px 8px', borderRadius: '20px' }}>{r.permissionType?.replace(/_/g, ' ') ?? '—'}</span>
                        <span className={permBadgeClass(r.permission)}>{r.permission}</span>
                      </div>
                      {r.permissionReason && <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.4rem 0 0', lineHeight: 1.45, maxWidth: 380 }}>{r.permissionReason}</p>}
                    </div>
                    {r.permission === 'PENDING' && (
                      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                        <button className={styles.approveBtn} onClick={() => handleApproveSA(r.id)}><CheckCircle size={11} style={{ display: 'inline', marginRight: 3 }} />Approve</button>
                        <button className={styles.rejectBtn} onClick={() => handleRejectSA(r.id)}><XCircle size={11} style={{ display: 'inline', marginRight: 3 }} />Reject</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Correction Requests */}
      {activeTab === 'corrections' && (
        <CorrectionRequestsPanel
          corrections={corrections}
          pendingCount={pendingCorrections}
          onApprove={handleApproveCorrection}
          onReject={handleRejectCorrection}
        />
      )}

      {/* Override History / Audit Log */}
      {activeTab === 'overrideHistory' && (
        <div className={styles.sectionCard}>
          <div className={styles.sectionTitle}><History size={16} /> Override History (Audit Log)</div>
          {auditLogs.length === 0 ? <div className={styles.empty}>No override history yet</div> : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr><th>Employee</th><th>Changed By</th><th>Old Status</th><th>New Status</th><th>Old Check In</th><th>New Check In</th><th>Reason</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {auditLogs.map(log => (
                    <tr key={log.id}>
                      <td style={{ fontWeight: 600 }}>{log.attendance?.user?.name ?? '—'}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{log.changedBy?.name ?? '—'}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{roleLabel(log.changedBy?.role)}</div>
                      </td>
                      <td>{log.oldStatus ? <span className={statusBadgeClass(log.oldStatus)}>{log.oldStatus.replace('_', ' ')}</span> : '—'}</td>
                      <td>{log.newStatus ? <span className={statusBadgeClass(log.newStatus)}>{log.newStatus.replace('_', ' ')}</span> : '—'}</td>
                      <td style={{ fontSize: '0.8rem' }}>{formatTime(log.oldCheckIn)}</td>
                      <td style={{ fontSize: '0.8rem' }}>{formatTime(log.newCheckIn)}</td>
                      <td style={{ fontSize: '0.8rem', maxWidth: 180, whiteSpace: 'normal' }}>{log.reason ?? '—'}</td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{formatDateShort(log.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Employee Detail Modal */}
      {viewEmpRecord && (
        <div className={styles.modalOverlay} onClick={() => setViewEmpRecord(null)}>
          <div className={styles.modal} style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <div className={styles.modalTitle} style={{ marginBottom: '0.2rem' }}>{viewEmpRecord.user?.name ?? '—'}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{viewEmpRecord.user?.email}</div>
                <span className={styles.rolePill} style={{ marginTop: '0.4rem', display: 'inline-block' }}>{roleLabel(viewEmpRecord.user?.role)}</span>
              </div>
              <span className={statusBadgeClass(viewEmpRecord.status)} style={{ fontSize: '0.85rem' }}>Today: {viewEmpRecord.status.replace('_', ' ')}</span>
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              {[
                { label: 'Check In', val: formatTime(viewEmpRecord.checkIn) },
                { label: 'Check Out', val: formatTime(viewEmpRecord.checkOut) },
                { label: 'Total Hours', val: viewEmpRecord.checkIn && !viewEmpRecord.checkOut ? calculateLiveDiff(viewEmpRecord.checkIn) : formatDuration(viewEmpRecord.totalHours) },
              ].map(({ label, val }) => (
                <div key={label}>
                  <div className={styles.timeLabel}>{label}</div>
                  <div className={styles.timeValue}>{val}</div>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginBottom: '0.75rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.75rem' }}>Monthly History</div>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <select className={styles.monthSelect} value={empHistMonth} onChange={e => setEmpHistMonth(Number(e.target.value))}>
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
                <select className={styles.monthSelect} value={empHistYear} onChange={e => setEmpHistYear(Number(e.target.value))}>
                  {[now.getFullYear() - 1, now.getFullYear()].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              {empHistLoading ? <div className={styles.empty}>Loading…</div> : empHistory.length === 0 ? <div className={styles.empty}>No records for this month</div> : (
                <div className={styles.tableWrap} style={{ maxHeight: 280, overflowY: 'auto' }}>
                  <table className={styles.table}>
                    <thead><tr><th>Date</th><th>Status</th><th>Check In</th><th>Check Out</th><th>Hours</th></tr></thead>
                    <tbody>
                      {empHistory.map(r => (
                        <tr key={r.id}>
                          <td>{formatDate(r.date)}</td>
                          <td><span className={statusBadgeClass(r.status)}>{r.status.replace('_', ' ')}</span></td>
                          <td>{formatTime(r.checkIn)}</td>
                          <td>{formatTime(r.checkOut)}</td>
                          <td>{formatDuration(r.totalHours)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className={styles.modalBtns}>
              <button className={styles.cancelBtn} onClick={() => setViewEmpRecord(null)}>Close</button>
              <button className={styles.overrideBtn} style={{ padding: '0.65rem 1.25rem' }} onClick={() => openOverride(viewEmpRecord!)}>Override Attendance</button>
            </div>
          </div>
        </div>
      )}

      {/* Override Modal — reason required, audit trail note */}
      {overrideRecord && (
        <div className={styles.modalOverlay} onClick={() => setOverrideRecord(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalTitle}>Override Attendance — {overrideRecord.user?.name}</div>
            <div style={{ fontSize: '0.72rem', color: '#b45309', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 8, padding: '0.5rem 0.75rem', marginBottom: '1rem' }}>
              This action is logged in the audit trail. A reason is required.
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Status</label>
              <select className={styles.formSelect} value={overrideStatus} onChange={e => setOverrideStatus(e.target.value as AttendanceStatus)}>
                {(['PRESENT', 'LATE', 'ABSENT', 'HALF_DAY', 'LEAVE', 'SUNDAY', 'NOT_MARKED'] as AttendanceStatus[]).map(s =>
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                )}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Check In Time</label>
              <input type="datetime-local" className={styles.formInput} value={overrideCheckIn} onChange={e => setOverrideCheckIn(e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Check Out Time</label>
              <input type="datetime-local" className={styles.formInput} value={overrideCheckOut} onChange={e => setOverrideCheckOut(e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Reason *</label>
              <input type="text" className={styles.formInput} value={overrideRemarks} onChange={e => setOverrideRemarks(e.target.value)} placeholder="Required: reason for this override…" style={{ borderColor: !overrideRemarks.trim() ? '#f59e0b' : undefined }} />
            </div>
            <div className={styles.modalBtns}>
              <button className={styles.cancelBtn} onClick={() => setOverrideRecord(null)}>Cancel</button>
              <button className={styles.submitBtn} onClick={handleOverride} disabled={submitting || !overrideRemarks.trim()}>
                {submitting ? 'Saving…' : 'Save Override'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── CorrectionRequestsPanel ──────────────────────────────────────────────────

function CorrectionRequestsPanel({
  corrections,
  pendingCount,
  onApprove,
  onReject,
}: {
  corrections: CorrectionRequest[];
  pendingCount: number;
  onApprove: (id: string, note: string) => void;
  onReject: (id: string, note: string) => void;
}) {
  const [reviewNote, setReviewNote] = useState<Record<string, string>>({});

  return (
    <div className={styles.sectionCard}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div className={styles.sectionTitle} style={{ margin: 0 }}><ClipboardEdit size={16} /> Attendance Correction Requests</div>
        {pendingCount > 0 && <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#4338ca', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', padding: '0.25rem 0.75rem', borderRadius: '20px' }}>{pendingCount} pending</span>}
      </div>
      {corrections.length === 0 ? <div className={styles.empty}>No correction requests</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {corrections.map(c => (
            <div key={c.id} style={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem 1.25rem', borderLeft: `4px solid ${c.status === 'PENDING' ? '#6366f1' : c.status === 'APPROVED' ? '#16a34a' : '#ef4444'}` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ width: 38, height: 38, borderRadius: '9px', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: 900, flexShrink: 0 }}>
                  {(c.user?.name ?? '?').slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{c.user?.name ?? '—'}</span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', background: 'var(--surface)', border: '1px solid var(--border)', padding: '1px 7px', borderRadius: '20px' }}>{roleLabel(c.user?.role)}</span>
                    <span className={correctionBadgeClass(c.status)}>{c.status}</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
                    <strong>Date:</strong> {formatDateShort(c.date)} &nbsp;·&nbsp;
                    <strong>Requested:</strong> <span className={statusBadgeClass(c.requestedStatus)}>{c.requestedStatus.replace('_', ' ')}</span>
                  </div>
                  {(c.requestedCheckIn || c.requestedCheckOut) && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      {c.requestedCheckIn && <span>Check In: {formatTime(c.requestedCheckIn)} &nbsp;</span>}
                      {c.requestedCheckOut && <span>Check Out: {formatTime(c.requestedCheckOut)}</span>}
                    </div>
                  )}
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.4rem 0 0', lineHeight: 1.45 }}><strong>Reason:</strong> {c.reason}</p>
                  {c.reviewNote && <p style={{ fontSize: '0.75rem', color: '#4338ca', margin: '0.25rem 0 0' }}>Review Note: {c.reviewNote}</p>}
                  {c.reviewedBy && <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0' }}>Reviewed by {c.reviewedBy.name}</p>}
                </div>
              </div>
              {c.status === 'PENDING' && (
                <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    className={styles.formInput}
                    style={{ flex: 1, minWidth: 200, fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
                    placeholder="Review note (optional)…"
                    value={reviewNote[c.id] ?? ''}
                    onChange={e => setReviewNote(prev => ({ ...prev, [c.id]: e.target.value }))}
                  />
                  <button className={styles.approveBtn} onClick={() => onApprove(c.id, reviewNote[c.id] ?? '')}><CheckCircle size={11} style={{ display: 'inline', marginRight: 3 }} />Approve</button>
                  <button className={styles.rejectBtn} onClick={() => onReject(c.id, reviewNote[c.id] ?? '')}><XCircle size={11} style={{ display: 'inline', marginRight: 3 }} />Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Regular Attendance Page (Admin / Manager / Employee) ─────────────────────

function RegularAttendancePage() {
  const { currentUser, showToast, socket } = useApp();
  const role = currentUser?.role;
  const isManager = role === 'MANAGER';
  const isAdmin = role === 'ADMIN';

  const now = new Date();
  const [today, setToday] = useState<AttendanceRecord | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [todayPlanText, setTodayPlanText] = useState('');
  const [dayCompletion, setDayCompletion] = useState('');
  const [showCheckOutForm, setShowCheckOutForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [histMonth, setHistMonth] = useState(now.getMonth() + 1);
  const [histYear, setHistYear] = useState(now.getFullYear());
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [teamAttendance, setTeamAttendance] = useState<AttendanceRecord[]>([]);
  const [pendingPermissions, setPendingPermissions] = useState<AttendanceRecord[]>([]);
  const [corrections, setCorrections] = useState<CorrectionRequest[]>([]);
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'team' | 'permissions' | 'corrections' | 'all'>('team');
  const searchParams = useSearchParams();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'permissions') setActiveTab('permissions');
    else if (t === 'corrections') setActiveTab('corrections');
  }, [searchParams]);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const [showPermModal, setShowPermModal] = useState(false);
  const [permType, setPermType] = useState<PermissionType>('LATE_PERMISSION');
  const [permReason, setPermReason] = useState('');
  const [permDate, setPermDate] = useState<Date | null>(new Date());

  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [corrDate, setCorrDate] = useState<Date | null>(null);
  const [corrStatus, setCorrStatus] = useState<AttendanceStatus>('PRESENT');
  const [corrCheckIn, setCorrCheckIn] = useState('');
  const [corrCheckOut, setCorrCheckOut] = useState('');
  const [corrReason, setCorrReason] = useState('');

  const [overrideRecord, setOverrideRecord] = useState<AttendanceRecord | null>(null);
  const [overrideStatus, setOverrideStatus] = useState<AttendanceStatus>('PRESENT');
  const [overrideCheckIn, setOverrideCheckIn] = useState('');
  const [overrideCheckOut, setOverrideCheckOut] = useState('');
  const [overrideRemarks, setOverrideRemarks] = useState('');
  const [officeStartTime, setOfficeStartTime] = useState('10:00');
  const [officeEndTime, setOfficeEndTime] = useState('19:00');
  const loadDataFired = useRef(false);
  const checkoutFormRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showCheckOutForm) {
      setTimeout(() => {
        checkoutFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 80);
    }
  }, [showCheckOutForm]);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await api.get('/configs');
      if (res.data?.success) {
        const start = res.data.data.find((c: any) => c.key === 'officeStartTime')?.value;
        const end = res.data.data.find((c: any) => c.key === 'officeEndTime')?.value;
        if (start) setOfficeStartTime(start);
        if (end) setOfficeEndTime(end);
      }
    } catch { /* silent */ }
  }, []);

  const loadToday = useCallback(async () => {
    try {
      const res = await api.get('/attendance/today');
      if (res.data?.success) {
        const rec = res.data.data;
        setToday(rec);
        setTodayPlanText(rec.todayPlan ?? rec.morningPlan ?? '');
      }
    } catch { /* silent */ }
  }, []);

  const loadStats = useCallback(async () => { try { const r = await api.get('/attendance/stats'); if (r.data?.success) setStats(r.data.data); } catch { /* silent */ } }, []);
  const loadHistory = useCallback(async () => { try { const r = await api.get(`/attendance/my?month=${histMonth}&year=${histYear}`); if (r.data?.success) setHistory(r.data.data); } catch { /* silent */ } }, [histMonth, histYear]);
  const loadTeam = useCallback(async () => { try { const r = await api.get('/attendance/team'); if (r.data?.success) setTeamAttendance(r.data.data); } catch { /* silent */ } }, []);
  const loadPending = useCallback(async () => { try { const r = await api.get('/attendance/permission/team'); if (r.data?.success) setPendingPermissions(r.data.data); } catch { /* silent */ } }, []);
  const loadAll = useCallback(async () => { try { const r = await api.get('/attendance/all'); if (r.data?.success) setAllAttendance(r.data.data); } catch { /* silent */ } }, []);
  const loadCorrections = useCallback(async () => { try { const r = await api.get('/attendance/correction/requests'); if (r.data?.success) setCorrections(r.data.data); } catch { /* silent */ } }, []);

  const refreshPageData = useCallback(async () => {
    await Promise.all([loadToday(), loadStats(), loadCorrections()]);
    if (isManager || isAdmin) await Promise.all([loadTeam(), loadPending()]);
    if (isAdmin) await loadAll();
  }, [loadToday, loadStats, loadCorrections, isManager, isAdmin, loadTeam, loadPending, loadAll]);

  useEffect(() => {
    if (loadDataFired.current) return;
    loadDataFired.current = true;
    (async () => {
      setLoading(true);
      await refreshPageData();
      await fetchConfig();
      setLoading(false);
    })();
  }, [refreshPageData, fetchConfig]);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      console.log('⏰ Socket: Attendance updated, reloading user page data...');
      refreshPageData();
    };
    socket.on('attendance:updated', handleUpdate);
    return () => {
      socket.off('attendance:updated', handleUpdate);
    };
  }, [socket, refreshPageData]);

  useEffect(() => {
    const controller = new AbortController();
    api.get(`/attendance/my?month=${histMonth}&year=${histYear}`, { signal: controller.signal })
      .then(r => { if (r.data?.success) setHistory(r.data.data); })
      .catch(err => { if (err.code !== 'ERR_CANCELED') console.error(err); });
    return () => controller.abort();
  }, [histMonth, histYear]);

  const handleCheckIn = async () => {
    setSubmitting(true);
    try {
      await api.post('/attendance/check-in');
      await loadToday(); await loadStats();
      if (isManager || isAdmin) await loadTeam();
    } catch (e: any) { showToast('Check-in Failed', e.response?.data?.message ?? 'Check-in failed', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleSaveTodayPlan = async () => {
    if (!todayPlanText.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/attendance/morning-plan', { morningPlan: todayPlanText });
      showToast('Plan Saved', 'Today plan saved successfully', 'success');
      await loadToday();
    }
    catch (e: any) { showToast('Save Failed', e.response?.data?.message ?? 'Failed to save plan', 'error'); }
    finally { setSubmitting(false); }
  };

  const performActualCheckout = async () => {
    setSubmitting(true);
    try {
      await api.post('/attendance/check-out', { dayCompletion });
      setShowCheckOutForm(false); setDayCompletion('');
      await loadToday(); await loadStats(); await loadHistory();
      if (isManager || isAdmin) await loadTeam();
      showToast('Checked Out', 'Successfully checked out for the day.', 'success');
    } catch (e: any) {
      showToast('Check-out Failed', e.response?.data?.message ?? 'Check-out failed', 'error');
    } finally { setSubmitting(false); }
  };

  const handleCheckOut = async () => {
    if (!today?.checkIn) return;
    const diff = (Date.now() - new Date(today.checkIn).getTime()) / 3600000;
    if (diff < 4 && today.permission !== 'APPROVED' && today.permission !== 'PENDING') {
      showToast('Half Day Required', 'You have worked less than 4 hours. A Half Day permission will be submitted automatically. Continue?', 'confirm', async () => {
        setSubmitting(true);
        try {
          const d = new Date();
          const dateStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
          await api.post('/attendance/permission/apply', { permissionType: 'HALF_DAY', reason: 'Automated request for early checkout less than 4 hours worked', date: dateStr });
          performActualCheckout();
        } catch {
          showToast('Request Failed', 'Could not apply for Half Day. Please try manually.', 'error');
          setSubmitting(false);
        }
      });
      return;
    } else if (diff < 4 && today.permission === 'PENDING') {
      showToast('Checkout Blocked', 'Your Half Day permission is still pending approval.', 'error');
      return;
    }
    performActualCheckout();
  };

  const handleApplyPermission = async () => {
    if (!permReason.trim()) { showToast('Missing Reason', 'Please provide a reason', 'error'); return; }
    if (!/^[a-zA-Z0-9\s]+$/.test(permReason)) { showToast('Invalid Reason', 'Letters, numbers and spaces only', 'error'); return; }
    if (!permDate) { showToast('Missing Date', 'Please select a date', 'error'); return; }
    setSubmitting(true);
    try {
      await api.post('/attendance/permission/apply', { permissionType: permType, reason: permReason, date: permDate.toISOString().split('T')[0] });
      setShowPermModal(false); setPermReason(''); setPermDate(new Date());
      await loadToday();
      showToast('Request Submitted', 'Your leave request has been sent for approval.', 'success');
    } catch (e: any) { showToast('Request Failed', e.response?.data?.message ?? 'Failed', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleSubmitCorrection = async () => {
    if (!corrReason.trim()) { showToast('Missing Reason', 'Please provide a reason', 'error'); return; }
    if (!corrDate) { showToast('Missing Date', 'Please select a date', 'error'); return; }
    setSubmitting(true);
    try {
      await api.post('/attendance/correction/request', {
        date: corrDate.toISOString().split('T')[0],
        requestedStatus: corrStatus,
        requestedCheckIn: corrCheckIn || null,
        requestedCheckOut: corrCheckOut || null,
        reason: corrReason,
      });
      setShowCorrectionModal(false); setCorrReason(''); setCorrCheckIn(''); setCorrCheckOut(''); setCorrDate(null);
      await loadCorrections();
      showToast('Request Submitted', 'Your correction request has been sent for review.', 'success');
    } catch (e: any) { showToast('Request Failed', e.response?.data?.message ?? 'Failed', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleApprove = async (id: string) => {
    try { await api.patch(`/attendance/permission/${id}/approve`); await Promise.all([loadPending(), loadTeam(), loadStats()]); }
    catch (e: any) { showToast('Error', e.response?.data?.message ?? 'Failed', 'error'); }
  };
  const handleReject = async (id: string) => {
    try { await api.patch(`/attendance/permission/${id}/reject`); await Promise.all([loadPending(), loadTeam(), loadStats()]); }
    catch (e: any) { showToast('Error', e.response?.data?.message ?? 'Failed', 'error'); }
  };

  const openOverride = (rec: AttendanceRecord) => {
    setOverrideRecord(rec);
    setOverrideStatus(rec.status);
    setOverrideCheckIn(rec.checkIn ? new Date(rec.checkIn).toISOString().slice(0, 16) : '');
    setOverrideCheckOut(rec.checkOut ? new Date(rec.checkOut).toISOString().slice(0, 16) : '');
    setOverrideRemarks('');
  };
  const handleOverride = async () => {
    if (!overrideRecord) return;
    if (!overrideRemarks.trim()) { showToast('Required', 'Reason is required for overrides', 'error'); return; }
    setSubmitting(true);
    try {
      await api.patch(`/attendance/${overrideRecord.id}`, { status: overrideStatus, checkIn: overrideCheckIn || null, checkOut: overrideCheckOut || null, remarks: overrideRemarks });
      setOverrideRecord(null);
      await Promise.all([loadAll(), loadTeam(), loadStats()]);
    } catch (e: any) { showToast('Override Failed', e.response?.data?.message ?? 'Override failed', 'error'); }
    finally { setSubmitting(false); }
  };

  const pendingCorrCount = corrections.filter(c => c.status === 'PENDING').length;

  // Monthly productivity score computed from history (no extra API call needed)
  const myMonthlyScore = (() => {
    const working = history.filter(r => r.status !== 'SUNDAY' && r.status !== 'NOT_MARKED');
    if (working.length === 0) return null;
    const present = working.filter(r => r.status === 'PRESENT' && r.checkInStatus === 'ON_TIME').length;
    const late = working.filter(r => r.status === 'LATE' || r.checkInStatus === 'LATE' || r.checkInStatus === 'VERY_LATE').length;
    const halfDay = working.filter(r => r.status === 'HALF_DAY').length;
    const absent = working.filter(r => r.status === 'ABSENT').length;
    const weighted = present * 1 + late * 0.75 + halfDay * 0.5;
    const score = Math.round((weighted / working.length) * 100);
    return { score, present, late, halfDay, absent, working: working.length };
  })();

  const canCheckIn = today && !today.checkIn && today.status !== 'SUNDAY';
  const canCheckOut = today && today.checkIn && !today.checkOut;
  const canSaveTodayPlan = today && today.checkIn && !today.checkOut && todayPlanText !== (today.todayPlan ?? today.morningPlan ?? '');

  if (loading) return <div className={styles.empty}>Loading attendance data…</div>;

  return (
    <>
      {/* Stats */}
      {stats && (
        <div className={styles.statsRow}>
          {[
            { val: stats.present, lbl: 'Present', color: '#16a34a' },
            { val: stats.absent, lbl: 'Absent', color: '#dc2626' },
            { val: stats.late, lbl: 'Late', color: '#ea580c' },
            { val: stats.halfDay, lbl: 'Half Day', color: '#b45309' },
            { val: stats.pendingPermissions, lbl: 'Pending Perms', color: '#b45309' },
          ].map(({ val, lbl, color }) => (
            <div key={lbl} className={styles.statBox}>
              <div className={styles.statNum} style={{ color }}>{val}</div>
              <div className={styles.statLbl}>{lbl}</div>
            </div>
          ))}
          {myMonthlyScore !== null && (
            <div className={styles.statBox} style={{ borderLeft: '3px solid var(--primary)', minWidth: 120 }}>
              <div className={styles.statNum} style={{ color: myMonthlyScore.score >= 80 ? '#16a34a' : myMonthlyScore.score >= 60 ? '#ea580c' : '#dc2626' }}>
                {myMonthlyScore.score}%
              </div>
              <div className={styles.statLbl}>My Score (this month)</div>
            </div>
          )}
        </div>
      )}

      {/* Today Card */}
      <div className={styles.todayCard}>
        <div className={styles.todayHeader}>
          <span className={styles.todayTitle}><Clock size={14} style={{ display: 'inline', marginRight: 4 }} />Today&apos;s Attendance</span>
          <span className={styles.todayDate}>{formatDate(today?.date ?? new Date().toISOString())}</span>
          {today && <span className={statusBadgeClass(today.status)}>{today.status.replace('_', ' ')}</span>}
        </div>
        <div className={styles.timeRow}>
          <div className={styles.timeItem}>
            <span className={styles.timeLabel}>Check In</span>
            <span className={styles.timeValue}>
              {formatTime(today?.checkIn ?? null)}
              {(today?.checkInStatus === 'LATE' || today?.checkInStatus === 'VERY_LATE') && (
                <div style={{ color: '#dc2626', fontSize: '0.65rem', fontWeight: 600, marginTop: 2 }}>
                  ({today?.checkInStatus === 'VERY_LATE' ? 'Very Late' : 'Late'} after {formatConfigTime(officeStartTime)})
                </div>
              )}
            </span>
          </div>
          <div className={styles.timeItem}>
            <span className={styles.timeLabel}>Check Out</span>
            <span className={styles.timeValue}>{formatTime(today?.checkOut ?? null)}</span>
          </div>
          <div className={styles.timeItem}>
            <span className={styles.timeLabel}>Total Hours</span>
            <span className={styles.timeValue}>
              {today?.checkIn && !today?.checkOut
                ? <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{calculateLiveDiff(today.checkIn)} (Active)</span>
                : formatDuration(today?.totalHours ?? null)}
            </span>
          </div>
          <div className={styles.timeItem}>
            <span className={styles.timeLabel}>Working Hours</span>
            <span className={styles.timeValue} style={{ color: 'var(--primary)' }}>
              {formatConfigTime(officeStartTime)} - {formatConfigTime(officeEndTime)}
            </span>
          </div>
          {today?.permission && today.permission !== 'NONE' && (
            <div className={styles.timeItem}>
              <span className={styles.timeLabel}>Permission</span>
              <span className={permBadgeClass(today.permission)}>{today.permission}</span>
            </div>
          )}
        </div>
        <div className={styles.actionRow}>
          {canCheckIn && (() => {
            const [h, m] = officeStartTime.split(':').map(Number);
            const cutoff = new Date(); cutoff.setHours(h, m, 0, 0);
            if (new Date() > cutoff) {
              return <div style={{ width: '100%', color: '#ea580c', background: 'rgba(234,88,12,0.05)', padding: '0.6rem 0.8rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid rgba(234,88,12,0.1)' }}>
                <Clock size={14} /> Checking in now will be marked as LATE (Threshold: {formatConfigTime(officeStartTime)})
              </div>;
            }
            return null;
          })()}
          <button className={styles.checkInBtn} onClick={handleCheckIn} disabled={!canCheckIn || submitting}>
            <LogIn size={16} />{today?.checkIn ? 'Checked In' : 'Check In'}
          </button>
          <button className={styles.checkOutBtn} onClick={() => setShowCheckOutForm(true)} disabled={!canCheckOut || submitting}>
            <LogOut size={16} />{today?.checkOut ? 'Checked Out' : 'Check Out'}
          </button>
          <button className={styles.permissionBtn} onClick={() => setShowPermModal(true)}>
            <FileText size={16} />Apply Permission
          </button>
          <button className={styles.permissionBtn} style={{ background: 'rgba(99,102,241,0.1)', color: '#4338ca', border: '1px solid rgba(99,102,241,0.3)' }} onClick={() => setShowCorrectionModal(true)}>
            <ClipboardEdit size={16} />Request Correction
          </button>
        </div>
      </div>

      {/* Today Plan Card */}
      {today?.checkIn && !today?.checkOut && (
        <div className={styles.planCard}>
          <div className={styles.planTitle}>
            <FileText size={15} /> Today Plan — what will you do today?
          </div>
          <textarea
            className={styles.textarea}
            value={todayPlanText}
            onChange={e => setTodayPlanText(e.target.value)}
            placeholder="Describe your plan for today..."
          />
          <div style={{ marginTop: '0.75rem' }}>
            <button
              className={pageStyles.primaryBtn}
              onClick={handleSaveTodayPlan}
              disabled={!canSaveTodayPlan || submitting}
              style={{ fontSize: '0.875rem', padding: '0.6rem 1.25rem' }}
            >
              {(today.todayPlan || today.morningPlan) ? 'Update Plan' : 'Save Plan'}
            </button>
          </div>
        </div>
      )}

      {today?.checkIn && today?.checkOut && (today.todayPlan || today.morningPlan) && (
        <div className={styles.planCard}>
          {(today.todayPlan || today.morningPlan) && (<><div className={styles.planTitle}><FileText size={15} /> Today Plan</div><textarea className={styles.textarea} value={today.todayPlan || today.morningPlan || ''} readOnly /></>)}
          {today.dayCompletion && (<><div className={styles.planTitle} style={{ marginTop: '1rem' }}><CheckCircle size={15} /> Day Completion</div><textarea className={styles.textarea} value={today.dayCompletion} readOnly /></>)}
        </div>
      )}

      {showCheckOutForm && (
        <div ref={checkoutFormRef} className={styles.planCard}>
          <div className={styles.planTitle}><LogOut size={15} /> Check Out — What did you complete today?</div>
          <textarea className={styles.textarea} value={dayCompletion} onChange={e => setDayCompletion(e.target.value)} placeholder="Summarise what you completed today…" />
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
            <button className={styles.checkOutBtn} onClick={handleCheckOut} disabled={submitting}>Confirm Check Out</button>
            <button className={styles.permissionBtn} onClick={() => setShowCheckOutForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Monthly History */}
      <div className={styles.sectionCard}>
        <div className={styles.sectionTitle}><Clock size={16} /> My Monthly History</div>
        <div className={styles.historyControls}>
          <select className={styles.monthSelect} value={histMonth} onChange={e => setHistMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select className={styles.monthSelect} value={histYear} onChange={e => setHistYear(Number(e.target.value))}>
            {[now.getFullYear() - 1, now.getFullYear()].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        {history.length === 0 ? <div className={styles.empty}>No records for this month</div> : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Date</th><th>Status</th><th>Check In</th><th>Check Out</th><th>Hours</th><th>Permission</th></tr></thead>
              <tbody>
                {history.map(r => (
                  <tr key={r.id}>
                    <td>{formatDate(r.date)}</td>
                    <td><span className={statusBadgeClass(r.status)}>{r.status.replace('_', ' ')}</span></td>
                    <td>{formatTime(r.checkIn)}</td>
                    <td>{formatTime(r.checkOut)}</td>
                    <td>{formatDuration(r.totalHours)}</td>
                    <td>{r.permission !== 'NONE' ? <span className={permBadgeClass(r.permission)}>{r.permission}</span> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* My Correction Requests */}
      {corrections.length > 0 && !isManager && !isAdmin && (
        <div className={styles.sectionCard}>
          <div className={styles.sectionTitle}><ClipboardEdit size={16} /> My Correction Requests</div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Date</th><th>Requested Status</th><th>Reason</th><th>Status</th><th>Review Note</th></tr></thead>
              <tbody>
                {corrections.map(c => (
                  <tr key={c.id}>
                    <td>{formatDateShort(c.date)}</td>
                    <td><span className={statusBadgeClass(c.requestedStatus)}>{c.requestedStatus.replace('_', ' ')}</span></td>
                    <td style={{ fontSize: '0.8rem', maxWidth: 200, whiteSpace: 'normal' }}>{c.reason}</td>
                    <td><span className={correctionBadgeClass(c.status)}>{c.status}</span></td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{c.reviewNote ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manager / Admin Tabs */}
      {(isManager || isAdmin) && (
        <>
          <div className={styles.tabs}>
            <button className={`${styles.tab} ${activeTab === 'team' ? styles.activeTab : ''}`} onClick={() => setActiveTab('team')}>
              <Users size={13} style={{ display: 'inline', marginRight: 4 }} />Team Today
            </button>
            <button className={`${styles.tab} ${activeTab === 'permissions' ? styles.activeTab : ''}`} onClick={() => setActiveTab('permissions')}>
              Requests{pendingPermissions.filter(p => p.permission === 'PENDING').length > 0 ? ` (${pendingPermissions.filter(p => p.permission === 'PENDING').length})` : ''}
            </button>
            <button className={`${styles.tab} ${activeTab === 'corrections' ? styles.activeTab : ''}`} onClick={() => { setActiveTab('corrections'); loadCorrections(); }}>
              <ClipboardEdit size={12} style={{ display: 'inline', marginRight: 4 }} />Corrections{pendingCorrCount > 0 ? ` (${pendingCorrCount})` : ''}
            </button>
            {isAdmin && (
              <button className={`${styles.tab} ${activeTab === 'all' ? styles.activeTab : ''}`} onClick={() => { setActiveTab('all'); loadAll(); }}>Historical</button>
            )}
          </div>

          {activeTab === 'team' && (
            <div className={styles.sectionCard}>
              <div className={styles.sectionTitle}><Users size={16} /> Team Attendance — Today</div>
              {teamAttendance.length === 0 ? <div className={styles.empty}>No team attendance records</div> : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead><tr><th>Employee</th><th>Status</th><th>Check In</th><th>Check Out</th><th>Hours</th><th>Permission</th></tr></thead>
                    <tbody>
                      {teamAttendance.map(r => (
                        <tr key={r.id}>
                          <td><div style={{ fontWeight: 600 }}>{r.user?.name ?? '—'}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{roleLabel(r.user?.role)}</div></td>
                          <td><span className={statusBadgeClass(r.status)}>{r.status.replace('_', ' ')}</span></td>
                          <td>{formatTime(r.checkIn)}</td>
                          <td>{formatTime(r.checkOut)}</td>
                          <td>{r.checkIn && !r.checkOut ? <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{calculateLiveDiff(r.checkIn)} (Active)</span> : formatDuration(r.totalHours)}</td>
                          <td>{r.permission !== 'NONE' ? <span className={permBadgeClass(r.permission)}>{r.permission}</span> : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'permissions' && (
            <div className={styles.sectionCard}>
              <div className={styles.sectionTitle}><ShieldCheck size={16} /> Permission Requests</div>
              {pendingPermissions.length === 0 ? <div className={styles.empty}>No pending requests</div> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {pendingPermissions.map(r => (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 12, padding: '0.85rem 1.1rem', flexWrap: 'wrap', borderLeft: `4px solid ${r.permission === 'PENDING' ? '#f59e0b' : r.permission === 'APPROVED' ? '#16a34a' : '#ef4444'}` }}>
                      <div style={{ flex: 1, minWidth: 150 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{r.user?.name ?? '—'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>{formatDate(r.date)} · {r.permissionType?.replace(/_/g, ' ')}</div>
                        {r.permissionReason && <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>{r.permissionReason}</div>}
                      </div>
                      <span className={permBadgeClass(r.permission)}>{r.permission}</span>
                      {r.permission === 'PENDING' && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className={styles.approveBtn} onClick={() => handleApprove(r.id)}><CheckCircle size={11} style={{ display: 'inline', marginRight: 3 }} />Approve</button>
                          <button className={styles.rejectBtn} onClick={() => handleReject(r.id)}><XCircle size={11} style={{ display: 'inline', marginRight: 3 }} />Reject</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'corrections' && (
            <CorrectionRequestsPanel
              corrections={corrections}
              pendingCount={pendingCorrCount}
              onApprove={async (id, note) => { try { await api.patch(`/attendance/correction/${id}/review`, { approved: true, note }); await loadCorrections(); showToast('Approved', 'Correction approved.', 'success'); } catch (e: any) { showToast('Error', e.response?.data?.message ?? 'Failed', 'error'); } }}
              onReject={async (id, note) => { try { await api.patch(`/attendance/correction/${id}/review`, { approved: false, note }); await loadCorrections(); showToast('Rejected', 'Correction rejected.', 'error'); } catch (e: any) { showToast('Error', e.response?.data?.message ?? 'Failed', 'error'); } }}
            />
          )}

          {isAdmin && activeTab === 'all' && (
            <div className={styles.sectionCard}>
              <div className={styles.sectionTitle}>All Attendance — Today</div>
              {allAttendance.length === 0 ? <div className={styles.empty}>No records</div> : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead><tr><th>Employee</th><th>Status</th><th>Check In</th><th>Check Out</th><th>Hours</th><th>Permission</th><th>Action</th></tr></thead>
                    <tbody>
                      {allAttendance.map(r => (
                        <tr key={r.id}>
                          <td><div style={{ fontWeight: 600 }}>{r.user?.name ?? '—'}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{roleLabel(r.user?.role)}</div></td>
                          <td><span className={statusBadgeClass(r.status)}>{r.status.replace('_', ' ')}</span></td>
                          <td>{formatTime(r.checkIn)}</td>
                          <td>{formatTime(r.checkOut)}</td>
                          <td>{r.checkIn && !r.checkOut ? <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{calculateLiveDiff(r.checkIn)} (Active)</span> : formatDuration(r.totalHours)}</td>
                          <td>{r.permission !== 'NONE' ? <span className={permBadgeClass(r.permission)}>{r.permission}</span> : '—'}</td>
                          <td><button className={styles.overrideBtn} onClick={() => openOverride(r)}>Override</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Permission Modal */}
      {showPermModal && (
        <div className={styles.modalOverlay} onClick={() => setShowPermModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalTitle}>Apply for Permission</div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Permission Type</label>
              <select className={styles.formSelect} value={permType} onChange={e => setPermType(e.target.value as PermissionType)}>
                {PERMISSION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <CustomDatePicker label="Date" selected={permDate} onChange={setPermDate} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Reason *</label>
              <textarea className={styles.formTextarea} value={permReason} onChange={e => setPermReason(e.target.value)} placeholder="Explain the reason…" />
            </div>
            <div className={styles.modalBtns}>
              <button className={styles.cancelBtn} onClick={() => setShowPermModal(false)}>Cancel</button>
              <button className={styles.submitBtn} onClick={handleApplyPermission} disabled={submitting}>{submitting ? 'Submitting…' : 'Submit Request'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Correction Modal */}
      {showCorrectionModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCorrectionModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalTitle}>Request Attendance Correction</div>
            <div style={{ fontSize: '0.72rem', color: '#4338ca', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, padding: '0.5rem 0.75rem', marginBottom: '1rem' }}>
              Corrections are reviewed by your Team Leader or Admin before being applied.
            </div>
            <div className={styles.formGroup}>
              <CustomDatePicker label="Date to Correct" selected={corrDate} onChange={setCorrDate} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Correct Status</label>
              <select className={styles.formSelect} value={corrStatus} onChange={e => setCorrStatus(e.target.value as AttendanceStatus)}>
                {(['PRESENT', 'LATE', 'HALF_DAY', 'LEAVE', 'ABSENT'] as AttendanceStatus[]).map(s =>
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                )}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Correct Check In (optional)</label>
              <input type="datetime-local" className={styles.formInput} value={corrCheckIn} onChange={e => setCorrCheckIn(e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Correct Check Out (optional)</label>
              <input type="datetime-local" className={styles.formInput} value={corrCheckOut} onChange={e => setCorrCheckOut(e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Reason *</label>
              <textarea className={styles.formTextarea} value={corrReason} onChange={e => setCorrReason(e.target.value)} placeholder="e.g. Forgot to check out, system error…" />
            </div>
            <div className={styles.modalBtns}>
              <button className={styles.cancelBtn} onClick={() => setShowCorrectionModal(false)}>Cancel</button>
              <button className={styles.submitBtn} onClick={handleSubmitCorrection} disabled={submitting}>{submitting ? 'Submitting…' : 'Submit Correction'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Override Modal */}
      {overrideRecord && (
        <div className={styles.modalOverlay} onClick={() => setOverrideRecord(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalTitle}>Override Attendance — {overrideRecord.user?.name}</div>
            <div style={{ fontSize: '0.72rem', color: '#b45309', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 8, padding: '0.5rem 0.75rem', marginBottom: '1rem' }}>
              This action is logged in the audit trail. Reason is required.
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Status</label>
              <select className={styles.formSelect} value={overrideStatus} onChange={e => setOverrideStatus(e.target.value as AttendanceStatus)}>
                {(['PRESENT', 'LATE', 'ABSENT', 'HALF_DAY', 'LEAVE', 'SUNDAY', 'NOT_MARKED'] as AttendanceStatus[]).map(s =>
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                )}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Check In Time</label>
              <input type="datetime-local" className={styles.formInput} value={overrideCheckIn} onChange={e => setOverrideCheckIn(e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Check Out Time</label>
              <input type="datetime-local" className={styles.formInput} value={overrideCheckOut} onChange={e => setOverrideCheckOut(e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Reason *</label>
              <input type="text" className={styles.formInput} value={overrideRemarks} onChange={e => setOverrideRemarks(e.target.value)} placeholder="Required: reason for this override…" style={{ borderColor: !overrideRemarks.trim() ? '#f59e0b' : undefined }} />
            </div>
            <div className={styles.modalBtns}>
              <button className={styles.cancelBtn} onClick={() => setOverrideRecord(null)}>Cancel</button>
              <button className={styles.submitBtn} onClick={handleOverride} disabled={submitting || !overrideRemarks.trim()}>
                {submitting ? 'Saving…' : 'Save Override'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const { currentUser } = useApp();
  const isAdmin = currentUser?.role === 'ADMIN';
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const [viewMode, setViewMode] = useState<'monitor' | 'personal'>(
    isSuperAdmin ? 'monitor' : 'personal'
  );
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  const isMonitor = isSuperAdmin || (isAdmin && viewMode === 'monitor');

  // Dynamic header and title elements
  const headerTitle = isMonitor ? "Attendance Monitor" : "Attendance";
  const headerSubtitle = isMonitor ? "Organization-wide attendance command center" : "Track daily attendance, plans, and permissions";
  
  const pageTitle = isMonitor ? "Attendance Command Center" : "Attendance Management";
  const pageDesc = isMonitor 
    ? "Real-time monitoring — all teams, all roles, daily · weekly · monthly" 
    : "Check in, fill your daily plan, manage permissions, and request corrections";

  return (
    <div className={pageStyles.wrapper}>
      <Sidebar />
      <main className={pageStyles.main}>
        {showDownloadModal && <DownloadReportModal onClose={() => setShowDownloadModal(false)} />}

        <Header title={headerTitle} subtitle={headerSubtitle} />

        <div className={pageStyles.pageTitleRow}>
          <div>
            <h2>{pageTitle}</h2>
            <p>{pageDesc}</p>
          </div>

          {isAdmin && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '4px', background: 'var(--surface-hover)', padding: '4px', borderRadius: '10px', width: 'fit-content', border: '1px solid var(--border)' }}>
                <button
                  onClick={() => setViewMode('personal')}
                  style={{
                    padding: '0.45rem 1.1rem',
                    borderRadius: '7px',
                    border: 'none',
                    background: viewMode === 'personal' ? 'var(--background)' : 'transparent',
                    color: viewMode === 'personal' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '0.825rem',
                    cursor: 'pointer',
                    boxShadow: viewMode === 'personal' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <User size={13} /> My Attendance
                </button>
                <button
                  onClick={() => setViewMode('monitor')}
                  style={{
                    padding: '0.45rem 1.1rem',
                    borderRadius: '7px',
                    border: 'none',
                    background: viewMode === 'monitor' ? 'var(--background)' : 'transparent',
                    color: viewMode === 'monitor' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '0.825rem',
                    cursor: 'pointer',
                    boxShadow: viewMode === 'monitor' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <Activity size={13} /> Command Center
                </button>
              </div>

              {viewMode === 'personal' && (
                <button
                  onClick={() => setShowDownloadModal(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.55rem 1.1rem',
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: '0.825rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px -2px rgba(99,102,241,0.4)',
                    transition: 'opacity 0.2s',
                  }}
                >
                  <Download size={13} /> Download Report
                </button>
              )}
            </div>
          )}
        </div>

        {isMonitor ? <SuperAdminMonitor /> : <RegularAttendancePage />}
      </main>
    </div>
  );
}
