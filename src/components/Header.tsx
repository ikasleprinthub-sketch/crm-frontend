'use client';
import styles from './Header.module.css';
import { useTheme } from '@/context/ThemeContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className={styles.header}>
      <div>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      <div className={styles.actions}>
        <div className={styles.searchBox}>
          <span className={styles.searchIcon}>🔍</span>
          <input type="text" placeholder="Search…" className={styles.searchInput} />
        </div>
        <button className={styles.themeBtn} onClick={toggleTheme} title="Toggle theme">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <div className={styles.notifBtn}>🔔<span className={styles.notifDot}></span></div>
        <div className={styles.avatarBtn}>AU</div>
      </div>
    </header>
  );
}
