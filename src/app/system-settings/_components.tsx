'use client';
import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Save, Info, Clock, Shield, Bell } from 'lucide-react';
import api from '@/lib/api';
import { useApp } from '@/context/AppContext';
import CustomTimePicker from '@/components/CustomTimePicker';

// ── Config state hook ─────────────────────────────────────────────────────────

export function useConfigStore() {
  const { showToast } = useApp();
  const [cfg, setCfg] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [savingModule, setSavingModule] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const cv = (key: string) => draft[key] ?? cfg[key] ?? '';
  const setBool = (key: string, val: boolean) => setDraft(p => ({ ...p, [key]: val ? 'true' : 'false' }));
  const setVal  = (key: string, val: string)  => setDraft(p => ({ ...p, [key]: val }));
  const isModuleDirty = (keys: string[]) => keys.some(k => draft[k] !== undefined && draft[k] !== cfg[k]);

  const loadConfigs = useCallback(async () => {
    if (loaded) return;
    try {
      const res = await api.get('/configs');
      if (res.data?.success) {
        const map: Record<string, string> = {};
        res.data.data.forEach((c: { key: string; value: string }) => { map[c.key] = c.value; });
        setCfg(map);
        setDraft({});
        setLoaded(true);
      }
    } catch { showToast('Error', 'Failed to load settings', 'error'); }
  }, [loaded, showToast]);

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

  return { cfg, draft, cv, setBool, setVal, isModuleDirty, saveModule, savingModule, loadConfigs };
}

// ── Reusable Redesigned Controls ────────────────────────────────────────────────

// Custom Toggle Switch
export function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
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
export function BoolRow({
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

// Time input control with label and icon
export function TimeControl({
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
export function NumControl({
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
          <Clock size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-secondary)', opacity: 0.7 }} />
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
export function ModuleHeader({
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

// ── Shared Tab Navigation ────────────────────────────────────────────────────

export function TabNavigation({ activeTab }: { activeTab: 'attendance' | 'permission' | 'notification' }) {
  const tabs = [
    { id: 'attendance', label: 'Attendance', href: '/system-settings/attendance', icon: <Clock size={16} />, color: 'var(--primary)' },
    { id: 'permission', label: 'Permission Module', href: '/system-settings/permission', icon: <Shield size={16} />, color: '#8B5CF6' },
    { id: 'notification', label: 'Notification Module', href: '/system-settings/notification', icon: <Bell size={16} />, color: 'var(--accent-yellow)' },
  ] as const;

  const activeIndex = tabs.findIndex(t => t.id === activeTab);

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
    <div style={{ overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '2rem', width: '100%', scrollbarWidth: 'none' }}>
      <div style={{ display: 'flex', position: 'relative', background: 'var(--secondary-bg)', padding: '4px', borderRadius: '12px', width: '608px', flexShrink: 0 }}>
        <div style={slidingIndicatorStyle} />
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={tab.href}
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
                textDecoration: 'none',
              }}
            >
              <span style={{ color: isActive ? tab.color : 'var(--text-secondary)', transition: 'color 0.25s ease', display: 'flex', alignItems: 'center' }}>
                {tab.icon}
              </span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
