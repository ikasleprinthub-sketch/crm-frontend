'use client';
import { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useApp } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import { Bell, Search, Moon, Sun, User, Settings, LogOut, ChevronRight } from 'lucide-react';
import styles from './Header.module.css';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

const mockNotifications = [
  { id: '1', text: 'New lead assigned: John Doe', time: '5m ago', type: 'lead' },
  { id: '2', text: 'Task "Client Follow-up" completed', time: '1h ago', type: 'task' },
  { id: '3', text: 'Monthly sales report is ready', time: '2h ago', type: 'report' },
];

export default function Header({ title, subtitle }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { currentUser, logout } = useApp();
  const router = useRouter();
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotif(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfile(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className={styles.header}>
      <div>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>

      <div className={styles.actions}>
        {/* Search */}
        <div className={styles.searchBox}>
          <Search size={16} className={styles.searchIcon} />
          <input type="text" placeholder="Search anything..." className={styles.searchInput} />
        </div>

        {/* Theme Toggle */}
        <button className={styles.actionBtn} onClick={toggleTheme} title="Toggle theme">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notifications */}
        <div className={styles.popoverWrapper} ref={notifRef}>
          <button 
            className={`${styles.actionBtn} ${showNotif ? styles.active : ''}`} 
            onClick={() => { setShowNotif(!showNotif); setShowProfile(false); }}
          >
            <Bell size={18} />
            <span className={styles.notifDot}></span>
          </button>
          
          {showNotif && (
            <div className={styles.dropdown}>
              <div className={styles.dropdownHeader}>
                Notifications
                <span className={styles.count}>3 New</span>
              </div>
              <div className={styles.dropdownList}>
                {mockNotifications.map(n => (
                  <div key={n.id} className={styles.notifItem}>
                    <p className={styles.notifText}>{n.text}</p>
                    <span className={styles.notifTime}>{n.time}</span>
                  </div>
                ))}
              </div>
              <button className={styles.viewAll}>View all notifications</button>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className={styles.popoverWrapper} ref={profileRef}>
          <div 
            className={styles.avatarBtn} 
            onClick={() => { setShowProfile(!showProfile); setShowNotif(false); }}
          >
            {currentUser?.name?.slice(0, 2).toUpperCase() ?? 'AU'}
          </div>

          {showProfile && (
            <div className={`${styles.dropdown} ${styles.profileDropdown}`}>
              <div className={styles.profileHeader}>
                <div className={styles.profileAvatarLarge}>
                  {currentUser?.name?.slice(0, 2).toUpperCase() ?? 'U'}
                </div>
                <div className={styles.profileInfo}>
                  <p className={styles.profileName}>{currentUser?.name ?? 'Account'}</p>
                  <p className={styles.profileEmail}>{currentUser?.email ?? 'user@capnero.com'}</p>
                </div>
              </div>
              <div className={styles.dropdownDivider} />
              <div className={styles.profileLinks}>
                <button className={styles.profileLink} onClick={() => { setShowProfile(false); router.push('/settings'); }}>
                  <User size={16} /> My Profile <ChevronRight size={14} className={styles.chevron} />
                </button>
                <button className={styles.profileLink} onClick={() => { setShowProfile(false); router.push('/settings'); }}>
                  <Settings size={16} /> Settings <ChevronRight size={14} className={styles.chevron} />
                </button>
                <div className={styles.dropdownDivider} />
                <button className={`${styles.profileLink} ${styles.logout}`} onClick={logout}>
                  <LogOut size={16} /> Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
