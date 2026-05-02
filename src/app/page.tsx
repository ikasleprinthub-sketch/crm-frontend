'use client';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import StatCard from '@/components/StatCard';
import { useApp } from '@/context/AppContext';
import { Target, CheckSquare, Users, FolderOpen, Trophy, ClipboardList, Bell, Plus, X, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Charts from '@/components/Charts';
import styles from './page.module.css';

export default function Dashboard() {
  const router = useRouter();
  const { currentUser, leads, tasks, users, departments, sources, unreadCount, activities, notes, addNote, deleteNote, searchQuery } = useApp();
  const [isAddingQuick, setIsAddingQuick] = useState(false);
  const [quickNote, setQuickNote] = useState('');
  const isEmployee = currentUser?.role === 'EMPLOYEE';

  const totalLeads = leads.length;
  const convertedLeads = leads.filter(l => l.status === 'CONVERTED').length;
  const pendingTasks = tasks.filter(t => t.status !== 'COMPLETED').length;
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
  const totalEmployees = users.filter(u => u.role === 'EMPLOYEE').length;
  const urgentTasks = tasks.filter(t => t.priority === 'URGENT' && t.status !== 'COMPLETED').length;
  
  // Filtering logic
  const filteredTasks = tasks.filter(t => 
    t.taskNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.assignedTo?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLeads = leads.filter(l => 
    l.leadName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.leadNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusBadge = (status: string) => {
    const key = status.replace(/_/g, '').toLowerCase();
    return `badge-${key}`;
  };

  const priorityBadge = (priority: string) => `priority-${priority.toLowerCase()}`;

  const getUserName = (id: string) => users.find(u => u.id === id)?.name || '—';
  const getDeptName = (id: string) => departments.find(d => d.id === id)?.name || '—';
  const getSourceName = (id: string) => sources.find(s => s.id === id)?.name || '—';
  const getLeadName = (task: any) => task.lead?.leadName || leads.find((l: any) => l.id === task.leadId)?.leadName || '—';

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

        {/* Employee Specific Dashboard */}
        {isEmployee && (
          <div className={styles.dashboardContainer}>
            {/* Top Row: Performance Stats */}
            <div className={styles.statsGrid}>
              <StatCard label="My Tasks" value={tasks.filter(t => t.assignedToId === currentUser?.id).length} icon={<CheckSquare size={20} />} isMain />
              <StatCard label="Tasks Done" value={tasks.filter(t => t.assignedToId === currentUser?.id && t.status === 'COMPLETED').length} icon={<Trophy size={20} />} />
              <StatCard label="Active Alerts" value={unreadCount} icon={<Bell size={20} />} change="Immediate" />
              <StatCard label="Daily Status" value={tasks.filter(t => t.assignedToId === currentUser?.id && t.status === 'WORK_IN_PROGRESS').length + ' Active'} icon={<ClipboardList size={20} />} />
            </div>

            <div className={styles.grid2Col}>
              {/* Left Column: My Tasks & Reminders */}
              <div className={styles.stack}>
                <section className="glass-card">
                  <div className={styles.sectionHeader}>
                    <h2>My Active Tasks</h2>
                    <a href="/tasks" className={styles.viewAll}>View Board →</a>
                  </div>
                  <div className={styles.taskSummaryList}>
                    {tasks.filter(t => t.assignedToId === currentUser?.id && t.status !== 'COMPLETED').slice(0, 4).map(t => (
                      <div key={t.id} className={styles.taskSummaryItem}>
                        <div className={styles.taskInfo}>
                          <p className={styles.taskTitle}>{t.taskNo}</p>
                          <p className={styles.taskMeta}>
                            <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{getLeadName(t)}</span> • {t.priority} • Due: {t.completionDate ? new Date(t.completionDate).toLocaleDateString() : 'No date'}
                          </p>
                        </div>
                        <span className={`${styles.badge} ${statusBadge(t.status)}`}>{t.status.replace(/_/g, ' ')}</span>
                      </div>
                    ))}
                    {tasks.filter(t => t.assignedToId === currentUser?.id && t.status !== 'COMPLETED').length === 0 && (
                      <p className={styles.emptyText}>You're all caught up!</p>
                    )}
                  </div>
                </section>

                <section className="glass-card">
                  <div className={styles.sectionHeader}>
                    <h2>Reminders & Notes</h2>
                    <div className={styles.btnRow}>
                      <button 
                        onClick={() => router.push('/notes')}
                        className={styles.viewAll}
                        style={{ border: 'none', background: 'none', cursor: 'pointer' }}
                      >
                        Go to Notes →
                      </button>
                      <button 
                        onClick={() => setIsAddingQuick(!isAddingQuick)}
                        className={styles.addNoteBtn}
                      >
                        {isAddingQuick ? <X size={14} /> : <Plus size={14} />}
                        {isAddingQuick ? 'Cancel' : 'Add'}
                      </button>
                    </div>
                  </div>

                  {isAddingQuick && (
                    <div className={styles.quickAddRow} style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
                      <input 
                        type="text" 
                        placeholder="What's on your mind?"
                        className={styles.input}
                        style={{ padding: '0.5rem 1rem' }}
                        value={quickNote}
                        onChange={(e) => setQuickNote(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && quickNote.trim()) {
                            addNote({ title: 'Reminder', content: quickNote, color: 'blue' });
                            setQuickNote('');
                            setIsAddingQuick(false);
                          }
                        }}
                      />
                      <button 
                        className={styles.primaryBtn} 
                        style={{ padding: '0.5rem 1rem' }}
                        onClick={() => {
                          if (quickNote.trim()) {
                            addNote({ title: 'Reminder', content: quickNote, color: 'blue' });
                            setQuickNote('');
                            setIsAddingQuick(false);
                          }
                        }}
                      >
                        Save
                      </button>
                    </div>
                  )}

                  <div className={styles.notesGrid}>
                    {notes.slice(0, 2).map(note => (
                      <div key={note.id} className={`${styles.noteCard} ${note.color === 'yellow' ? styles.noteYellow : styles.noteBlue}`}>
                        <div className={styles.noteHeader}>
                           <p className={styles.noteTitle}>{note.title || 'Note'}</p>
                           <button onClick={() => deleteNote(note.id)} className={styles.deleteNoteBtn}><Trash2 size={12} /></button>
                        </div>
                        <p className={styles.noteContent}>{note.content}</p>
                      </div>
                    ))}
                    {notes.length === 0 && !isAddingQuick && (
                      <div className={`${styles.noteCard} ${styles.noteBlue}`} style={{ gridColumn: 'span 2', cursor: 'pointer' }} onClick={() => setIsAddingQuick(true)}>
                        <p className={styles.noteTitle}>Personal Note</p>
                        <p className={styles.noteContent}>You don't have any notes yet. Click here to add one!</p>
                      </div>
                    )}
                  </div>
                </section>
              </div>

              {/* Right Column: Dynamic Feed (Optional) */}
              <div className={styles.stack}>
                {/* Space for future connected components */}
              </div>
            </div>
          </div>
        )}

        {/* Tables Row (Only for Admins/Managers) */}
        {!isEmployee && (
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
                      <th>Client</th>
                      <th>Assigned</th>
                      <th>Status</th>
                      <th>Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.filter(t => t.status !== 'COMPLETED').slice(0, 5).map(task => (
                      <tr key={task.id}>
                        <td style={{ fontWeight: 600, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.taskNo}</td>
                        <td style={{ fontSize: '0.85rem', fontWeight: 500 }}>{getLeadName(task)}</td>
                        <td>{getUserName(task.assignedToId)}</td>
                        <td><span className={`${styles.badge} ${statusBadge(task.status)}`}>{task.status.replace(/_/g, ' ')}</span></td>
                        <td><span className={`${styles.priority} ${priorityBadge(task.priority)}`}>{task.priority}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredTasks.filter(t => t.status !== 'COMPLETED').length === 0 && (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIcon} style={{ fontSize: '2rem', color: 'var(--text-secondary)' }}><CheckSquare size={40} /></div>
                    <p>All tasks completed!</p>
                  </div>
                )}
              </div>
            </section>

            {/* Recent Leads */}
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
                    {filteredLeads.slice(0, 5).map(lead => (
                      <tr key={lead.id}>
                        <td style={{ fontWeight: 600 }}>{lead.leadName}</td>
                        <td>{getSourceName(lead.sourceId)}</td>
                        <td>{getDeptName(lead.departmentId)}</td>
                        <td><span className={`${styles.badge} ${statusBadge(lead.status)}`}>{lead.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredLeads.length === 0 && (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIcon} style={{ fontSize: '2rem', color: 'var(--text-secondary)' }}><Target size={40} /></div>
                    <p>No recent leads.</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

      </main>
    </div>
  );
}
