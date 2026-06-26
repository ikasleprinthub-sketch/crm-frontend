'use client';
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import styles from '../app/page.module.css';
import { createPortal } from 'react-dom';

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
  disabled?: boolean;
}

export default function CustomSelect({ label, options, value, onChange, icon, placeholder = 'Select...', size = 'md', disabled = false }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number | null, left: number, width: number, openUp: boolean }>({
    top: null,
    left: 0,
    width: 0,
    openUp: false
  });
  const [mounted, setMounted] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  useEffect(() => {
    setMounted(true);
  }, []);

  const selectedOption = options.find(o => o.id === value);
  const filteredOptions = options.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      const initialIndex = filteredOptions.findIndex(o => o.id === value);
      setFocusedIndex(initialIndex >= 0 ? initialIndex : 0);
    } else {
      setFocusedIndex(-1);
    }
  }, [isOpen, search, value, options]);

  useEffect(() => {
    if (isOpen && menuRef.current && focusedIndex >= 0) {
      const menuEl = menuRef.current;
      const optionEls = menuEl.querySelectorAll(`.${styles.optionItem}`);
      const activeEl = optionEls[focusedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({
          block: 'nearest',
          behavior: 'auto'
        });
      }
    }
  }, [focusedIndex, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        toggleDropdown();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (filteredOptions.length > 0) {
          setFocusedIndex(prev => (prev + 1) % filteredOptions.length);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (filteredOptions.length > 0) {
          setFocusedIndex(prev => (prev - 1 + filteredOptions.length) % filteredOptions.length);
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
          onChange(filteredOptions[focusedIndex].id);
          setIsOpen(false);
          setSearch('');
          triggerRef.current?.focus();
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearch('');
        triggerRef.current?.focus();
        break;
      case 'Tab':
        setIsOpen(false);
        setSearch('');
        break;
      default:
        break;
    }
  };

  const toggleDropdown = () => {
    if (disabled) return;
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const menuHeight = 240;
      const shouldOpenUp = spaceBelow < menuHeight && rect.top > menuHeight;

      setCoords({
        top: shouldOpenUp ? rect.top : rect.bottom,
        left: rect.left,
        width: rect.width,
        openUp: shouldOpenUp
      });
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleClose = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        // If clicking outside the container, check if we're clicking inside the portal menu
        if (menuRef.current && menuRef.current.contains(target)) {
          return;
        }
        setIsOpen(false);
      }
    };
    const handleScroll = (event: Event) => {
      const target = event.target as Node;
      // Do not close the dropdown if the scroll event is within the dropdown options list
      if (menuRef.current && menuRef.current.contains(target)) {
        return;
      }
      if (isOpen) setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClose);
      window.addEventListener('scroll', handleScroll, true);
    } else {
      setCoords({ top: null, left: 0, width: 0, openUp: false });
    }
    return () => {
      document.removeEventListener('mousedown', handleClose);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  const menuElement = isOpen && coords.top !== null && mounted && (
    <div
      ref={menuRef}
      className={`${styles.customSelectMenu} ${coords.openUp ? styles.openUp : ''}`}
      style={{
        position: 'fixed',
        top: coords.openUp
          ? (coords.top as number) - 6
          : (coords.top as number) + 6,
        left: coords.left,
        width: coords.width,
        transform: coords.openUp ? 'translateY(-100%)' : 'none',
        minWidth: '220px',
        zIndex: 10005
      }}
    >
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
        {filteredOptions.map((option, index) => (
          <div
            key={option.id}
            className={`${styles.optionItem} ${value === option.id ? styles.selected : ''} ${index === focusedIndex ? styles.focused : ''}`}
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
  );

  return (
    <div
      className={`${styles.customSelectContainer} ${size === 'sm' ? styles.sm : ''} ${isOpen ? styles.isOpen : ''}`}
      ref={containerRef}
      onKeyDown={handleKeyDown}
    >
      {label && <label className={styles.filterLabel}>{label}</label>}

      <div
        ref={triggerRef}
        tabIndex={disabled ? -1 : 0}
        className={`${styles.customSelectTrigger} ${isOpen ? styles.active : ''} ${size === 'sm' ? styles.smTrigger : ''}`}
        onClick={toggleDropdown}
        style={disabled ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
      >
        <div className={styles.triggerContent}>
          {icon && <span className={styles.triggerIcon}>{icon}</span>}
          <span className={styles.triggerText}>
            {selectedOption ? selectedOption.name : placeholder}
          </span>
        </div>
        <ChevronDown size={size === 'sm' ? 14 : 16} className={`${styles.chevron} ${isOpen ? styles.rotate : ''}`} />
      </div>

      {mounted && createPortal(menuElement as React.ReactElement, document.body)}
    </div>
  );
}
