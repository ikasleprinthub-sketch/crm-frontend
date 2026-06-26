'use client';
import { useState } from 'react';
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
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={styles.customSelectContainer}>
      {label && <label className={styles.filterLabel}>{label}</label>}
      <div className={styles.customSelectTrigger} style={{ padding: 0, cursor: 'text', position: 'relative', overflow: 'visible' }}>
        <label style={{ display: 'block', width: '100%', height: '100%', margin: 0, padding: 0, cursor: 'text' }}>
          <CalendarIcon size={16} className={styles.filterInputIcon} style={{ left: '16px', position: 'absolute', top: '50%', transform: 'translateY(-50%)' }} />
          <DatePicker
            selected={selected}
            onChange={(date) => { onChange(date); setIsOpen(false); }}
            onChangeRaw={(e) => {
              const target = e.target as HTMLInputElement;
              if (target && typeof target.value === 'string') {
                // Remove all non-digit characters, cap at 8 digits (DDMMYYYY)
                const digits = target.value.replace(/\D/g, '').slice(0, 8);
                let formatted = '';
                if (digits.length >= 2) {
                  formatted = digits.slice(0, 2) + '/';
                  if (digits.length >= 4) {
                    formatted += digits.slice(2, 4) + '/';
                    formatted += digits.slice(4);
                  } else {
                    formatted += digits.slice(2);
                  }
                } else {
                  formatted = digits;
                }
                target.value = formatted;
                // Hide picker as soon as user starts typing
                setIsOpen(false);
              }
            }}
            placeholderText={placeholder}
            className={styles.filterInput}
            dateFormat="dd/MM/yyyy"
            isClearable
            open={isOpen}
            onFocus={() => setIsOpen(true)}
            onClickOutside={() => setIsOpen(false)}
            showPopperArrow={false}
            popperPlacement="bottom-start"
            calendarClassName="premium-datepicker"
            dayClassName={() => "premium-day"}
          />
        </label>
      </div>
    </div>
  );
}
