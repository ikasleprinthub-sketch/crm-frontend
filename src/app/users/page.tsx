'use client';
import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useApp } from '@/context/AppContext';
import styles from '../page.module.css';

export default function UsersPage() {
  const { currentUser, users, tasks } = useApp();
  const [roleFilter, setRoleFilter] = useState<string>('All');

  const filters = ['All', 'ADMIN', 'MANAGER', 'EMPLOYEE'];
  const filtered = roleFilter === 'All' ? users : users.filter(u => u.role === roleFilter);

  const roleBadge = (role: string) => `role-${role.toLowerCase()}`;

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className={styles.wrapper}>
        <Sidebar />
        <main className={styles.main}>
          <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', marginTop: '2rem' }}>
            <h2 style={{ color: 'var(--accent-red)' }}>Access Denied</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Only administrators can access User Configuration.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <main className={styles.main}>
        <Header title="Users" subtitle="Manage your team members and their roles" />

        <div className={styles.pageTitleRow}>
          <div>
            <h2>All Users ({users.length})</h2>
            <p>View administrative and staff personnel</p>
          </div>
        </div>

        {/* Filters */}
        <div className={styles.filterRow}>
          {filters.map(f => (
            <button key={f} className={`${styles.filterBtn} ${roleFilter === f ? styles.active : ''}`} onClick={() => setRoleFilter(f)}>
              {f} ({f === 'All' ? users.length : users.filter(u => u.role === f).length})
            </button>
          ))}
        </div>

        {/* Employee Cards */}
        <div className={styles.grid3Col}>
          {filtered.map(user => {
            const userTasks = tasks.filter(t => t.assignedToId === user.id);
            const completedTasks = userTasks.filter(t => t.status === 'COMPLETED').length;
            const activeTasks = userTasks.filter(t => t.status !== 'COMPLETED').length;

            return (
              <div key={user.id} className="glass-card" style={{ padding: '1.5rem', position: 'relative' }}>

                {/* Avatar + Info */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '1.25rem' }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 16,
                    background: 'linear-gradient(135deg, var(--primary), #7551FF)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontSize: '1rem', fontWeight: 700,
                    boxShadow: '0 6px 16px rgba(67,24,255,0.3)',
                    marginBottom: '0.75rem',
                  }}>{user.name.slice(0,2).toUpperCase()}</div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{user.name}</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>{user.email}</p>
                  <span className={`${styles.badge} ${roleBadge(user.role)}`} style={{ marginTop: '0.5rem' }}>
                    {user.role}
                  </span>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', textAlign: 'center', padding: '0.75rem', background: 'var(--surface-hover)', borderRadius: 'var(--radius-sm)' }}>
                  <div>
                    <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>{activeTasks}</p>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Active Tasks</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-green)' }}>{completedTasks}</p>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Done</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>{userTasks.length}</p>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Total Tasks</p>
                  </div>
                </div>

                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Joined</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{new Date(user.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
