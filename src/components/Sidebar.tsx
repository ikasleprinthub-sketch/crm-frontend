'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import styles from './Sidebar.module.css';
import { LayoutDashboard, Target, CheckSquare, Users, User, BarChart2, BellRing, LogOut } from 'lucide-react';

const navGroups = [
  {
    label: 'MAIN',
    items: [
      { label: 'Dashboard', href: '/', icon: <LayoutDashboard size={18} /> },
    ],
  },
  {
    label: 'MANAGEMENT',
    items: [
      { label: 'Leads', href: '/leads', icon: <Target size={18} /> },
      { label: 'Tasks', href: '/tasks', icon: <CheckSquare size={18} /> },
      { label: 'Users', href: '/users', icon: <Users size={18} /> },
      { label: 'Configurations', href: '/settings', icon: <BarChart2 size={18} /> },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { currentUser, logout } = useApp();

  const getFilteredGroups = () => {
    return navGroups.map(group => {
      if (group.label === 'MANAGEMENT') {
        const items = group.items.filter(item => {
          if (currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN') return true;
          if (currentUser?.role === 'EMPLOYEE') return item.label === 'Tasks';
          if (currentUser?.role === 'MANAGER') return item.label === 'Tasks' || item.label === 'Leads';
          return false;
        });
        return { ...group, items };
      }
      return group;
    }).filter(group => group.items.length > 0);
  };

  const filteredGroups = getFilteredGroups();

  return (
    <aside className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.logoRow}>
        <div className={styles.logoDot}>
          <div className={styles.dotInner}></div>
        </div>
        <span className={styles.logo}>Ikasle<span className={styles.thin}></span></span>
      </div>

      {/* Nav Groups */}
      <nav className={styles.nav}>
        {filteredGroups.map((group) => (
          <div key={group.label} className={styles.navGroup}>
            <span className={styles.groupLabel}>{group.label}</span>
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navLink} ${pathname === item.href ? styles.active : ''}`}
              >
                <span className={styles.icon}>{item.icon}</span>
                <span className={styles.label}>{item.label}</span>
                {pathname === item.href && <span className={styles.activeDot}></span>}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {/* User Profile + Logout */}
      <div className={styles.userCard}>
        <div className={styles.userAvatar}>{currentUser?.name?.slice(0, 2).toUpperCase() ?? 'U'}</div>
        <div className={styles.userInfo}>
          <p className={styles.userName}>{currentUser?.name ?? 'Guest'}</p>
          <p className={styles.userRole}>{currentUser?.role ?? '—'}</p>
        </div>
        <button className={styles.logoutBtn} onClick={logout} title="Logout">
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
