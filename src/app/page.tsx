'use client';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import StatCard from '@/components/StatCard';
import { useApp } from '@/context/AppContext';
import { Target, CheckSquare, Users, FolderOpen, Trophy, ClipboardList } from 'lucide-react';
import Charts from '@/components/Charts';
import styles from './page.module.css';

export default function Dashboard() {
  const { currentUser, leads, tasks, users, departments, sources } = useApp();
  const isEmployee = currentUser?.role === 'EMPLOYEE';

  const totalLeads = leads.length;
  const convertedLeads = leads.filter(l => l.status === 'CONVERTED').length;
  const pendingTasks = tasks.filter(t => t.status !== 'COMPLETED').length;
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
  const totalEmployees = users.filter(u => u.role === 'EMPLOYEE').length;
  const urgentTasks = tasks.filter(t => t.priority === 'URGENT' && t.status !== 'COMPLETED').length;

  const statusBadge = (status: string) => {
    const key = status.replace(/_/g, '').toLowerCase();
    return `badge-${key}`;
  };

  const priorityBadge = (priority: string) => `priority-${priority.toLowerCase()}`;

  const getUserName = (id: string) => users.find(u => u.id === id)?.name || '—';
  const getDeptName = (id: string) => departments.find(d => d.id === id)?.name || '—';
  const getSourceName = (id: string) => sources.find(s => s.id === id)?.name || '—';

  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <main className={styles.main}>
        <Header title="Dashboard" subtitle="Welcome back! Here's your business overview." />

        {/* Stats */}
        {!isEmployee && (
          <>
            <div className={styles.statsGrid}>
              <StatCard label="Total Leads" value={totalLeads} icon={<Target size={20} />} isMain change="24%" />
              <StatCard label="Converted" value={convertedLeads} icon={<CheckSquare size={20} />} change={`${totalLeads ? Math.round((convertedLeads/totalLeads)*100) : 0}%`} />
              <StatCard label="Pending Tasks" value={pendingTasks} icon={<ClipboardList size={20} />} change={String(urgentTasks) + ' urgent'} changeType={urgentTasks > 0 ? 'down' : 'up'} />
              <StatCard label="Completed" value={completedTasks} icon={<Trophy size={20} />} change={`${tasks.length ? Math.round((completedTasks/tasks.length)*100) : 0}%`} />
            </div>

            {/* Second Stats Row */}
            <div className={styles.grid3Col}>
              <StatCard label="Total Employees" value={totalEmployees} icon={<Users size={20} />} />
              <StatCard label="Departments" value={departments.length} icon={<FolderOpen size={20} />} />
              <StatCard label="Total Users" value={users.length} icon={<Users size={20} />} />
            </div>

            {/* Charts Row */}
            <Charts leads={leads} tasks={tasks} />
          </>
        )}

        {/* Tables Row */}
        <div className={styles.grid2Col}>
          {/* Active Tasks */}
          <section className="glass-card">
            <div className={styles.sectionHeader}>
              <h2>Active Tasks</h2>
              <a href="/tasks" className={styles.viewAll}>See all →</a>
            </div>
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Task No</th>
                    <th>Assigned</th>
                    <th>Status</th>
                    <th>Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.filter(t => t.status !== 'COMPLETED').slice(0, 5).map(task => (
                    <tr key={task.id}>
                      <td style={{ fontWeight: 600, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.taskNo}</td>
                      <td>{getUserName(task.assignedToId)}</td>
                      <td><span className={`${styles.badge} ${statusBadge(task.status)}`}>{task.status.replace(/_/g, ' ')}</span></td>
                      <td><span className={`${styles.priority} ${priorityBadge(task.priority)}`}>{task.priority}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {tasks.filter(t => t.status !== 'COMPLETED').length === 0 && (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon} style={{ fontSize: '2rem', color: 'var(--text-secondary)' }}><CheckSquare size={40} /></div>
                  <p>All tasks completed!</p>
                </div>
              )}
            </div>
          </section>

          {/* Recent Leads */}
          {!isEmployee && (
            <section className="glass-card">
              <div className={styles.sectionHeader}>
                <h2>Recent Leads</h2>
                <a href="/leads" className={styles.viewAll}>See all →</a>
              </div>
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Source</th>
                      <th>Dept</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.slice(0, 5).map(lead => (
                      <tr key={lead.id}>
                        <td style={{ fontWeight: 600 }}>{lead.leadName}</td>
                        <td>{getSourceName(lead.sourceId)}</td>
                        <td>{getDeptName(lead.departmentId)}</td>
                        <td><span className={`${styles.badge} ${statusBadge(lead.status)}`}>{lead.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {leads.length === 0 && (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIcon} style={{ fontSize: '2rem', color: 'var(--text-secondary)' }}><Target size={40} /></div>
                    <p>No recent leads.</p>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

      </main>
    </div>
  );
}
