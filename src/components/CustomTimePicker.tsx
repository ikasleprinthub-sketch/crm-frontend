'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Clock } from 'lucide-react';
import styles from './CustomTimePicker.module.css';

interface CustomTimePickerProps {
  label: string;
  value: string; // "HH:mm" 24-hour
  onChange: (value: string) => void;
  required?: boolean;
}

function to12h(time24: string) {
  const [hStr, mStr] = (time24 || '09:00').split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr || '0', 10);
  const ampm: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return { hour: h, minute: m, ampm };
}

function to24h(hour: number, minute: number, ampm: 'AM' | 'PM') {
  let h = hour;
  if (ampm === 'AM') { if (h === 12) h = 0; }
  else { if (h !== 12) h += 12; }
  return `${h.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

export default function CustomTimePicker({ label, value, onChange, required }: CustomTimePickerProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const init = to12h(value);
  const [hour, setHour] = useState(init.hour);
  const [minute, setMinute] = useState(init.minute);
  const [ampm, setAmpm] = useState<'AM' | 'PM'>(init.ampm);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = to12h(value);
    setHour(p.hour); setMinute(p.minute); setAmpm(p.ampm);
  }, [value]);

  const emit = useCallback((h: number, m: number, a: 'AM' | 'PM') => {
    onChange(to24h(h, m, a));
  }, [onChange]);

  const stepHour = (dir: 1 | -1) => {
    const next = hour + dir;
    const h = next > 12 ? 1 : next < 1 ? 12 : next;
    setHour(h); emit(h, minute, ampm);
  };
  const stepMinute = (dir: 1 | -1) => {
    const next = minute + dir;
    const m = next > 59 ? 0 : next < 0 ? 59 : next;
    setMinute(m); emit(hour, m, ampm);
  };
  const toggleAmpm = (a: 'AM' | 'PM') => { setAmpm(a); emit(hour, minute, a); };

  const handleOpen = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: 200 // Fixed width for the picker
      });
    }
    setOpen(!open);
  };

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        // Also check if click is inside the fixed panel (which might be outside ref if we don't portal it)
        // Since we are using fixed pos, we should check if the click target is within the panel class
        const target = e.target as HTMLElement;
        if (!target.closest(`.${styles.panel}`)) {
          setOpen(false);
        }
      }
    };
    if (open) document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [open]);

  const display = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${ampm}`;

  return (
    <div className={styles.wrap} ref={ref}>
      <label className={styles.label}>{label}{required && ' *'}</label>

      <button type="button" className={`${styles.trigger} ${open ? styles.open : ''}`} onClick={handleOpen}>
        <Clock size={14} className={styles.icon} />
        <span>{display}</span>
      </button>

      {open && (
        <div 
          className={styles.panel}
          style={{
            position: 'fixed',
            top: coords.top - window.scrollY + 6,
            left: coords.left - window.scrollX,
            zIndex: 9999
          }}
        >
          {/* Hour */}
          <div className={styles.col} onWheel={(e) => { e.preventDefault(); stepHour(e.deltaY < 0 ? 1 : -1); }}>
            <span className={styles.val}>{hour.toString().padStart(2, '0')}</span>
            <span className={styles.unit}>HH</span>
          </div>

          <span className={styles.colon}>:</span>

          {/* Minute */}
          <div className={styles.col} onWheel={(e) => { e.preventDefault(); stepMinute(e.deltaY < 0 ? 1 : -1); }}>
            <span className={styles.val}>{minute.toString().padStart(2, '0')}</span>
            <span className={styles.unit}>MM</span>
          </div>

          {/* AM / PM */}
          <div className={styles.ampm}>
            <button type="button" className={`${styles.ap} ${ampm === 'AM' ? styles.apActive : ''}`} onClick={() => toggleAmpm('AM')}>AM</button>
            <button type="button" className={`${styles.ap} ${ampm === 'PM' ? styles.apActive : ''}`} onClick={() => toggleAmpm('PM')}>PM</button>
          </div>
        </div>
      )}
    </div>
  );
}
