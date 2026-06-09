'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useApp } from '@/context/AppContext';
import api from '@/lib/api';
import styles from '../page.module.css';
import CustomTimePicker from '@/components/CustomTimePicker';
import {
  Clock, Sun, Moon, Timer, UserCheck, Zap, Shield, CheckCircle,
  Bell, Mail, Save, Info, ClipboardList, TrendingUp, ChevronDown, ChevronUp,
} from 'lucide-react';

// ── Reusable Redesigned Controls ────────────────────────────────────────────────

// Custom Toggle Switch
function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <div
      onClick={disabled ? undefined : onChange}
      style={{
        width: '46px',
        height: '24px',
        borderRadius: '12px',
        background: checked ? 'var(--accent-green)' : 'var(--border)',
        position: 'relative',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.25s ease',
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0 2px',
        opacity: disabled ? 0.6 : 1,
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
      }}
    >
      <div
        style={{
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
          transform: checked ? 'translateX(22px)' : 'translateX(0px)',
          transition: 'transform 0.25s cubic-bezier(0.25, 1, 0.5, 1)',
        }}
      />
    </div>
  );
}

// Redesigned Row Component for Toggles
function BoolRow({
  label,
  hint,
  recommended,
  checked,
  onChange,
  disabled
}: {
  label: string;
  hint?: string;
  recommended?: boolean;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0.9rem 1.25rem',
      borderRadius: '12px',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      marginBottom: '0.75rem',
      transition: 'all 0.2s ease',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', paddingRight: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{label}</span>
          {recommended && (
            <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--accent-green)', background: 'var(--accent-green)15', padding: '0.15rem 0.45rem', borderRadius: '4px', letterSpacing: '0.05em' }}>REC</span>
          )}
        </div>
        {hint && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{hint}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
        <ToggleSwitch checked={checked} onChange={onChange} disabled={disabled} />
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: checked ? 'var(--accent-green)' : 'var(--text-secondary)', minWidth: '28px' }}>
          {checked ? 'ON' : 'OFF'}
        </span>
      </div>
    </div>
  );
}

// Time input control wrapping CustomTimePicker
function TimeControl({
  label,
  hint,
  value,
  onChange
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '0.4rem',
      padding: '1rem 1.25rem',
      background: 'var(--surface)',
      borderRadius: '12px',
      border: '1px solid var(--border)',
    }}>
      <CustomTimePicker label={label} value={value} onChange={onChange} />
      {hint && <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{hint}</span>}
    </div>
  );
}

// Number input control with label, icon, and unit
function NumControl({
  label,
  hint,
  value,
  onChange,
  min,
  max,
  unit
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  min?: number;
  max?: number;
  unit: string;
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '0.4rem',
      padding: '1rem 1.25rem',
      background: 'var(--surface)',
      borderRadius: '12px',
      border: '1px solid var(--border)',
    }}>
      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1 }}>
          <Timer size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-secondary)', opacity: 0.7 }} />
          <input
            type="number"
            value={value || '0'}
            onChange={e => onChange(e.target.value)}
            min={min}
            max={max}
            style={{
              padding: '0.55rem 1rem 0.55rem 2.2rem',
              borderRadius: '8px',
              border: '1.5px solid var(--border)',
              background: 'var(--surface-hover)',
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
              fontWeight: 700,
              width: '100%',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
          />
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>{unit}</span>
      </div>
      {hint && <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{hint}</span>}
    </div>
  );
}

