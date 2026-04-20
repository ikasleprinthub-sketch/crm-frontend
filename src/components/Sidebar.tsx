'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import Image from 'next/image';
import { useTheme } from '@/context/ThemeContext';
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
  const { theme } = useTheme();

  const getFilteredGroups = () => {
    return navGroups.map(group => {
      if (group.label === 'MANAGEMENT') {
        const items = group.items.filter(item => {
          if (currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN') return true;
          if (currentUser?.role === 'EMPLOYEE') return item.label === 'Tasks';
          if (currentUser?.role === 'MANAGER') {
            // Team Leader (Manager) can only see Tasks
            return item.label === 'Tasks';
          }
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
      {/* Logo Section */}
      <div className={styles.logoSection}>
        <div className={styles.logoWrapper}>
          <Image 
            src={theme === 'dark' ? '/logo-dark.png' : '/logo-light.png'} 
            alt="Capnero Logo" 
            width={200} 
            height={55} 
            priority
            className={styles.logoImage}
          />
        </div>
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
    </aside>
  );
}
