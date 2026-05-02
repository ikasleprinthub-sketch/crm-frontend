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
      <div className={styles.filterInputWrapper}>
        <CalendarIcon size={16} className={styles.filterInputIcon} />
        <DatePicker
          selected={selected}
          onChange={onChange}
          placeholderText={placeholder}
          className={styles.filterInput}
          dateFormat="dd/MM/yyyy"
          isClearable
          showPopperArrow={false}
          popperPlacement="bottom-start"
          // We'll style the fixed calendar class in standard CSS
          calendarClassName={styles.premiumCalendar}
          dayClassName={() => styles.premiumDay}
        />
      </div>
    </div>
  );
}