// Module Header Component
function ModuleHeader({
  icon,
  title,
  description,
  color,
  moduleKey,
  keys,
  isDirty,
  onSave,
  isSaving
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  moduleKey: string;
  keys: string[];
  isDirty: boolean;
  onSave: () => void;
  isSaving: boolean;
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '1.5rem',
      paddingBottom: '1rem',
      borderBottom: '1px solid var(--border)',
      flexWrap: 'wrap',
      gap: '1rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: `${color}15`,
          color: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          {icon}
        </div>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{title}</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0' }}>{description}</p>
        </div>
      </div>
      {isDirty && (
        <button
          onClick={onSave}
          disabled={isSaving}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 1.25rem',
            borderRadius: '10px',
            background: color,
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: '0.8rem',
            boxShadow: `0 4px 14px ${color}35`,
            transition: 'opacity 0.2s, transform 0.1s',
            opacity: isSaving ? 0.7 : 1,
          }}
          className="save-settings-btn"
        >
          <Save size={15} />
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      )}
    </div>
  );
}

// Collapsible Guide/Preview Card
function CollapsiblePreview({
  title,
  color,
  bgColor,
  borderColor,
  icon = <Info size={16} />,
  children
}: {
  title: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{
      background: bgColor,
      borderRadius: '12px',
      padding: '1rem 1.25rem',
      marginTop: '1.25rem',
      border: `1px dashed ${borderColor}`,
      display: 'flex',
      flexDirection: 'column',
      transition: 'all 0.3s ease',
    }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          width: '100%',
          outline: 'none',
          color: color,
          fontWeight: 700,
          fontSize: '0.85rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {icon}
          {title}
        </div>
        <span style={{ display: 'flex', alignItems: 'center', color: color }}>
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>
      
      {isOpen && (
        <div style={{
          marginTop: '0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Main Content Component ───────────────────────────────────────────────────

function SystemSettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentUser, showToast } = useApp();

  const [cfg, setCfg] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [savingModule, setSavingModule] = useState<string | null>(null);

  // Active tab state
  const [activeTab, setActiveTab] = useState<'attendance' | 'permission' | 'notification'>('attendance');

  const cv = (key: string) => draft[key] ?? cfg[key] ?? '';
  const setBool = (key: string, val: boolean) => setDraft(p => ({ ...p, [key]: val ? 'true' : 'false' }));
  const setVal  = (key: string, val: string)  => setDraft(p => ({ ...p, [key]: val }));
  const isModuleDirty = (keys: string[]) => keys.some(k => draft[k] !== undefined && draft[k] !== cfg[k]);

  const loadConfigs = useCallback(async () => {
    try {
      const res = await api.get('/configs');
      if (res.data?.success) {
        const map: Record<string, string> = {};
        res.data.data.forEach((c: { key: string; value: string }) => { map[c.key] = c.value; });
        setCfg(map);
        setDraft({});
      }
    } catch { showToast('Error', 'Failed to load settings', 'error'); }
  }, [showToast]);

  useEffect(() => { loadConfigs(); }, [loadConfigs]);

  // Tab Sync from Search Params
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'attendance' || tab === 'permission' || tab === 'notification') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tabId: 'attendance' | 'permission' | 'notification') => {
    setActiveTab(tabId);
    const params = new URLSearchParams(window.location.search);
    params.set('tab', tabId);
    router.push(`${window.location.pathname}?${params.toString()}`);
  };

  const saveModule = async (moduleKey: string, keys: string[]) => {
    const dirty = keys.filter(k => draft[k] !== undefined && draft[k] !== cfg[k]);
    if (!dirty.length) return;
    setSavingModule(moduleKey);
    try {
      await api.put('/configs/batch', { configs: dirty.map(k => ({ key: k, value: draft[k] })) });
      setCfg(prev => { const next = { ...prev }; dirty.forEach(k => { next[k] = draft[k]; }); return next; });
      setDraft(prev => { const next = { ...prev }; dirty.forEach(k => { delete next[k]; }); return next; });
      showToast('Saved', `${moduleKey} settings saved`, 'success');
    } catch { showToast('Error', 'Failed to save settings', 'error'); }
    finally { setSavingModule(null); }
  };

  const ATTENDANCE_KEYS = ['officeStartTime','gracePeriodMinutes','officeEndTime','fullDayHours','halfDayHours','autoAbsentTime','countLateAsPresent','allowAdminOverride','allowTLOverride'];
  const PERMISSION_KEYS = ['maxPermissionHours','approvalRequired','allowBackdated','reasonMandatory','permissionAffects'];
  const NOTIFICATION_KEYS = ['notifyLateCheckIn','notifyMissedCheckIn','notifyCheckOutReminder','notifyPermSubmitted','notifyPermApproved','notifyPermRejected','notifyTaskAssigned','notifyTaskDueToday','notifyTaskOverdue','notifyTaskCompleted','notifyLeadAssigned','notifyLeadConverted','notifyLeadLost','enableInApp'];

  if (currentUser?.role !== 'SUPER_ADMIN' && currentUser?.role !== 'ADMIN') {
    return (
      <div className={styles.wrapper}>
        <Sidebar />
        <main className={styles.main}>
          <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', marginTop: '2rem' }}>
            <h2 style={{ color: 'var(--accent-red)' }}>Access Denied</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Only administrators can access System Settings.</p>
          </div>
        </main>
      </div>
    );
  }

  // ── Derived logic preview values ──────────────────────────────────────────
  const startT = cv('officeStartTime') || '10:00';
  const graceM = parseInt(cv('gracePeriodMinutes') || '15');
  const [sh, sm] = startT.split(':').map(Number);
  const graceMin = sh * 60 + sm + graceM;
  const graceH = Math.floor(graceMin / 60).toString().padStart(2, '0');
  const graceS = (graceMin % 60).toString().padStart(2, '0');
  const graceCutoff = `${graceH}:${graceS}`;
  const fmt12 = (t: string) => {
    if (!t) return '—';
    const [h, m] = t.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return '—';
    const p = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, '0')} ${p}`;
  };

  // Tab configurations
  const tabs = [
    { id: 'attendance', label: 'Attendance', icon: <Clock size={16} />, color: 'var(--primary)' },
    { id: 'permission', label: 'Permission Module', icon: <Shield size={16} />, color: '#8B5CF6' },
    { id: 'notification', label: 'Notification Module', icon: <Bell size={16} />, color: 'var(--accent-yellow)' },
  ] as const;

  const activeIndex = tabs.findIndex(t => t.id === activeTab);

  // Style for sliding tab indicator
  const slidingIndicatorStyle = {
    position: 'absolute' as const,
    zIndex: 1,
    width: '200px',
    top: '4px',
    bottom: '4px',
    left: '4px',
    borderRadius: '8px',
    background: 'var(--surface)',
    boxShadow: 'var(--shadow)',
    transition: 'transform 0.35s cubic-bezier(0.25, 1, 0.5, 1)',
    transform: `translateX(${activeIndex * 200}px)`,
  };

  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <main className={styles.main}>
        <Header title="System Settings" subtitle="Attendance, permission & notification rules" />

        {/* Sliding Segment Tab Bar */}
        <div style={{ overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '2rem', width: '100%', scrollbarWidth: 'none' }}>
          <div style={{ display: 'flex', position: 'relative', background: 'var(--secondary-bg)', padding: '4px', borderRadius: '12px', width: '608px', flexShrink: 0 }}>
            <div style={slidingIndicatorStyle} />
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  style={{
                    width: '200px',
                    height: '42px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'transparent',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    position: 'relative',
                    zIndex: 2,
                    transition: 'color 0.25s ease',
                  }}
                >
                  <span style={{ color: isActive ? tab.color : 'var(--text-secondary)', transition: 'color 0.25s ease', display: 'flex', alignItems: 'center' }}>{tab.icon}</span>
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content Panels */}
        <div className="animate-fade-in">
          
          {/* Attendance Panel */}
          {activeTab === 'attendance' && (
            <div className="glass-card" style={{ padding: '2rem' }}>
              <ModuleHeader
                icon={<Clock size={22} />}
                title="Attendance Module"
                description=""
                color="var(--primary)"
                moduleKey="Attendance"
                keys={ATTENDANCE_KEYS}
                isDirty={isModuleDirty(ATTENDANCE_KEYS)}
                onSave={() => saveModule('Attendance', ATTENDANCE_KEYS)}
                isSaving={savingModule === 'Attendance'}
              />

              {/* Timings Section */}
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sun size={14} /> Shift & Office Timings
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  <TimeControl label="Office Start Time" hint="Check-ins before this are marked present" value={cv('officeStartTime')} onChange={v => setVal('officeStartTime', v)} />
                  <NumControl label="Grace Period" hint="Minutes allowed after start time before being marked late" value={cv('gracePeriodMinutes')} onChange={v => setVal('gracePeriodMinutes', v)} min={0} max={60} unit="mins" />
                  <TimeControl label="Office End Time" hint="Standard shift departure time" value={cv('officeEndTime')} onChange={v => setVal('officeEndTime', v)} />
                </div>

                {/* Real-time Timings Logic preview */}
                <CollapsiblePreview
                  title="Real-time Shift Logic Preview"
                  color="var(--primary)"
                  bgColor="var(--primary-light)"
                  borderColor="var(--primary)"
                >
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    Office Start Time: <strong style={{ color: 'var(--text-primary)' }}>{fmt12(startT)}</strong> &nbsp;·&nbsp; Grace Period: <strong style={{ color: 'var(--text-primary)' }}>{graceM} mins</strong> &nbsp;→&nbsp; Late check-in cutoff: <strong style={{ color: 'var(--accent-red)' }}>{fmt12(graceCutoff)}</strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                      <span>Check-in <strong style={{ color: 'var(--text-primary)' }}>&le; {fmt12(startT)}</strong></span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '20px', background: 'var(--accent-green)15', color: 'var(--accent-green)' }}>PRESENT</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
                      <span>Check-in <strong style={{ color: 'var(--text-primary)' }}>&gt; {fmt12(startT)}</strong> and <strong style={{ color: 'var(--text-primary)' }}>&le; {fmt12(graceCutoff)}</strong></span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '20px', background: 'var(--accent-green)15', color: 'var(--accent-green)' }}>PRESENT (Grace Period)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
                      <span>Check-in <strong style={{ color: 'var(--text-primary)' }}>&gt; {fmt12(graceCutoff)}</strong></span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '20px', background: 'var(--accent-red)15', color: 'var(--accent-red)' }}>LATE</span>
                    </div>
                  </div>
                </CollapsiblePreview>
              </div>

              {/* Working Hours Section */}
              <div style={{ marginBottom: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Timer size={14} /> Working Hour Rules
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  <NumControl label="Full Day Hours" hint="Minimum duration required to receive full day attendance" value={cv('fullDayHours')} onChange={v => setVal('fullDayHours', v)} min={1} max={24} unit="hours" />
                  <NumControl label="Half Day Hours" hint="Minimum duration required to receive half day attendance" value={cv('halfDayHours')} onChange={v => setVal('halfDayHours', v)} min={1} max={12} unit="hours" />
                </div>

                {/* Working Hours logic preview */}
                <CollapsiblePreview
                  title="Working Hours Calculation"
                  color="var(--accent-yellow)"
                  bgColor="rgba(245, 158, 11, 0.08)"
                  borderColor="var(--accent-yellow)"
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                      <span>Total hours worked <strong style={{ color: 'var(--text-primary)' }}>&ge; {cv('fullDayHours') || 8}h</strong></span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '20px', background: 'var(--accent-green)15', color: 'var(--accent-green)' }}>FULL DAY PRESENT</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
                      <span>Total hours worked <strong style={{ color: 'var(--text-primary)' }}>{cv('halfDayHours') || 4}h – {parseInt(cv('fullDayHours') || '8') - 1}h 59m</strong></span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '20px', background: 'var(--accent-yellow)15', color: 'var(--accent-yellow)' }}>HALF DAY PRESENT</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
                      <span>Total hours worked <strong style={{ color: 'var(--text-primary)' }}>&lt; {cv('halfDayHours') || 4}h</strong></span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '20px', background: 'var(--accent-red)15', color: 'var(--accent-red)' }}>ABSENT</span>
                    </div>
                  </div>
                </CollapsiblePreview>
              </div>

              {/* Auto Absent & Override Rules */}
              <div style={{ marginBottom: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Moon size={14} /> Auto Absent Rule
                    </h4>
                    <TimeControl label="Auto Mark Absent Time" hint="Cutoff time when unchecked employees are marked absent" value={cv('autoAbsentTime')} onChange={v => setVal('autoAbsentTime', v)} />

                    {/* Auto Absent logic preview */}
                    <CollapsiblePreview
                      title="Auto-Mark Absent Rule"
                      color="var(--accent-red)"
                      bgColor="rgba(239, 68, 68, 0.08)"
                      borderColor="var(--accent-red)"
                    >
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        If an employee has not checked in by <strong style={{ color: 'var(--text-primary)' }}>{fmt12(cv('autoAbsentTime') || '12:00')}</strong>, the system will automatically mark their attendance status as <strong style={{ color: 'var(--accent-red)' }}>ABSENT</strong> for the day.
                      </div>
                    </CollapsiblePreview>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <UserCheck size={14} /> Administrative Overrides
                    </h4>
                    <BoolRow label="Allow Admin Override" hint="Administrators can manually edit any attendance record" checked={cv('allowAdminOverride') === 'true'} onChange={() => setBool('allowAdminOverride', cv('allowAdminOverride') !== 'true')} recommended />
                    <BoolRow label="Allow Team Leader Override" hint="Team leaders can edit attendance for their team members" checked={cv('allowTLOverride') === 'true'} onChange={() => setBool('allowTLOverride', cv('allowTLOverride') !== 'true')} />
                  </div>
                </div>
              </div>

              {/* Dashboard settings */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Zap size={14} /> Dashboard Metrics Settings
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
                  <div>
                    <BoolRow label="Count Late Employees as Present" hint="Include LATE employees in the Present count for dashboard statistics" checked={cv('countLateAsPresent') === 'true'} onChange={() => setBool('countLateAsPresent', cv('countLateAsPresent') !== 'true')} recommended />
                  </div>
                  <div>
                    {/* Dashboard Logic Preview */}
                    <CollapsiblePreview
                      title="Dashboard Metric Calculation"
                      color="var(--primary)"
                      bgColor="var(--primary-light)"
                      borderColor="var(--primary)"
                    >
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        {cv('countLateAsPresent') === 'true' ? (
                          <span>
                            <strong style={{ color: 'var(--accent-green)' }}>INCLUSIVE METRICS:</strong> Late employees are included in the overall "Present" count on the dashboard.
                            <br />
                            Example: 25 Present + 5 Late → Dashboard shows <strong style={{ color: 'var(--text-primary)' }}>30 Present</strong>.
                          </span>
                        ) : (
                          <span>
                            <strong style={{ color: 'var(--text-secondary)' }}>STRICT METRICS:</strong> Late employees are tracked strictly as a separate category.
                            <br />
                            Example: 25 Present + 5 Late → Dashboard shows <strong style={{ color: 'var(--text-primary)' }}>25 Present</strong> and <strong style={{ color: 'var(--text-primary)' }}>5 Late</strong>.
                          </span>
                        )}
                      </div>
                    </CollapsiblePreview>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Permission Panel */}
          {activeTab === 'permission' && (
            <div className="glass-card" style={{ padding: '2rem' }}>
              <ModuleHeader
                icon={<Shield size={22} />}
                title="Permission Module"
                description=""
                color="#8B5CF6"
                moduleKey="Permission"
                keys={PERMISSION_KEYS}
                isDirty={isModuleDirty(PERMISSION_KEYS)}
                onSave={() => saveModule('Permission', PERMISSION_KEYS)}
                isSaving={savingModule === 'Permission'}
              />

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#8B5CF6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={14} /> Permission Rules
                  </h4>
                  <NumControl
                    label="Max Permission Hours Per Day"
                    hint="Maximum duration an employee can request as permission in a single day"
                    value={cv('maxPermissionHours')}
                    onChange={v => setVal('maxPermissionHours', v)}
                    min={1} max={8} unit="hours"
                  />

                  {/* Daily Limit logic preview */}
                  <CollapsiblePreview
                    title="Daily Limit Validation"
                    color="#8B5CF6"
                    bgColor="rgba(139, 92, 246, 0.08)"
                    borderColor="#8B5CF6"
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                        <span>Request duration <strong style={{ color: 'var(--text-primary)' }}>&le; {cv('maxPermissionHours') || 2} hours</strong></span>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '20px', background: 'var(--accent-green)15', color: 'var(--accent-green)' }}>ALLOWED TO SUBMIT</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
                        <span>Request duration <strong style={{ color: 'var(--text-primary)' }}>&gt; {cv('maxPermissionHours') || 2} hours</strong></span>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '20px', background: 'var(--accent-red)15', color: 'var(--accent-red)' }}>BLOCKED</span>
                      </div>
                    </div>
                  </CollapsiblePreview>
                </div>

                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#8B5CF6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle size={14} /> Approval Flow
                  </h4>
                  <BoolRow label="Approval Required" hint="Requests must be approved by TL or Admin before taking effect" checked={cv('approvalRequired') === 'true'} onChange={() => setBool('approvalRequired', cv('approvalRequired') !== 'true')} recommended />
                  <BoolRow label="Allow Backdated Permission" hint="Employees can submit permission requests for past dates" checked={cv('allowBackdated') === 'true'} onChange={() => setBool('allowBackdated', cv('allowBackdated') !== 'true')} />
                  <BoolRow label="Reason Mandatory" hint="Employees must write a reason when submitting permission requests" checked={cv('reasonMandatory') === 'true'} onChange={() => setBool('reasonMandatory', cv('reasonMandatory') !== 'true')} recommended />

                  {/* Workflow logic preview */}
                  <CollapsiblePreview
                    title="Workflow & Backdating Rules"
                    color="#8B5CF6"
                    bgColor="rgba(139, 92, 246, 0.08)"
                    borderColor="#8B5CF6"
                  >
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      {cv('approvalRequired') === 'true' ? (
                        <span>
                          <strong style={{ color: 'var(--accent-yellow)' }}>APPROVAL REQUIRED:</strong> Requests will enter a pending state and must be manually approved by a <strong style={{ color: 'var(--text-primary)' }}>Team Leader</strong> or <strong style={{ color: 'var(--text-primary)' }}>Admin</strong> before being applied.
                        </span>
                      ) : (
                        <span>
                          <strong style={{ color: 'var(--accent-green)' }}>AUTO-APPROVAL:</strong> Requests will bypass the manager approval queue and be <strong style={{ color: 'var(--accent-green)' }}>automatically approved</strong> immediately upon submission.
                        </span>
                      )}
                    </div>
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      {cv('allowBackdated') === 'true' ? (
                        <span>
                          <strong style={{ color: 'var(--accent-green)' }}>BACKDATING ALLOWED (Example):</strong> Today is June 9. An employee who checked in late yesterday (June 8) <strong style={{ color: 'var(--accent-green)' }}>CAN</strong> submit a permission request today for June 8 to clear their late status.
                        </span>
                      ) : (
                        <span>
                          <strong style={{ color: 'var(--accent-red)' }}>BACKDATING BLOCKED (Example):</strong> Today is June 9. An employee wants to submit a request for yesterday (June 8). The system <strong style={{ color: 'var(--accent-red)' }}>BLOCKS</strong> the request. They can only request permissions for today or future dates.
                        </span>
                      )}
                    </div>
                  </CollapsiblePreview>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#8B5CF6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Zap size={14} /> Permission Impact
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
                  <div>
                    <BoolRow label="Permission Affects Attendance" hint="Approved permissions correct attendance status (LATE → PRESENT, ABSENT → LEAVE)" checked={cv('permissionAffects') === 'true'} onChange={() => setBool('permissionAffects', cv('permissionAffects') !== 'true')} recommended />
                  </div>
                  <div>
                    {/* Attendance impact logic preview */}
                    <CollapsiblePreview
                      title="Attendance Integration"
                      color="#8B5CF6"
                      bgColor="rgba(139, 92, 246, 0.08)"
                      borderColor="#8B5CF6"
                    >
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        {cv('permissionAffects') === 'true' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div>
                              <strong style={{ color: 'var(--accent-green)' }}>ACTIVE INTEGRATION:</strong> Approved permissions will correct the employee&apos;s attendance status.
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                <span>Late check-in + Approved permission</span>
                                <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '20px', background: 'var(--accent-green)15', color: 'var(--accent-green)' }}>PRESENT</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
                                <span>Absent + Approved permission</span>
                                <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '20px', background: 'var(--primary)15', color: 'var(--primary)' }}>LEAVE</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <strong style={{ color: 'var(--text-muted)' }}>ISOLATED RULES:</strong> Approved permissions are tracked purely for records and do <strong style={{ color: 'var(--accent-red)' }}>not</strong> update or override the calculated attendance status.
                          </div>
                        )}
                      </div>
                    </CollapsiblePreview>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Notification Panel */}
          {activeTab === 'notification' && (
            <div className="glass-card" style={{ padding: '2rem' }}>
              <ModuleHeader
                icon={<Bell size={22} />}
                title="Notification Module"
                description=""
                color="var(--accent-yellow)"
                moduleKey="Notification"
                keys={NOTIFICATION_KEYS}
                isDirty={isModuleDirty(NOTIFICATION_KEYS)}
                onSave={() => saveModule('Notification', NOTIFICATION_KEYS)}
                isSaving={savingModule === 'Notification'}
              />

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                
                {/* Attendance Alerts Card */}
                <div style={{
                  background: 'var(--surface)',
                  borderRadius: '16px',
                  border: '1px solid var(--border)',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '0.5rem' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '8px', background: 'var(--primary)15', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                      <Clock size={18} />
                    </div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 850, color: 'var(--text-primary)', margin: 0 }}>Attendance Alerts</h4>
                  </div>
                  <BoolRow label="Late Check-In Alert" hint="Notify managers/admins when an employee check-in is late" checked={cv('notifyLateCheckIn') === 'true'} onChange={() => setBool('notifyLateCheckIn', cv('notifyLateCheckIn') !== 'true')} recommended />
                  <BoolRow label="Missed Check-In Alert" hint="Notify employee when auto-marked absent due to no check-in" checked={cv('notifyMissedCheckIn') === 'true'} onChange={() => setBool('notifyMissedCheckIn', cv('notifyMissedCheckIn') !== 'true')} recommended />
                  <BoolRow label="Check-Out Reminder" hint="Remind employees who forget to check out before office end time" checked={cv('notifyCheckOutReminder') === 'true'} onChange={() => setBool('notifyCheckOutReminder', cv('notifyCheckOutReminder') !== 'true')} />
                </div>

                {/* Permission Alerts Card */}
                <div style={{
                  background: 'var(--surface)',
                  borderRadius: '16px',
                  border: '1px solid var(--border)',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '0.5rem' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '8px', background: 'rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B5CF6' }}>
                      <Shield size={18} />
                    </div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 850, color: 'var(--text-primary)', margin: 0 }}>Permission Alerts</h4>
                  </div>
                  <BoolRow label="Permission Submitted" hint="Notify TL/Admin when an employee requests permission" checked={cv('notifyPermSubmitted') === 'true'} onChange={() => setBool('notifyPermSubmitted', cv('notifyPermSubmitted') !== 'true')} recommended />
                  <BoolRow label="Permission Approved" hint="Notify employee when their permission request is approved" checked={cv('notifyPermApproved') === 'true'} onChange={() => setBool('notifyPermApproved', cv('notifyPermApproved') !== 'true')} recommended />
                  <BoolRow label="Permission Rejected" hint="Notify employee when their permission request is rejected" checked={cv('notifyPermRejected') === 'true'} onChange={() => setBool('notifyPermRejected', cv('notifyPermRejected') !== 'true')} recommended />
                </div>

                {/* Task Alerts Card */}
                <div style={{
                  background: 'var(--surface)',
                  borderRadius: '16px',
                  border: '1px solid var(--border)',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '0.5rem' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-green)' }}>
                      <ClipboardList size={18} />
                    </div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 850, color: 'var(--text-primary)', margin: 0 }}>Task Alerts</h4>
                  </div>
                  <BoolRow label="Task Assigned" hint="Notify employee when a new task is assigned to them" checked={cv('notifyTaskAssigned') === 'true'} onChange={() => setBool('notifyTaskAssigned', cv('notifyTaskAssigned') !== 'true')} recommended />
                  <BoolRow label="Task Due Today" hint="Morning reminder for tasks due to be completed today" checked={cv('notifyTaskDueToday') === 'true'} onChange={() => setBool('notifyTaskDueToday', cv('notifyTaskDueToday') !== 'true')} recommended />
                  <BoolRow label="Task Overdue" hint="Alert when a task passes its completion date without finishing" checked={cv('notifyTaskOverdue') === 'true'} onChange={() => setBool('notifyTaskOverdue', cv('notifyTaskOverdue') !== 'true')} recommended />
                  <BoolRow label="Task Completed" hint="Notify task creator when an assigned task is marked complete" checked={cv('notifyTaskCompleted') === 'true'} onChange={() => setBool('notifyTaskCompleted', cv('notifyTaskCompleted') !== 'true')} />
                </div>

                {/* Lead Alerts Card */}
                <div style={{
                  background: 'var(--surface)',
                  borderRadius: '16px',
                  border: '1px solid var(--border)',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '0.5rem' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)' }}>
                      <TrendingUp size={18} />
                    </div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 850, color: 'var(--text-primary)', margin: 0 }}>Lead Alerts</h4>
                  </div>
                  <BoolRow label="Lead Assigned" hint="Notify when a new lead is created or assigned to staff" checked={cv('notifyLeadAssigned') === 'true'} onChange={() => setBool('notifyLeadAssigned', cv('notifyLeadAssigned') !== 'true')} recommended />
                  <BoolRow label="Lead Converted" hint="Notify when a lead is successfully converted to a client" checked={cv('notifyLeadConverted') === 'true'} onChange={() => setBool('notifyLeadConverted', cv('notifyLeadConverted') !== 'true')} recommended />
                  <BoolRow label="Lead Lost / Dropped" hint="Notify when a lead is marked as DROPPED or LOST" checked={cv('notifyLeadLost') === 'true'} onChange={() => setBool('notifyLeadLost', cv('notifyLeadLost') !== 'true')} />
                </div>

                {/* Delivery Channels Card */}
                <div style={{
                  background: 'var(--surface)',
                  borderRadius: '16px',
                  border: '1px solid var(--border)',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '0.5rem' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-yellow)' }}>
                      <Mail size={18} />
                    </div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 850, color: 'var(--text-primary)', margin: 0 }}>Delivery Channels</h4>
                  </div>
                  <BoolRow label="In-App Notifications" hint="Show notifications inside the CRM dashboard top bar" checked={cv('enableInApp') === 'true'} onChange={() => setBool('enableInApp', cv('enableInApp') !== 'true')} recommended />
                </div>

              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

export default function SystemSettingsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SystemSettingsContent />
    </Suspense>
  );
}
