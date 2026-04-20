'use client';
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import styles from '../app/page.module.css';

interface Option {
  id: string;
  name: string;
}

interface CustomSelectProps {
  label?: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  icon?: React.ReactNode;
  placeholder?: string;
  size?: 'sm' | 'md';
}

export default function CustomSelect({ label, options, value, onChange, icon, placeholder = 'Select...', size = 'md' }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.id === value);
  const filteredOptions = options.filter(o => 
    o.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`${styles.customSelectContainer} ${size === 'sm' ? styles.sm : ''}`} ref={containerRef}>
      {label && <label className={styles.filterLabel}>{label}</label>}
      
      <div 
        className={`${styles.customSelectTrigger} ${isOpen ? styles.active : ''} ${size === 'sm' ? styles.smTrigger : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className={styles.triggerContent}>
          {icon && <span className={styles.triggerIcon}>{icon}</span>}
          <span className={styles.triggerText}>
            {selectedOption ? selectedOption.name : placeholder}
          </span>
        </div>
        <ChevronDown size={size === 'sm' ? 14 : 16} className={`${styles.chevron} ${isOpen ? styles.rotate : ''}`} />
      </div>

      {isOpen && (
        <div className={styles.customSelectMenu}>
          {options.length > 8 && (
            <div className={styles.selectSearchWrapper}>
              <Search size={14} />
              <input 
                type="text" 
                placeholder="Search..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
          )}
          <div className={styles.optionsList}>
            {filteredOptions.length === 0 && (
              <div className={styles.noOptions}>No results found</div>
            )}
            {filteredOptions.map((option) => (
              <div 
                key={option.id}
                className={`${styles.optionItem} ${value === option.id ? styles.selected : ''}`}
                onClick={() => {
                  onChange(option.id);
                  setIsOpen(false);
                  setSearch('');
                }}
              >
                {option.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
