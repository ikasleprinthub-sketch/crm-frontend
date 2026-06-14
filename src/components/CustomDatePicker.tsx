'use client';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Calendar as CalendarIcon } from 'lucide-react';
import styles from '../app/page.module.css';

interface CustomDatePickerProps {
  label: string;
  selected: Date | null;
  onChange: (date: Date | null) => void; //Hi
  placeholder?: string;
}

export default function CustomDatePicker({ label, selected, onChange, placeholder = 'dd/mm/yyyy' }: CustomDatePickerProps) {
  return (
    <div className={styles.customSelectContainer}>
      {label && <label className={styles.filterLabel}>{label}</label>}
      <div className={styles.customSelectTrigger} style={{ padding: 0, cursor: 'text', position: 'relative' }}>
        <CalendarIcon size={16} className={styles.filterInputIcon} style={{ left: '16px', position: 'absolute', top: '50%', transform: 'translateY(-50%)' }} />
        <DatePicker
          selected={selected}
          onChange={onChange}
          placeholderText={placeholder}
          className={styles.filterInput}
          style={{ width: '100%', height: '100%', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 700 }}
          dateFormat="dd/MM/yyyy"
          isClearable
          showPopperArrow={false}
          popperPlacement="bottom-start"
          calendarClassName="premium-datepicker"
          dayClassName={() => "premium-day"}
        />
      </div>
    </div>
  );
}
