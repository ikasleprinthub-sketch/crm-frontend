'use client';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Calendar as CalendarIcon } from 'lucide-react';
import styles from '../app/page.module.css';

interface CustomDatePickerProps {
  label: string;
  selected: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
}

export default function CustomDatePicker({ label, selected, onChange, placeholder = 'dd/mm/yyyy' }: CustomDatePickerProps) {
  return (
    <div className={styles.customSelectContainer}>
      <label className={styles.filterLabel}>{label}</label>
      <div className={styles.filterInputWrapper} style={{ background: 'var(--surface)', borderRadius: '14px', border: '1.5px solid var(--border)', transition: 'all 0.3s ease' }}>
        <CalendarIcon size={16} className={styles.filterInputIcon} style={{ color: 'var(--primary)' }} />
        <DatePicker
          selected={selected}
          onChange={onChange}
          placeholderText={placeholder}
          className={styles.filterInput}
          style={{ width: '100%', background: 'transparent', border: 'none', paddingLeft: '2.8rem' }}
          dateFormat="dd/MM/yyyy"
          isClearable
          showPopperArrow={false}
          popperPlacement="bottom-start"
          portalId="root"
          popperClassName="react-datepicker-popper"
          calendarClassName="premium-datepicker"
          dayClassName={() => 'premium-day'}
        />
      </div>
    </div>
  );
}
