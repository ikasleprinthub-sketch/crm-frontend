'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
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
  XCircle, TrendingUp, Search, RefreshCw, UserCheck, UserX, Calendar,
  ChevronDown, ChevronRight,
} from 'lucide-react';

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
  morningPlan: string | null;
  dayCompletion: string | null;
  permission: PermissionStatus;
  permissionType: PermissionType | null;
  permissionReason: string | null;
  user?: { id: string; name: string; email: string; role: string };
}

interface DashboardStats {
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  pendingPermissions: number;
  approvedPermissions: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
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
  const now = new Date().getTime();
  const diffMs = now - start;
  if (diffMs < 0) return '0h 0m';
  const h = Math.floor(diffMs / 3600000);
  const m = Math.floor((diffMs % 3600000) / 60000);
  return `${h}h ${m}m`;
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

function permBadgeClass(p: PermissionStatus): string {
  const map: Record<PermissionStatus, string> = {
    NONE:     styles.permBadgeNone,
    PENDING:  styles.permBadgePending,
    APPROVED: styles.permBadgeApproved,
    REJECTED: styles.permBadgeRejected,
  };
  return `${styles.badge} ${map[p]}`;
}

function roleLabel(role: string | undefined): string {
  if (role === 'SUPER_ADMIN') return 'Super Admin';
  if (role === 'ADMIN')       return 'Admin';
  if (role === 'MANAGER')     return 'Team Leader';
  if (role === 'EMPLOYEE')    return 'Employee';
  return role ?? '—';
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const PERMISSION_TYPES: { value: PermissionType; label: string }[] = [
  { value: 'LATE_PERMISSION', label: 'Late Permission' },
  { value: 'HALF_DAY',        label: 'Half Day' },
  { value: 'LEAVE',           label: 'Full Leave' },
];
const PIE_COLORS: Record<AttendanceStatus, string> = {
  PRESENT:    '#22c55e',
  LATE:       '#f97316',
  ABSENT:     '#ef4444',
  HALF_DAY:   '#eab308',
  LEAVE:      '#6366f1',
  SUNDAY:     '#9ca3af',
  NOT_MARKED: '#d1d5db',
};

// ─── TeamRow ─────────────────────────────────────────────────────────────────

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
              <tr>
                <th>Employee</th>
                <th>Status</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Hours</th>
              </tr>
            </thead>
            <tbody>
              {team.records.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.user?.name ?? '—'}</td>
                  <td><span className={statusBadgeClass(r.status)}>{r.status.replace('_', ' ')}</span></td>
                  <td>{formatTime(r.checkIn)}</td>
                  <td>{formatTime(r.checkOut)}</td>
                  <td>
                    {r.checkIn && !r.checkOut ? (
                      <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{calculateLiveDiff(r.checkIn)} (Active)</span>
                    ) : (
                      formatDuration(r.totalHours)
                    )}
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

// ─── SuperAdminMonitor ───────────────────────────────────────────────────────

function SuperAdminMonitor() {
  const { users } = useApp();
  const now = new Date();

  const [loading,            setLoading]            = useState(true);
  const [stats,              setStats]              = useState<DashboardStats | null>(null);
  const [allToday,           setAllToday]           = useState<AttendanceRecord[]>([]);
  const [monthlyData,        setMonthlyData]        = useState<AttendanceRecord[]>([]);
  const [pendingPermissions, setPendingPermissions] = useState<AttendanceRecord[]>([]);
  const [tick,               setTick]               = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const [activeTab,   setActiveTab]   = useState<'roles' | 'teams' | 'records' | 'permissions'>('roles');
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('tab') === 'permissions') setActiveTab('permissions');
  }, [searchParams]);
  const [chartView,   setChartView]   = useState<'weekly' | 'monthly'>('weekly');
  const [histMonth,   setHistMonth]   = useState(now.getMonth() + 1);
  const [histYear,    setHistYear]    = useState(now.getFullYear());
  const [search,      setSearch]      = useState('');
  const [filterRole,  setFilterRole]  = useState('ALL');
  const [filterStatus,setFilterStatus]= useState('ALL');

  const [overrideRecord,   setOverrideRecord]   = useState<AttendanceRecord | null>(null);
  const [overrideStatus,   setOverrideStatus]   = useState<AttendanceStatus>('PRESENT');
  const [overrideCheckIn,  setOverrideCheckIn]  = useState('');
  const [overrideCheckOut, setOverrideCheckOut] = useState('');
  const [overrideRemarks,  setOverrideRemarks]  = useState('');
  const [submitting,       setSubmitting]        = useState(false);

  const [viewEmpRecord,    setViewEmpRecord]    = useState<AttendanceRecord | null>(null);
  const [empHistory,       setEmpHistory]       = useState<AttendanceRecord[]>([]);
  const [empHistLoading,   setEmpHistLoading]   = useState(false);
  const [empHistMonth,     setEmpHistMonth]     = useState(now.getMonth() + 1);
  const [empHistYear,      setEmpHistYear]      = useState(now.getFullYear());

  const loadEmpHistory = useCallback(async (userId: string, month: number, year: number) => {
    setEmpHistLoading(true);
    try {
      const res = await api.get(`/attendance/all?month=${month}&year=${year}`);
      if (res.data?.success) {
        const filtered = (res.data.data ?? []).filter((r: AttendanceRecord) => r.userId === userId);
        setEmpHistory(filtered);
      }
    } catch { /* silent */ }
    setEmpHistLoading(false);
  }, []);

  useEffect(() => {
    if (viewEmpRecord) loadEmpHistory(viewEmpRecord.userId, empHistMonth, empHistYear);
  }, [viewEmpRecord, empHistMonth, empHistYear, loadEmpHistory]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, todayRes, pendingRes] = await Promise.all([
        api.get('/attendance/stats'),
        api.get('/attendance/all'),
        api.get('/attendance/permission/team'),
      ]);
      if (statsRes.data?.success)   setStats(statsRes.data.data);
      if (todayRes.data?.success)   setAllToday(todayRes.data.data ?? []);
      if (pendingRes.data?.success) setPendingPermissions(pendingRes.data.data ?? []);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  const loadMonthly = useCallback(async () => {
    try {
      const res = await api.get(`/attendance/all?month=${histMonth}&year=${histYear}`);
      if (res.data?.success) setMonthlyData(res.data.data ?? []);
    } catch { /* silent */ }
  }, [histMonth, histYear]);

  useEffect(() => { loadData(); },    [loadData]);
  useEffect(() => { loadMonthly(); }, [loadMonthly]);

  // Pie data — today's status distribution
  const pieData = useMemo(() => {
    const counts: Partial<Record<AttendanceStatus, number>> = {};
    allToday.forEach(r => { counts[r.status] = (counts[r.status] ?? 0) + 1; });
    return (Object.entries(counts) as [AttendanceStatus, number][])
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
  }, [allToday]);

  // Trend bar data from monthly records
  const trendData = useMemo(() => {
    const byDate: Record<string, { date: string; present: number; absent: number; late: number; halfDay: number }> = {};
    monthlyData.forEach(r => {
      const d = r.date.split('T')[0];
      if (!byDate[d]) byDate[d] = { date: d, present: 0, absent: 0, late: 0, halfDay: 0 };
      if (r.status === 'PRESENT')   byDate[d].present++;
      else if (r.status === 'ABSENT')   byDate[d].absent++;
      else if (r.status === 'LATE')     byDate[d].late++;
      else if (r.status === 'HALF_DAY') byDate[d].halfDay++;
    });
    const sorted = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
    const slice  = chartView === 'weekly' ? sorted.slice(-7) : sorted;
    return slice.map(d => ({
      ...d,
      label: chartView === 'weekly'
        ? new Date(d.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })
        : new Date(d.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric' }),
    }));
  }, [monthlyData, chartView]);

  // Role breakdown
  const roleStats = useMemo(() => (
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE'].map(role => {
      const recs = allToday.filter(r => r.user?.role === role);
      const checked = recs.filter(r => ['PRESENT', 'LATE', 'HALF_DAY'].includes(r.status)).length;
      return {
        role,
        total:   recs.length,
        present: recs.filter(r => r.status === 'PRESENT').length,
        late:    recs.filter(r => r.status === 'LATE').length,
        absent:  recs.filter(r => r.status === 'ABSENT').length,
        rate:    recs.length > 0 ? Math.round((checked / recs.length) * 100) : 0,
      };
    })
  ), [allToday]);

  // Team mapping
  const teamMapping = useMemo<TeamData[]>(() => {
    const map: Record<string, TeamData> = {};
    allToday.forEach(r => {
      const u         = users.find(u => u.id === r.userId);
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
  }, [allToday, users]);

  // Filtered all-records
  const filteredRecords = useMemo(() => allToday.filter(r => {
    const q = search.toLowerCase();
    const matchSearch  = !search || r.user?.name?.toLowerCase().includes(q) || r.user?.email?.toLowerCase().includes(q);
    const matchRole    = filterRole   === 'ALL' || r.user?.role   === filterRole;
    const matchStatus  = filterStatus === 'ALL' || r.status       === filterStatus;
    return matchSearch && matchRole && matchStatus;
  }), [allToday, search, filterRole, filterStatus]);

  const openOverride = (rec: AttendanceRecord) => {
    setOverrideRecord(rec);
    setOverrideStatus(rec.status);
    setOverrideCheckIn(rec.checkIn  ? new Date(rec.checkIn).toISOString().slice(0, 16)  : '');
    setOverrideCheckOut(rec.checkOut ? new Date(rec.checkOut).toISOString().slice(0, 16) : '');
    setOverrideRemarks('');
  };

  const handleOverride = async () => {
    if (!overrideRecord) return;
    setSubmitting(true);
    try {
      await api.patch(`/attendance/${overrideRecord.id}`, {
        status:   overrideStatus,
        checkIn:  overrideCheckIn  || null,
        checkOut: overrideCheckOut || null,
        remarks:  overrideRemarks,
      });
      setOverrideRecord(null);
      await loadData();
    } catch (e: any) {
      alert(e.response?.data?.message ?? 'Override failed');
    } finally { setSubmitting(false); }
  };

  const handleApprove = async (id: string) => {
    try { await api.patch(`/attendance/permission/${id}/approve`); await loadData(); }
    catch (e: any) { alert(e.response?.data?.message ?? 'Failed'); }
  };
  const handleReject = async (id: string) => {
    try { await api.patch(`/attendance/permission/${id}/reject`); await loadData(); }
    catch (e: any) { alert(e.response?.data?.message ?? 'Failed'); }
  };

  const totalToday    = allToday.length;
  const presentToday  = allToday.filter(r => ['PRESENT', 'LATE', 'HALF_DAY'].includes(r.status)).length;
  const attendanceRate = totalToday > 0 ? Math.round((presentToday / totalToday) * 100) : 0;

  if (loading) return <div className={styles.empty}>Loading attendance data…</div>;

  return (
    <>
      {/* ── Refresh ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button className={styles.refreshBtn} onClick={loadData}>
          <RefreshCw size={13} style={{ display: 'inline', marginRight: 5 }} />Refresh
        </button>
      </div>

      {/* ── 6 Stat Cards ── */}
      <div className={styles.monitorGrid}>
        {[
          { icon: <Users size={18} />,     color: '#4f46e5', bg: 'rgba(99,102,241,0.1)',  val: totalToday,                label: 'Total Employees' },
          { icon: <UserCheck size={18} />, color: '#16a34a', bg: 'rgba(34,197,94,0.1)',   val: stats?.present ?? 0,      label: 'Present Today' },
          { icon: <UserX size={18} />,     color: '#dc2626', bg: 'rgba(239,68,68,0.1)',   val: stats?.absent ?? 0,       label: 'Absent Today' },
          { icon: <Clock size={18} />,     color: '#ea580c', bg: 'rgba(249,115,22,0.1)',  val: stats?.late ?? 0,         label: 'Late Arrivals' },
          { icon: <Calendar size={18} />,  color: '#b45309', bg: 'rgba(234,179,8,0.1)',   val: stats?.halfDay ?? 0,      label: 'Half Day' },
          { icon: <TrendingUp size={18} />,color: '#4f46e5', bg: 'rgba(99,102,241,0.1)',  val: `${attendanceRate}%`,     label: 'Attendance Rate' },
        ].map(({ icon, color, bg, val, label }) => (
          <div key={label} className={styles.monitorCard}>
            <div className={styles.monitorIcon} style={{ background: bg, color }}>{icon}</div>
            <div className={styles.monitorVal} style={{ color }}>{val}</div>
            <div className={styles.monitorLbl}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── Charts Row ── */}
      <div className={styles.chartsRow}>
        {/* Pie — today's distribution */}
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Today&apos;s Distribution</div>
          {pieData.length === 0 ? (
            <div className={styles.empty}>No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {pieData.map(entry => (
                    <Cell key={entry.name} fill={PIE_COLORS[entry.name as AttendanceStatus] ?? '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, String(n).replace('_', ' ')]} />
                <Legend formatter={v => String(v).replace('_', ' ')} iconType="circle" iconSize={10} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bar — trend */}
        <div className={styles.chartCard} style={{ flex: 2 }}>
          <div className={styles.chartTitleRow}>
            <div className={styles.chartTitle}>Attendance Trend</div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {(['weekly', 'monthly'] as const).map(v => (
                <button
                  key={v}
                  className={`${styles.toggleBtn} ${chartView === v ? styles.toggleActive : ''}`}
                  onClick={() => setChartView(v)}
                >
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
          {trendData.length === 0 ? (
            <div className={styles.empty}>No trend data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trendData} barSize={8} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} allowDecimals={false} />
                <Tooltip />
                <Legend iconType="circle" iconSize={8} />
                <Bar dataKey="present"  fill="#22c55e" radius={[3,3,0,0]} name="Present"  />
                <Bar dataKey="late"     fill="#f97316" radius={[3,3,0,0]} name="Late"     />
                <Bar dataKey="absent"   fill="#ef4444" radius={[3,3,0,0]} name="Absent"   />
                <Bar dataKey="halfDay"  fill="#eab308" radius={[3,3,0,0]} name="Half Day" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className={styles.tabs}>
        {([
          { key: 'roles',       label: 'Role Performance' },
          { key: 'teams',       label: 'Team Mapping' },
          { key: 'records',     label: `All Records (${allToday.length})` },
          { key: 'permissions', label: `Requests${pendingPermissions.length > 0 ? ` (${pendingPermissions.length})` : ''}` },
        ] as const).map(t => (
          <button
            key={t.key}
            className={`${styles.tab} ${activeTab === t.key ? styles.activeTab : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Role Breakdown ── */}
      {activeTab === 'roles' && (
        <div className={styles.rolesGrid}>
          {roleStats.map(rs => {
            const rateColor = rs.rate >= 80 ? '#16a34a' : rs.rate >= 60 ? '#ea580c' : '#dc2626';
            const barColor  = rs.rate >= 80 ? '#22c55e' : rs.rate >= 60 ? '#f97316' : '#ef4444';
            return (
              <div key={rs.role} className={styles.roleCard}>
                <div className={styles.roleCardHeader}>
                  <span className={styles.roleLabel}>{roleLabel(rs.role)}</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800, color: rateColor }}>{rs.rate}%</span>
                </div>
                <div className={styles.roleStatsRow}>
                  {[
                    { val: rs.present, lbl: 'Present', color: '#16a34a' },
                    { val: rs.late,    lbl: 'Late',    color: '#f97316' },
                    { val: rs.absent,  lbl: 'Absent',  color: '#dc2626' },
                  ].map(({ val, lbl, color }) => (
                    <div key={lbl} className={styles.roleStat}>
                      <div style={{ color, fontWeight: 800, fontSize: '1.3rem' }}>{val}</div>
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

      {/* ── Team Mapping ── */}
      {activeTab === 'teams' && (
        <div className={styles.sectionCard}>
          <div className={styles.sectionTitle}><Users size={16} /> Team Attendance Mapping — Today</div>
          {teamMapping.length === 0
            ? <div className={styles.empty}>No team data available</div>
            : teamMapping.map(team => <TeamRow key={team.managerId} team={team} />)
          }
        </div>
      )}

      {/* ── All Records ── */}
      {activeTab === 'records' && (
        <div className={styles.sectionCard}>
          <div className={styles.filterBarSA}>
            <div className={styles.searchWrap}>
              <Search size={13} />
              <input
                className={styles.searchInput}
                placeholder="Search name or email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select className={styles.monthSelect} value={filterRole}   onChange={e => setFilterRole(e.target.value)}>
              <option value="ALL">All Roles</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="ADMIN">Admin</option>
              <option value="MANAGER">Team Leader</option>
              <option value="EMPLOYEE">Employee</option>
            </select>
            <select className={styles.monthSelect} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="ALL">All Status</option>
              {(['PRESENT','ABSENT','LATE','HALF_DAY','LEAVE','NOT_MARKED'] as AttendanceStatus[]).map(s =>
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              )}
            </select>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Employee</th><th>Role</th><th>Status</th>
                  <th>Check In</th><th>Check Out</th><th>Hours</th>
                  <th>Permission</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No records found</td></tr>
                ) : filteredRecords.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.user?.name ?? '—'}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{r.user?.email}</div>
                    </td>
                    <td><span className={styles.rolePill}>{roleLabel(r.user?.role)}</span></td>
                    <td><span className={statusBadgeClass(r.status)}>{r.status.replace('_', ' ')}</span></td>
                    <td>{formatTime(r.checkIn)}</td>
                    <td>{formatTime(r.checkOut)}</td>
                    <td>
                      {r.checkIn && !r.checkOut ? (
                        <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{calculateLiveDiff(r.checkIn)} (Active)</span>
                      ) : (
                        formatDuration(r.totalHours)
                      )}
                    </td>
                    <td>
                      {r.permission !== 'NONE'
                        ? <span className={permBadgeClass(r.permission)}>{r.permission}</span>
                        : <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>—</span>}
                    </td>
                    <td style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <button className={styles.viewBtn} onClick={() => { setViewEmpRecord(r); setEmpHistMonth(now.getMonth() + 1); setEmpHistYear(now.getFullYear()); }}>View</button>
                      <button className={styles.overrideBtn} onClick={() => openOverride(r)}>Override</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Permission Requests ── */}
      {activeTab === 'permissions' && (
        <div className={styles.sectionCard}>
          <div className={styles.sectionTitle}><ShieldCheck size={16} /> Permission Requests</div>
          {pendingPermissions.length === 0 ? (
            <div className={styles.empty}>No permission requests</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Employee</th><th>Date</th><th>Type</th>
                    <th>Reason</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingPermissions.map(r => (
                    <tr key={r.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{r.user?.name ?? '—'}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{roleLabel(r.user?.role)}</div>
                      </td>
                      <td>{formatDate(r.date)}</td>
                      <td>
                        <span className={styles.badge} style={{ background: 'rgba(99,102,241,0.1)', color: '#4f46e5' }}>
                          {r.permissionType?.replace('_', ' ') ?? '—'}
                        </span>
                      </td>
                      <td style={{ maxWidth: 200, whiteSpace: 'pre-wrap', fontSize: '0.825rem' }}>{r.permissionReason ?? '—'}</td>
                      <td><span className={permBadgeClass(r.permission)}>{r.permission}</span></td>
                      <td>
                        {r.permission === 'PENDING' && (
                          <>
                            <button className={styles.approveBtn} onClick={() => handleApprove(r.id)}>
                              <CheckCircle size={11} style={{ display: 'inline', marginRight: 3 }} />Approve
                            </button>
                            <button className={styles.rejectBtn} onClick={() => handleReject(r.id)}>
                              <XCircle size={11} style={{ display: 'inline', marginRight: 3 }} />Reject
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Employee Detail Modal ── */}
      {viewEmpRecord && (
        <div className={styles.modalOverlay} onClick={() => setViewEmpRecord(null)}>
          <div className={styles.modal} style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <div className={styles.modalTitle} style={{ marginBottom: '0.2rem' }}>{viewEmpRecord.user?.name ?? '—'}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{viewEmpRecord.user?.email}</div>
                <span className={styles.rolePill} style={{ marginTop: '0.4rem', display: 'inline-block' }}>{roleLabel(viewEmpRecord.user?.role)}</span>
              </div>
              <span className={statusBadgeClass(viewEmpRecord.status)} style={{ fontSize: '0.85rem' }}>
                Today: {viewEmpRecord.status.replace('_', ' ')}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              {[
                { label: 'Check In',    val: formatTime(viewEmpRecord.checkIn) },
                { label: 'Check Out',   val: formatTime(viewEmpRecord.checkOut) },
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
              {empHistLoading ? (
                <div className={styles.empty}>Loading…</div>
              ) : empHistory.length === 0 ? (
                <div className={styles.empty}>No records for this month</div>
              ) : (
                <div className={styles.tableWrap} style={{ maxHeight: 280, overflowY: 'auto' }}>
                  <table className={styles.table}>
                    <thead>
                      <tr><th>Date</th><th>Status</th><th>Check In</th><th>Check Out</th><th>Hours</th></tr>
                    </thead>
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
            </div>
          </div>
        </div>
      )}

      {/* ── Override Modal ── */}
      {overrideRecord && (
        <div className={styles.modalOverlay} onClick={() => setOverrideRecord(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalTitle}>Override Attendance — {overrideRecord.user?.name}</div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Status</label>
              <select className={styles.formSelect} value={overrideStatus} onChange={e => setOverrideStatus(e.target.value as AttendanceStatus)}>
                {(['PRESENT','ABSENT','LATE','HALF_DAY','LEAVE','SUNDAY','NOT_MARKED'] as AttendanceStatus[]).map(s =>
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
              <label className={styles.formLabel}>Remarks</label>
              <input type="text" className={styles.formInput} value={overrideRemarks} onChange={e => setOverrideRemarks(e.target.value)} placeholder="Reason for override…" />
            </div>
            <div className={styles.modalBtns}>
              <button className={styles.cancelBtn} onClick={() => setOverrideRecord(null)}>Cancel</button>
              <button className={styles.submitBtn} onClick={handleOverride} disabled={submitting}>
                {submitting ? 'Saving…' : 'Save Override'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Regular Attendance Page (Admin / Manager / Employee) ────────────────────

function RegularAttendancePage() {
  const { currentUser, showToast } = useApp();
  const role      = currentUser?.role;
  const isManager = role === 'MANAGER';
  const isAdmin   = role === 'ADMIN';

  const now = new Date();
  const [today,               setToday]               = useState<AttendanceRecord | null>(null);
  const [stats,               setStats]               = useState<DashboardStats | null>(null);
  const [loading,             setLoading]             = useState(true);
  const [morningPlan,         setMorningPlan]         = useState('');
  const [dayCompletion,       setDayCompletion]       = useState('');
  const [showCheckOutForm,    setShowCheckOutForm]    = useState(false);
  const [submitting,          setSubmitting]          = useState(false);
  const [histMonth,           setHistMonth]           = useState(now.getMonth() + 1);
  const [histYear,            setHistYear]            = useState(now.getFullYear());
  const [history,             setHistory]             = useState<AttendanceRecord[]>([]);
  const [teamAttendance,      setTeamAttendance]      = useState<AttendanceRecord[]>([]);
  const [pendingPermissions,  setPendingPermissions]  = useState<AttendanceRecord[]>([]);
  const [allAttendance,       setAllAttendance]       = useState<AttendanceRecord[]>([]);
  const [activeTab,           setActiveTab]           = useState<'team' | 'permissions' | 'all'>('team');
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('tab') === 'permissions') setActiveTab('permissions');
  }, [searchParams]);
  const [showPermModal,       setShowPermModal]       = useState(false);
  const [permType,            setPermType]            = useState<PermissionType>('LATE_PERMISSION');
  const [permReason,          setPermReason]          = useState('');
  const [permDate,            setPermDate]            = useState('');
  const [overrideRecord,      setOverrideRecord]      = useState<AttendanceRecord | null>(null);
  const [overrideStatus,      setOverrideStatus]      = useState<AttendanceStatus>('PRESENT');
  const [overrideCheckIn,     setOverrideCheckIn]     = useState('');
  const [overrideCheckOut,    setOverrideCheckOut]    = useState('');
  const [overrideRemarks,     setOverrideRemarks]     = useState('');
  const [tick,                setTick]                = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const loadToday = useCallback(async () => {
    try {
      const res = await api.get('/attendance/today');
      if (res.data?.success) {
        const rec: AttendanceRecord = res.data.data;
        setToday(rec);
        setMorningPlan(rec.morningPlan ?? '');
      }
    } catch { /* silent */ }
  }, []);

  const loadStats   = useCallback(async () => {
    try { const r = await api.get('/attendance/stats'); if (r.data?.success) setStats(r.data.data); } catch { /* silent */ }
  }, []);
  const loadHistory = useCallback(async () => {
    try { const r = await api.get(`/attendance/my?month=${histMonth}&year=${histYear}`); if (r.data?.success) setHistory(r.data.data); } catch { /* silent */ }
  }, [histMonth, histYear]);
  const loadTeam    = useCallback(async () => {
    try { const r = await api.get('/attendance/team'); if (r.data?.success) setTeamAttendance(r.data.data); } catch { /* silent */ }
  }, []);
  const loadPending = useCallback(async () => {
    try { const r = await api.get('/attendance/permission/team'); if (r.data?.success) setPendingPermissions(r.data.data); } catch { /* silent */ }
  }, []);
  const loadAll     = useCallback(async () => {
    try { const r = await api.get('/attendance/all'); if (r.data?.success) setAllAttendance(r.data.data); } catch { /* silent */ }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadToday(), loadStats(), loadHistory()]);
      if (isManager || isAdmin) await Promise.all([loadTeam(), loadPending()]);
      if (isAdmin) await loadAll();
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const handleCheckIn = async () => {
    setSubmitting(true);
    try {
      await api.post('/attendance/check-in');
      await loadToday(); await loadStats();
      if (isManager || isAdmin) await loadTeam();
    } catch (e: any) { alert(e.response?.data?.message ?? 'Check-in failed'); }
    finally { setSubmitting(false); }
  };

  const handleSavePlan = async () => {
    if (!morningPlan.trim()) return;
    setSubmitting(true);
    try { await api.post('/attendance/morning-plan', { morningPlan }); await loadToday(); }
    catch (e: any) { alert(e.response?.data?.message ?? 'Failed to save plan'); }
    finally { setSubmitting(false); }
  };

  const handleCheckOut = async () => {
    setSubmitting(true);
    try {
      await api.post('/attendance/check-out', { dayCompletion });
      setShowCheckOutForm(false); setDayCompletion('');
      await loadToday(); await loadStats(); await loadHistory();
      if (isManager || isAdmin) await loadTeam();
    } catch (e: any) { alert(e.response?.data?.message ?? 'Check-out failed'); }
    finally { setSubmitting(false); }
  };

  const handleApplyPermission = async () => {
    if (!permReason.trim()) return alert('Please provide a reason');
    setSubmitting(true);
    try {
      await api.post('/attendance/permission/apply', { permissionType: permType, reason: permReason, date: permDate || undefined });
      setShowPermModal(false); setPermReason(''); setPermDate('');
      await loadToday();
      showToast('Request Submitted', 'Your leave request has been sent for approval.');
    } catch (e: any) { alert(e.response?.data?.message ?? 'Failed to apply permission'); }
    finally { setSubmitting(false); }
  };

  const handleApprove = async (id: string) => {
    try { await api.patch(`/attendance/permission/${id}/approve`); await Promise.all([loadPending(), loadTeam(), loadStats()]); }
    catch (e: any) { alert(e.response?.data?.message ?? 'Failed'); }
  };
  const handleReject = async (id: string) => {
    try { await api.patch(`/attendance/permission/${id}/reject`); await Promise.all([loadPending(), loadTeam(), loadStats()]); }
    catch (e: any) { alert(e.response?.data?.message ?? 'Failed'); }
  };

  const openOverride = (rec: AttendanceRecord) => {
    setOverrideRecord(rec);
    setOverrideStatus(rec.status);
    setOverrideCheckIn(rec.checkIn  ? new Date(rec.checkIn).toISOString().slice(0,16)  : '');
    setOverrideCheckOut(rec.checkOut ? new Date(rec.checkOut).toISOString().slice(0,16) : '');
    setOverrideRemarks('');
  };
  const handleOverride = async () => {
    if (!overrideRecord) return;
    setSubmitting(true);
    try {
      await api.patch(`/attendance/${overrideRecord.id}`, { status: overrideStatus, checkIn: overrideCheckIn || null, checkOut: overrideCheckOut || null, remarks: overrideRemarks });
      setOverrideRecord(null);
      await Promise.all([loadAll(), loadTeam(), loadStats()]);
    } catch (e: any) { alert(e.response?.data?.message ?? 'Override failed'); }
    finally { setSubmitting(false); }
  };

  const canCheckIn  = today && !today.checkIn  && today.status !== 'SUNDAY';
  const canCheckOut = today && today.checkIn   && !today.checkOut;
  const canSavePlan = today && today.checkIn   && !today.checkOut && morningPlan !== (today.morningPlan ?? '');

  if (loading) return <div className={styles.empty}>Loading attendance data…</div>;

  return (
    <>
      {/* Stats */}
      {stats && (
        <div className={styles.statsRow}>
          {[
            { val: stats.present,            lbl: 'Present',      color: '#16a34a' },
            { val: stats.absent,             lbl: 'Absent',       color: '#dc2626' },
            { val: stats.late,               lbl: 'Late',         color: '#ea580c' },
            { val: stats.halfDay,            lbl: 'Half Day',     color: '#b45309' },
            { val: stats.pendingPermissions, lbl: 'Pending Perms',color: '#b45309' },
          ].map(({ val, lbl, color }) => (
            <div key={lbl} className={styles.statBox}>
              <div className={styles.statNum} style={{ color }}>{val}</div>
              <div className={styles.statLbl}>{lbl}</div>
            </div>
          ))}
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
            <span className={styles.timeValue}>{formatTime(today?.checkIn ?? null)}</span>
          </div>
          <div className={styles.timeItem}>
            <span className={styles.timeLabel}>Check Out</span>
            <span className={styles.timeValue}>{formatTime(today?.checkOut ?? null)}</span>
          </div>
          <div className={styles.timeItem}>
            <span className={styles.timeLabel}>Total Hours</span>
            <span className={styles.timeValue}>
              {today?.checkIn && !today?.checkOut ? (
                <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{calculateLiveDiff(today.checkIn)} (Active)</span>
              ) : (
                formatDuration(today?.totalHours ?? null)
              )}
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
          <button className={styles.checkInBtn}   onClick={handleCheckIn}              disabled={!canCheckIn  || submitting}>
            <LogIn size={16} />{today?.checkIn ? 'Checked In' : 'Check In'}
          </button>
          <button className={styles.checkOutBtn}  onClick={() => setShowCheckOutForm(true)} disabled={!canCheckOut || submitting}>
            <LogOut size={16} />{today?.checkOut ? 'Checked Out' : 'Check Out'}
          </button>
          <button className={styles.permissionBtn} onClick={() => setShowPermModal(true)}>
            <FileText size={16} />Apply Permission
          </button>
        </div>
      </div>

      {/* Morning Plan */}
      {today?.checkIn && !today?.checkOut && (
        <div className={styles.planCard}>
          <div className={styles.planTitle}><FileText size={15} /> Morning Plan — What will you do today?</div>
          <textarea className={styles.textarea} value={morningPlan} onChange={e => setMorningPlan(e.target.value)} placeholder="Describe your plan for today…" />
          <div style={{ marginTop: '0.75rem' }}>
            <button className={pageStyles.primaryBtn} onClick={handleSavePlan} disabled={!canSavePlan || submitting} style={{ fontSize: '0.875rem', padding: '0.6rem 1.25rem' }}>
              Save Plan
            </button>
          </div>
        </div>
      )}

      {/* Read-only plan after checkout */}
      {today?.checkIn && today?.checkOut && today?.morningPlan && (
        <div className={styles.planCard}>
          <div className={styles.planTitle}><FileText size={15} /> Morning Plan</div>
          <textarea className={styles.textarea} value={today.morningPlan} readOnly />
          {today.dayCompletion && (
            <>
              <div className={styles.planTitle} style={{ marginTop: '1rem' }}><CheckCircle size={15} /> Day Completion</div>
              <textarea className={styles.textarea} value={today.dayCompletion} readOnly />
            </>
          )}
        </div>
      )}

      {/* Check-out form */}
      {showCheckOutForm && (
        <div className={styles.planCard}>
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
        {history.length === 0 ? (
          <div className={styles.empty}>No records for this month</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr><th>Date</th><th>Status</th><th>Check In</th><th>Check Out</th><th>Hours</th><th>Permission</th></tr>
              </thead>
              <tbody>
                {history.map(r => (
                  <tr key={r.id}>
                    <td>{formatDate(r.date)}</td>
                    <td><span className={statusBadgeClass(r.status)}>{r.status.replace('_',' ')}</span></td>
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

      {/* Manager / Admin Tabs */}
      {(isManager || isAdmin) && (
        <>
          <div className={styles.tabs}>
            <button className={`${styles.tab} ${activeTab === 'team' ? styles.activeTab : ''}`} onClick={() => setActiveTab('team')}>
              <Users size={13} style={{ display: 'inline', marginRight: 4 }} />Team Today
            </button>
            <button className={`${styles.tab} ${activeTab === 'permissions' ? styles.activeTab : ''}`} onClick={() => setActiveTab('permissions')}>
              <ShieldCheck size={13} style={{ display: 'inline', marginRight: 4 }} />
              Requests {pendingPermissions.length > 0 && `(${pendingPermissions.length})`}
            </button>
            {isAdmin && (
              <button className={`${styles.tab} ${activeTab === 'all' ? styles.activeTab : ''}`} onClick={() => { setActiveTab('all'); loadAll(); }}>
                Historical
              </button>
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
                          <td><span className={statusBadgeClass(r.status)}>{r.status.replace('_',' ')}</span></td>
                          <td>{formatTime(r.checkIn)}</td>
                          <td>{formatTime(r.checkOut)}</td>
                          <td>
                            {r.checkIn && !r.checkOut ? (
                              <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{calculateLiveDiff(r.checkIn)} (Active)</span>
                            ) : (
                              formatDuration(r.totalHours)
                            )}
                          </td>
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
              <div className={styles.sectionTitle}><ShieldCheck size={16} /> Pending Permission Requests</div>
              {pendingPermissions.length === 0 ? <div className={styles.empty}>No pending requests</div> : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead><tr><th>Employee</th><th>Date</th><th>Type</th><th>Reason</th><th>Actions</th></tr></thead>
                    <tbody>
                      {pendingPermissions.map(r => (
                        <tr key={r.id}>
                          <td><div style={{ fontWeight: 600 }}>{r.user?.name ?? '—'}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{roleLabel(r.user?.role)}</div></td>
                          <td>{formatDate(r.date)}</td>
                          <td><span className={styles.badge} style={{ background: 'rgba(99,102,241,0.1)', color: '#4f46e5' }}>{r.permissionType?.replace('_',' ') ?? '—'}</span></td>
                          <td style={{ maxWidth: 200, whiteSpace: 'pre-wrap', fontSize: '0.825rem' }}>{r.permissionReason ?? '—'}</td>
                          <td>
                            <button className={styles.approveBtn} onClick={() => handleApprove(r.id)}><CheckCircle size={12} style={{ display: 'inline', marginRight: 3 }} />Approve</button>
                            <button className={styles.rejectBtn}  onClick={() => handleReject(r.id)}><XCircle size={12} style={{ display: 'inline', marginRight: 3 }} />Reject</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
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
                          <td><span className={statusBadgeClass(r.status)}>{r.status.replace('_',' ')}</span></td>
                          <td>{formatTime(r.checkIn)}</td>
                          <td>{formatTime(r.checkOut)}</td>
                          <td>
                            {r.checkIn && !r.checkOut ? (
                              <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{calculateLiveDiff(r.checkIn)} (Active)</span>
                            ) : (
                              formatDuration(r.totalHours)
                            )}
                          </td>
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
              <label className={styles.formLabel}>Date (leave blank for today)</label>
              <input 
                type="date" 
                className={styles.formInput} 
                value={permDate} 
                onChange={e => setPermDate(e.target.value)} 
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Reason *</label>
              <textarea className={styles.formTextarea} value={permReason} onChange={e => setPermReason(e.target.value)} placeholder="Explain the reason…" />
            </div>
            <div className={styles.modalBtns}>
              <button className={styles.cancelBtn} onClick={() => setShowPermModal(false)}>Cancel</button>
              <button className={styles.submitBtn} onClick={handleApplyPermission} disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Override Modal */}
      {overrideRecord && (
        <div className={styles.modalOverlay} onClick={() => setOverrideRecord(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalTitle}>Override Attendance — {overrideRecord.user?.name}</div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Status</label>
              <select className={styles.formSelect} value={overrideStatus} onChange={e => setOverrideStatus(e.target.value as AttendanceStatus)}>
                {(['PRESENT','ABSENT','LATE','HALF_DAY','LEAVE','SUNDAY','NOT_MARKED'] as AttendanceStatus[]).map(s =>
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
              <label className={styles.formLabel}>Remarks</label>
              <input type="text" className={styles.formInput} value={overrideRemarks} onChange={e => setOverrideRemarks(e.target.value)} placeholder="Reason for override…" />
            </div>
            <div className={styles.modalBtns}>
              <button className={styles.cancelBtn} onClick={() => setOverrideRecord(null)}>Cancel</button>
              <button className={styles.submitBtn} onClick={handleOverride} disabled={submitting}>
                {submitting ? 'Saving…' : 'Save Override'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const { currentUser } = useApp();
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  return (
    <div className={pageStyles.wrapper}>
      <Sidebar />
      <main className={pageStyles.main}>
        {isSuperAdmin ? (
          <>
            <Header title="Attendance Monitor" subtitle="Organization-wide attendance command center" />
            <div className={pageStyles.pageTitleRow}>
              <div>
                <h2>Attendance Command Center</h2>
                <p>Real-time monitoring — all teams, all roles, daily · weekly · monthly</p>
              </div>
            </div>
            <SuperAdminMonitor />
          </>
        ) : (
          <>
            <Header title="Attendance" subtitle="Track daily attendance, plans, and permissions" />
            <div className={pageStyles.pageTitleRow}>
              <div>
                <h2>Attendance Management</h2>
                <p>Check in, fill your daily plan, and manage permissions</p>
              </div>
            </div>
            <RegularAttendancePage />
          </>
        )}
      </main>
    </div>
  );
}
