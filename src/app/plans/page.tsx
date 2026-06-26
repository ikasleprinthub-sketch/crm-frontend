'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useApp } from '@/context/AppContext';
import api from '@/lib/api';
import pageStyles from '../page.module.css';
import {
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Sun, Clock, CheckCircle2, LogIn, LogOut,
  ArrowRight, CalendarDays, Users, User,
  Lightbulb, Footprints, ClipboardList, CheckSquare,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DayRecord {
  id: string;
  date: string;
  status: string;
  checkIn: string | null;
  checkOut: string | null;
  totalHours: number | null;
  todayPlan: string | null;
  morningPlan?: string | null;
  afternoonPlan: string | null;
  dayCompletion: string | null;
  userId?: string;
  user?: { id: string; name: string; email: string; role: string };
}

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const STATUS_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  PRESENT:    { color: '#16a34a', bg: 'rgba(34,197,94,0.12)',   label: 'Present'    },
  LATE:       { color: '#ea580c', bg: 'rgba(249,115,22,0.12)',  label: 'Late'       },
  ABSENT:     { color: '#dc2626', bg: 'rgba(239,68,68,0.12)',   label: 'Absent'     },
  HALF_DAY:   { color: '#b45309', bg: 'rgba(234,179,8,0.12)',   label: 'Half Day'   },
  LEAVE:      { color: '#4f46e5', bg: 'rgba(99,102,241,0.12)',  label: 'Leave'      },
  SUNDAY:     { color: '#9ca3af', bg: 'rgba(156,163,175,0.12)', label: 'Sunday'     },
  NOT_MARKED: { color: '#9ca3af', bg: 'rgba(156,163,175,0.12)', label: 'Not Marked' },
};

