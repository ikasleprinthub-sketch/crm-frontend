'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Clock, ChevronDown } from 'lucide-react';
import styles from './CustomTimePicker.module.css';

interface CustomTimePickerProps {
  label?: string;
  value: string; // "HH:mm" 24-hour
  onChange: (value: string) => void;
  required?: boolean;
}

function to12h(time24: string) {
  const [hStr, mStr] = (time24 || '10:00').split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr || '0', 10);
  if (isNaN(h)) h = 10;
  const ampm: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return { hour: h, minute: m, ampm };
}

function to24h(hour: number, minute: number, ampm: 'AM' | 'PM') {
  let h = hour;
  if (ampm === 'AM') {
    if (h === 12) h = 0;
  } else {
    if (h !== 12) h += 12;
  }
  return `${h.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

export default function CustomTimePicker({ label, value, onChange, required }: CustomTimePickerProps) {
  const [open, setOpen] = useState(false);
  const { hour, minute, ampm } = to12h(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const hourColRef = useRef<HTMLDivElement>(null);
  const minuteColRef = useRef<HTMLDivElement>(null);
  
  const hourRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const minuteRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const selectHour = (h: number) => {
    onChange(to24h(h, minute, ampm));
  };

  const selectMinute = (m: number) => {
    onChange(to24h(hour, m, ampm));
  };

  const selectAmpm = (a: 'AM' | 'PM') => {
    onChange(to24h(hour, minute, a));
  };

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [open]);

  // Scroll active item into view using local scrollTop calculations
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        // Centering Hour
        const activeHourBtn = hourRefs.current[hour];
        const hourContainer = hourColRef.current;
        if (activeHourBtn && hourContainer) {
          const offsetTop = activeHourBtn.offsetTop;
          const containerHeight = hourContainer.clientHeight;
          const elementHeight = activeHourBtn.clientHeight;
          hourContainer.scrollTop = offsetTop - (containerHeight / 2) + (elementHeight / 2);
        }

        // Centering Minute
        const activeMinuteBtn = minuteRefs.current[minute];
        const minuteContainer = minuteColRef.current;
        if (activeMinuteBtn && minuteContainer) {
          const offsetTop = activeMinuteBtn.offsetTop;
          const containerHeight = minuteContainer.clientHeight;
          const elementHeight = activeMinuteBtn.clientHeight;
          minuteContainer.scrollTop = offsetTop - (containerHeight / 2) + (elementHeight / 2);
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open, hour, minute]);

  const display = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${ampm}`;

  return (
    <div className={styles.wrap} ref={containerRef}>
      {label && <label className={styles.label}>{label}{required && ' *'}</label>}

      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.open : ''}`}
        onClick={() => setOpen(!open)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={16} className={styles.icon} />
          <span>{display}</span>
        </div>
        <ChevronDown size={14} className={styles.icon} />
      </button>

      {open && (
        <div className={styles.panel}>
          {/* Hours Column */}
          <div ref={hourColRef} className={`${styles.col} ${styles.colBorder}`}>
            {hours.map((h) => {
              const isSelected = h === hour;
              return (
                <button
                  key={h}
                  ref={(el) => { hourRefs.current[h] = el; }}
                  type="button"
                  onClick={() => selectHour(h)}
                  className={`${styles.btn} ${isSelected ? styles.btnActive : ''}`}
                >
                  {h.toString().padStart(2, '0')}
                </button>
              );
            })}
          </div>

          {/* Minutes Column */}
          <div ref={minuteColRef} className={`${styles.col} ${styles.colBorder}`}>
            {minutes.map((m) => {
              const isSelected = m === minute;
              return (
                <button
                  key={m}
                  ref={(el) => { minuteRefs.current[m] = el; }}
                  type="button"
                  onClick={() => selectMinute(m)}
                  className={`${styles.btn} ${isSelected ? styles.btnActive : ''}`}
                >
                  {m.toString().padStart(2, '0')}
                </button>
              );
            })}
          </div>

          {/* AM/PM Column */}
          <div className={styles.ampmCol}>
            {(['AM', 'PM'] as const).map((a) => {
              const isSelected = a === ampm;
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => selectAmpm(a)}
                  className={`${styles.btn} ${isSelected ? styles.btnActive : ''}`}
                >
                  {a}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