const PLAN_SECTIONS = [
  { key: 'todayPlan'   as const, label: 'Today Plan',   color: '#f59e0b', icon: <Sun size={13} />,          empty: 'No today plan entered.' },
  // { key: 'afternoonPlan' as const, label: 'Afternoon Plan', color: '#3b82f6', icon: <Clock size={13} />,        empty: 'No afternoon plan entered.' },
  { key: 'dayCompletion' as const, label: 'Day Completion', color: '#10b981', icon: <CheckCircle2 size={13} />, empty: 'No completion summary recorded.' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseDateParts(dateStr: string) {
  const clean = (dateStr ?? '').slice(0, 10);
  const parts = clean.split('-').map(Number);
  if (parts.length < 3 || parts.some(isNaN)) return null;
  const [y, m, d] = parts;
  const jsDate = new Date(y, m - 1, d);
  return {
    dayNum:     d,
    dayName:    DAY_NAMES[jsDate.getDay()],
    monthShort: MONTHS[m - 1]?.slice(0, 3) ?? '',
    fullLabel:  `${DAY_NAMES[jsDate.getDay()]}, ${d} ${MONTHS[m - 1]} ${y}`,
  };
}

function fmtTime(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}
function fmtHours(h: number | null) {
  if (h === null) return null;
  const mins = Math.round(h * 60);
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}
function initials(name: string) {
  return (name ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
function accentColor(score: number) {
  if (score === 3) return '#16a34a';
  if (score >= 1)  return '#f59e0b';
  return '#d1d5db';
}

// ─── Guide Banner ─────────────────────────────────────────────────────────────

function GuideBanner() {
  const [open, setOpen] = useState(true);
  const steps = [
    { icon: <LogIn size={18} />, color: '#4f46e5', title: 'Check In', desc: 'Go to Attendance and click Check In to start your workday.' },
    { icon: <Sun size={18} />,   color: '#f59e0b', title: 'Today Plan', desc: 'Write what you plan to accomplish today and click Save Plan.' },
    { icon: <LogOut size={18} />, color: '#ea580c', title: 'Check Out', desc: 'At the end of the day, click Check Out and enter your Day Completion — a summary of what you actually did.' },
  ];

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', marginBottom: '1.25rem', overflow: 'hidden' }}>
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: 28, height: 28, borderRadius: '7px', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
            <Lightbulb size={15} />
          </div>
          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>How Work Plans work</span>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600, background: 'var(--surface-hover)', border: '1px solid var(--border)', padding: '1px 7px', borderRadius: '20px' }}>3 steps</span>
        </div>
        {open ? <ChevronUp size={16} color="var(--text-secondary)" /> : <ChevronDown size={16} color="var(--text-secondary)" />}
      </button>

      {/* Steps */}
      {open && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '1rem 1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                <div style={{ width: 34, height: 34, borderRadius: '9px', background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                  {s.icon}
                </div>
                {i < steps.length - 1 && <div style={{ width: 1, height: 16, background: 'var(--border)' }} />}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.62rem', fontWeight: 800, color: s.color, background: `${s.color}15`, padding: '1px 6px', borderRadius: '20px' }}>Step {i + 1}</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>{s.title}</span>
                </div>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>{s.desc}</p>
              </div>
            </div>
          ))}
          <div style={{ gridColumn: '1 / -1', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckSquare size={13} color="#10b981" />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
              This page is a <strong>read-only journal</strong> of your daily plans. All entries are created automatically from the Attendance page.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Day Row ─────────────────────────────────────────────────────────────────

function DayRow({ rec, showUser }: { rec: DayRecord; showUser?: boolean }) {
  const [open, setOpen] = useState(false);
  const st     = STATUS_STYLE[rec.status] ?? STATUS_STYLE.NOT_MARKED;
  const score  = PLAN_SECTIONS.filter(s => rec[s.key]).length;
  const accent = accentColor(score);
  const dp     = parseDateParts(rec.date);

  return (
    <div style={{ background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden', borderLeft: `4px solid ${accent}` }}>

      {/* Collapsed header */}
      <div onClick={() => setOpen(o => !o)}
        style={{ padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', flexWrap: 'wrap' }}>

        {/* Date block */}
        <div style={{ width: 44, flexShrink: 0, textAlign: 'center', lineHeight: 1.15 }}>
          <p style={{ fontSize: '0.58rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', margin: 0 }}>{dp?.dayName ?? '—'}</p>
          <p style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>{dp?.dayNum ?? '—'}</p>
          <p style={{ fontSize: '0.58rem', fontWeight: 700, color: 'var(--text-secondary)', margin: 0 }}>{dp?.monthShort ?? '—'}</p>
        </div>

        <div style={{ width: 1, height: 34, background: 'var(--border)', flexShrink: 0 }} />

        {/* Info */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', minWidth: 0 }}>
          {/* Employee (team view) */}
          {showUser && rec.user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: 22, height: 22, borderRadius: '6px', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontSize: '0.55rem', fontWeight: 800 }}>
                {initials(rec.user.name)}
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{rec.user.name}</span>
            </div>
          )}

          <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '3px 9px', borderRadius: '20px', background: st.bg, color: st.color, whiteSpace: 'nowrap' }}>
            {st.label}
          </span>
          {fmtTime(rec.checkIn) && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.72rem', color: '#16a34a', fontWeight: 600 }}>
              <LogIn size={11} /> {fmtTime(rec.checkIn)}
            </span>
          )}
          {fmtTime(rec.checkOut) && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.72rem', color: '#ea580c', fontWeight: 600 }}>
              <LogOut size={11} /> {fmtTime(rec.checkOut)}
            </span>
          )}
          {fmtHours(rec.totalHours) && (
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              {fmtHours(rec.totalHours)}
            </span>
          )}
        </div>

        {/* Plan dots + score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: '3px' }}>
            {PLAN_SECTIONS.map(s => (
              <span key={s.key} title={s.label}
                style={{ width: 8, height: 8, borderRadius: '50%', background: rec[s.key] ? s.color : 'var(--border)', display: 'inline-block' }} />
            ))}
          </div>
          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: accent, background: `${accent}18`, padding: '2px 8px', borderRadius: '20px', border: `1px solid ${accent}30`, minWidth: 32, textAlign: 'center' }}>
            {score}/3
          </span>
          <ChevronDown size={14} color="var(--text-secondary)" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </div>
      </div>

      {/* Expanded detail */}
      {open && (
        <div style={{ borderTop: '1px solid var(--border)', background: 'var(--background)' }}>
          {/* Time strip */}
          <div style={{ display: 'flex', gap: '2rem', padding: '0.7rem 1.25rem', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', margin: 0 }}>Date</p>
              <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', margin: '2px 0 0' }}>{dp?.fullLabel ?? '—'}</p>
            </div>
            {[
              { label: 'Check In',  val: fmtTime(rec.checkIn)  ?? '—', color: '#16a34a' },
              { label: 'Check Out', val: fmtTime(rec.checkOut) ?? '—', color: '#ea580c' },
              { label: 'Hours',     val: fmtHours(rec.totalHours) ?? '—', color: 'var(--text-primary)' },
            ].map(item => (
              <div key={item.label}>
                <p style={{ fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', margin: 0 }}>{item.label}</p>
                <p style={{ fontSize: '0.8rem', fontWeight: 700, color: item.color, margin: '2px 0 0' }}>{item.val}</p>
              </div>
            ))}
          </div>

          {/* Plan sections */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            {PLAN_SECTIONS.map((s, i) => (
              <div key={s.key} style={{ padding: '0.9rem 1.25rem', borderRight: i < 2 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.55rem' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '5px', background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                    {s.icon}
                  </div>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px', color: s.color }}>{s.label}</span>
                  {rec[s.key] && <CheckCircle2 size={11} color={s.color} style={{ marginLeft: 'auto' }} />}
                </div>
                <div style={{ padding: '0.65rem 0.85rem', background: 'var(--surface)', borderRadius: '8px', border: `1px solid ${rec[s.key] ? `${s.color}25` : 'var(--border)'}`, borderLeft: `3px solid ${rec[s.key] ? s.color : 'var(--border)'}`, minHeight: 56 }}>
                  {rec[s.key]
                    ? <p style={{ fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: 1.65, margin: 0, whiteSpace: 'pre-wrap' }}>{rec[s.key]}</p>
                    : <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0 }}>{s.empty}</p>
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Team Member Card (Super Admin view) ─────────────────────────────────────

function MemberPlanCard({ name, records }: { name: string; records: DayRecord[] }) {
  const [open, setOpen] = useState(false);
  const worked    = records.filter(r => ['PRESENT','HALF_DAY'].includes(r.status)).length;
  const morning   = records.filter(r => r.todayPlan || r.morningPlan).length;
  const done      = records.filter(r => r.dayCompletion).length;
  const fillPct   = worked > 0 ? Math.round((Math.min(morning, done) / worked) * 100) : 0;
  const barColor  = fillPct >= 80 ? '#16a34a' : fillPct >= 40 ? '#f59e0b' : '#ef4444';
  const sorted    = [...records].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
      {/* Member header */}
      <div onClick={() => setOpen(o => !o)}
        style={{ padding: '0.9rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
        <div style={{ width: 36, height: 36, borderRadius: '9px', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800, flexShrink: 0 }}>
          {initials(name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{worked} worked</span>
            <span style={{ fontSize: '0.65rem', color: '#f59e0b', fontWeight: 700 }}>{morning} today plans</span>
            <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 700 }}>{done} done</span>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ fontSize: '1.1rem', fontWeight: 800, color: barColor, margin: 0 }}>{fillPct}%</p>
          <p style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 600, margin: 0 }}>plan score</p>
        </div>
        <ChevronDown size={14} color="var(--text-secondary)" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: 'var(--border)', margin: '0 1.1rem' }}>
        <div style={{ height: '100%', width: `${fillPct}%`, background: barColor, borderRadius: 2, transition: 'width 0.4s' }} />
      </div>

      {/* Expanded days */}
      {open && (
        <div style={{ padding: '0.75rem 1.1rem', borderTop: '1px solid var(--border)', marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {sorted.map(rec => <DayRow key={rec.id} rec={rec} />)}
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PlansPage() {
  const { currentUser, showToast, socket } = useApp();
  const router  = useRouter();
  const now     = new Date();
  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(currentUser?.role ?? '');

  const [myRecords,   setMyRecords]   = useState<DayRecord[]>([]);
  const [teamRecords, setTeamRecords] = useState<DayRecord[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [month,       setMonth]       = useState(now.getMonth() + 1);
  const [year,        setYear]        = useState(now.getFullYear());
  // Super admin sees team view by default, regular users see own plans
  const [view, setView] = useState<'my' | 'team'>(isAdmin ? 'team' : 'my');

  const loadPlansData = useCallback(async (signal?: AbortSignal) => {
    try {
      const requests = [
        api.get(`/attendance/my?month=${month}&year=${year}`, { signal })
          .then(res => { if (res.data?.success) setMyRecords(res.data.data ?? []); })
          .catch(err => { if (err.code !== 'ERR_CANCELED') console.warn('my plans:', err); }),
      ];
      if (isAdmin) {
        requests.push(
          api.get(`/attendance/all?month=${month}&year=${year}`, { signal })
            .then(res => { if (res.data?.success) setTeamRecords(res.data.data ?? []); })
            .catch(err => { if (err.code !== 'ERR_CANCELED') console.warn('team plans:', err); })
        );
      }
      await Promise.all(requests);
    } catch (e) {
      console.error(e);
    }
  }, [month, year, isAdmin]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    loadPlansData(controller.signal).finally(() => setLoading(false));
    return () => controller.abort();
  }, [loadPlansData]);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      console.log('⏰ Socket: Attendance updated, reloading plans...');
      loadPlansData();
    };
    socket.on('attendance:updated', handleUpdate);
    return () => {
      socket.off('attendance:updated', handleUpdate);
    };
  }, [socket, loadPlansData]);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (isCurrentMonth) return;
    if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1);
  };
  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();

  const activeRecords = view === 'team' ? teamRecords : myRecords;

  // My-view stats
  const workedDays  = useMemo(() => myRecords.filter(r => ['PRESENT','HALF_DAY'].includes(r.status)).length, [myRecords]);
  const withMorning = useMemo(() => myRecords.filter(r => r.todayPlan || r.morningPlan).length, [myRecords]);
  const withDone    = useMemo(() => myRecords.filter(r => r.dayCompletion).length, [myRecords]);
  const fillRate    = workedDays > 0 ? Math.round((Math.min(withMorning, withDone) / workedDays) * 100) : 0;

  // Team stats
  const teamMembers = useMemo(() => {
    const map: Record<string, { name: string; records: DayRecord[] }> = {};
    teamRecords.forEach(r => {
      const uid = r.userId ?? r.user?.id ?? 'unknown';
      if (!map[uid]) map[uid] = { name: r.user?.name ?? 'Unknown', records: [] };
      map[uid].records.push(r);
    });
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
  }, [teamRecords]);

  const teamPresent  = useMemo(() => teamRecords.filter(r => ['PRESENT','HALF_DAY'].includes(r.status)).length, [teamRecords]);
  const teamMorning  = useMemo(() => teamRecords.filter(r => r.todayPlan || r.morningPlan).length, [teamRecords]);
  const teamDone     = useMemo(() => teamRecords.filter(r => r.dayCompletion).length, [teamRecords]);

  const sortedMy = useMemo(() => [...myRecords].sort((a, b) => b.date.localeCompare(a.date)), [myRecords]);

  const statCards = view === 'team'
    ? [
        { label: 'Team Records',    value: teamRecords.length,              sub: `${teamMembers.length} members` },
        { label: 'Days Present',    value: teamPresent,                     sub: 'across team' },
        { label: 'Today Plans',   value: teamMorning,                     sub: 'submitted' },
        { label: 'Completions',     value: teamDone,                        sub: 'submitted' },
      ]
    : [
        { label: 'Days Worked',     value: workedDays,                      sub: `of ${myRecords.length} total` },
        { label: 'Today Plans',   value: withMorning,                     sub: 'written' },
        { label: 'Completions',     value: withDone,                        sub: 'day-end reports' },
        { label: 'Plan Score',      value: `${fillRate}%`,                  sub: 'fully filled days' },
      ];

  return (
    <div className={pageStyles.wrapper}>
      <Sidebar />
      <main className={pageStyles.main}>
        <Header title="Work Plans" subtitle="Daily planning journal" />

        {/* ── Hero / month nav ── */}
        <div style={{ background: 'var(--primary)', borderRadius: '14px', padding: '1.25rem 1.5rem', marginBottom: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>

          {/* Month navigator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button onClick={prevMonth}
              style={{ width: 32, height: 32, borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
              <ChevronLeft size={15} />
            </button>
            <div style={{ textAlign: 'center', minWidth: 130 }}>
              <p style={{ fontSize: '1.15rem', fontWeight: 900, color: '#fff', margin: 0 }}>{MONTHS[month - 1]} {year}</p>
              {!loading && <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.6)', margin: 0 }}>{activeRecords.length} records</p>}
            </div>
            <button onClick={nextMonth} disabled={isCurrentMonth}
              style={{ width: 32, height: 32, borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isCurrentMonth ? 'not-allowed' : 'pointer', color: '#fff', opacity: isCurrentMonth ? 0.3 : 1 }}>
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            {statCards.map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', margin: 0, lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.4px', margin: '2px 0 0' }}>{s.label}</p>
                <p style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Right controls */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {/* View switcher — only for admins */}
            {isAdmin && (
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.12)', borderRadius: '9px', padding: '0.2rem', gap: '0.15rem' }}>
                <button onClick={() => setView('team')}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.35rem 0.75rem', borderRadius: '7px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem', fontFamily: 'inherit', transition: 'all 0.15s', background: view === 'team' ? '#fff' : 'transparent', color: view === 'team' ? 'var(--primary)' : 'rgba(255,255,255,0.75)' }}>
                  <Users size={13} /> Team
                </button>
                <button onClick={() => setView('my')}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.35rem 0.75rem', borderRadius: '7px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem', fontFamily: 'inherit', transition: 'all 0.15s', background: view === 'my' ? '#fff' : 'transparent', color: view === 'my' ? 'var(--primary)' : 'rgba(255,255,255,0.75)' }}>
                  <User size={13} /> My Plans
                </button>
              </div>
            )}
            <button onClick={() => router.push('/attendance')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.9rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
              Attendance <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* ── Guide (personal view only, below hero) ── */}
        {view === 'my' && <GuideBanner />}

        {/* ── Color key ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
          {[{ color: '#16a34a', label: 'All 3 filled' }, { color: '#f59e0b', label: '1–2 filled' }, { color: '#d1d5db', label: 'No plans' }].map(l => (
            <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              <span style={{ width: 10, height: 4, borderRadius: '2px', background: l.color, display: 'inline-block' }} /> {l.label}
            </span>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem' }}>
            {PLAN_SECTIONS.map(s => (
              <span key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', color: s.color, fontWeight: 700 }}>
                {s.icon} {s.label.split(' ')[0]}
              </span>
            ))}
          </div>
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Loading records…
          </div>
        ) : view === 'team' && isAdmin ? (
          teamMembers.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: '12px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              No attendance records for {MONTHS[month - 1]} {year}.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {teamMembers.map(m => <MemberPlanCard key={m.name} name={m.name} records={m.records} />)}
            </div>
          )
        ) : sortedMy.length === 0 ? (
          <div style={{ padding: '3.5rem 2rem', textAlign: 'center', background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: 52, height: 52, borderRadius: '14px', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <CalendarDays size={24} />
            </div>
            <p style={{ fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>No records for {MONTHS[month - 1]} {year}</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: 0, maxWidth: 300, lineHeight: 1.5 }}>
              {isCurrentMonth ? 'Check in on the Attendance page and write your Morning Plan to get started.' : 'No records for this period. Try a different month.'}
            </p>
            {isCurrentMonth && (
              <button onClick={() => router.push('/attendance')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.25rem', borderRadius: '9px', border: 'none', background: 'var(--primary)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', fontFamily: 'inherit', marginTop: '0.25rem' }}>
                Go to Attendance <ArrowRight size={14} />
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {sortedMy.map(rec => <DayRow key={rec.id} rec={rec} />)}
          </div>
        )}
      </main>
    </div>
  );
}
