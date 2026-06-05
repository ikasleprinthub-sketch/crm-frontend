'use client';
import Sidebar from '@/components/Sidebar'; //HI
import Header from '@/components/Header';
import StatCard from '@/components/StatCard';
import { useApp } from '@/context/AppContext';
import {
  Bell, Trophy, CheckSquare, Plus, X, ClipboardList, Trash2,
  Users, ShieldCheck, Calendar, Target, FolderOpen
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Charts from '@/components/Charts';
import styles from './page.module.css';
import api from '@/lib/api';

function AttendanceCard({ attendanceToday, myPermissions, getUserName }: { attendanceToday: any, myPermissions: any[], getUserName: (id: string) => string }) {
  return (
    <div className={styles.stack} style={{ marginBottom: '2rem' }}>
      {attendanceToday?.managerId && (
        <section className="glass-card" style={{ borderLeft: '4px solid var(--primary)', padding: '1rem 1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary)', boxShadow: '0 4px 12px rgba(67, 24, 255, 0.1)' }}>
                {getUserName(attendanceToday.managerId).charAt(0)}
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Reporting Manager</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{getUserName(attendanceToday.managerId)}</p>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Direct Supervisor</p>
              <p style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700, marginTop: '2px' }}>CONNECTED</p>
            </div>
          </div>
        </section>
      )}

      <section className="glass-card" style={{ borderLeft: '4px solid #16a34a' }}>
        <div className={styles.sectionHeader} style={{ marginBottom: '1rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Calendar size={18} color="#16a34a" /> Attendance & Permissions
          </h2>
          <a href="/attendance" className={styles.viewAll}>Details →</a>
        </div>

        <div style={{
          background: 'rgba(22, 163, 74, 0.05)',
          padding: '1rem',
          borderRadius: '12px',
          marginBottom: '1.25rem',
          border: '1px solid rgba(22, 163, 74, 0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803d', textTransform: 'uppercase' }}>Today's Status</span>
            <span className={`${styles.badge}`} style={{
              background: attendanceToday?.checkIn ? '#16a34a' : '#dc2626',
              color: 'white',
              fontSize: '0.65rem'
            }}>
              {attendanceToday?.status || 'NOT MARKED'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <div>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>CHECK IN</p>
              <p style={{ fontWeight: 800, fontSize: '1rem' }}>
                {attendanceToday?.checkIn ? new Date(attendanceToday.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>TOTAL HOURS</p>
              <p style={{ fontWeight: 800, fontSize: '1rem' }}>
                {attendanceToday?.totalHours ? `${Math.floor(attendanceToday.totalHours)}h ${Math.round((attendanceToday.totalHours % 1) * 60)}m` : '0h 0m'}
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>RECENT PERMISSIONS</p>
          {myPermissions.map((p: any) => (
            <div key={p.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.5rem 0',
              borderBottom: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'var(--surface)' }}>
                  <ShieldCheck size={14} color="var(--primary)" />
                </div>
                <div>
                  <p style={{ fontSize: '0.85rem', fontWeight: 700 }}>{p.permissionType?.replace(/_/g, ' ')}</p>
                  <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{new Date(p.date).toLocaleDateString()}</p>
                </div>
              </div>
              <span style={{
                fontSize: '0.65rem',
                fontWeight: 800,
                color: p.permission === 'APPROVED' ? '#16a34a' : p.permission === 'REJECTED' ? '#dc2626' : '#ea580c'
              }}>
                {p.permission}
              </span>
            </div>
          ))}
          {myPermissions.length === 0 && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', padding: '1rem 0' }}>
              No recent permissions
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const { currentUser, leads, tasks, users, departments, sources, unreadCount, notes, addNote, deleteNote, searchQuery } = useApp();
  const [isAddingQuick, setIsAddingQuick] = useState(false);
  const [quickNote, setQuickNote] = useState('');
  const [attendanceToday, setAttendanceToday] = useState<any>(null);
  const [myPermissions, setMyPermissions] = useState<any[]>([]);
  const isEmployee = currentUser?.role === 'EMPLOYEE';

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    if (!currentUser) return;
    try {
      const [todayRes, histRes] = await Promise.all([
        api.get('/attendance/today'),
        api.get('/attendance/my')
      ]);
      if (todayRes.data?.success) setAttendanceToday(todayRes.data.data);
      if (histRes.data?.success) {
        setMyPermissions(histRes.data.data.filter((r: any) => r.permission !== 'NONE').slice(0, 3));
      }
    } catch (e) { console.error(e); }
  };

  const totalLeads = leads.length;
  const convertedLeads = useMemo(() => leads.filter(l => l.status === 'CONVERTED').length, [leads]);
  const pendingTasks = useMemo(() => tasks.filter(t => t.status !== 'COMPLETED').length, [tasks]);
  const completedTasks = useMemo(() => tasks.filter(t => t.status === 'COMPLETED').length, [tasks]);
  const totalEmployees = useMemo(() => users.filter(u => u.role === 'EMPLOYEE').length, [users]);
  const urgentTasks = useMemo(() => tasks.filter(t => t.priority === 'URGENT' && t.status !== 'COMPLETED').length, [tasks]);

  const filteredTasks = useMemo(() => tasks.filter(t =>
    t.taskNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.assignedTo?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.status.toLowerCase().includes(searchQuery.toLowerCase())
  ), [tasks, searchQuery]);

  const filteredLeads = useMemo(() => leads.filter(l =>
    l.leadName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.leadNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.status.toLowerCase().includes(searchQuery.toLowerCase())
  ), [leads, searchQuery]);

  const statusBadge = (status: string) => {
    const key = status.replace(/_/g, '').toLowerCase();
    return `badge-${key}`;
  };

  const priorityBadge = (priority: string) => `priority-${priority.toLowerCase()}`;

  const getUserName = (id: string) => {
    if (id === currentUser?.managerId && currentUser?.manager) return currentUser.manager.name;
    return users.find(u => u.id === id)?.name || '—';
  };
  const getDeptName = (id: string) => departments.find(d => d.id === id)?.name || '—';
  const getSourceName = (id: string) => sources.find(s => s.id === id)?.name || '—';
  const getLeadName = (task: any) => task.lead?.leadName || leads.find((l: any) => l.id === task.leadId)?.leadName || '—';

  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <main className={styles.main}>
        <Header title="Dashboard" subtitle="Welcome back! Here's your business overview." />

        {!isEmployee && (
          <>
            <div className={styles.statsGrid}>
              <StatCard label="Total Leads" value={totalLeads} icon={<Target size={20} />} isMain change="24%" />
              <StatCard label="Converted" value={convertedLeads} icon={<CheckSquare size={20} />} change={`${totalLeads ? Math.round((convertedLeads/totalLeads)*100) : 0}%`} />
              <StatCard label="Pending Tasks" value={pendingTasks} icon={<ClipboardList size={20} />} change={String(urgentTasks) + ' urgent'} changeType={urgentTasks > 0 ? 'down' : 'up'} />
              <StatCard label="Completed" value={completedTasks} icon={<Trophy size={20} />} change={`${tasks.length ? Math.round((completedTasks/tasks.length)*100) : 0}%`} />
            </div>

            <div className={styles.grid3Col}>
              <StatCard label="Total Employees" value={totalEmployees} icon={<Users size={20} />} />
              <StatCard label="Departments" value={departments.length} icon={<FolderOpen size={20} />} />
              <StatCard label="Total Users" value={users.length} icon={<Users size={20} />} />
            </div>

            <Charts leads={leads} tasks={tasks} />

            <AttendanceCard attendanceToday={attendanceToday} myPermissions={myPermissions} getUserName={getUserName} />
          </>
        )}

        {isEmployee && (
          <div className={styles.dashboardContainer}>
            <div className={styles.statsGrid}>
              <StatCard label="My Tasks" value={tasks.filter(t => t.assignedToId === currentUser?.id).length} icon={<CheckSquare size={20} />} isMain />
              <StatCard label="Tasks Done" value={tasks.filter(t => t.assignedToId === currentUser?.id && t.status === 'COMPLETED').length} icon={<Trophy size={20} />} />
              <StatCard label="Active Alerts" value={unreadCount} icon={<Bell size={20} />} change="Immediate" />
              <StatCard label="Daily Status" value={tasks.filter(t => t.assignedToId === currentUser?.id && t.status === 'WORK_IN_PROGRESS').length + ' Active'} icon={<ClipboardList size={20} />} />
            </div>

            <div className={styles.grid2Col}>
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
                      <button onClick={() => router.push('/notes')} className={styles.viewAll} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>Go to Notes →</button>
                      <button onClick={() => setIsAddingQuick(!isAddingQuick)} className={styles.addNoteBtn}>
                        {isAddingQuick ? <X size={14} /> : <Plus size={14} />}
                        {isAddingQuick ? 'Cancel' : 'Add'}
                      </button>
                    </div>
                  </div>
                  {isAddingQuick && (
                    <div className={styles.quickAddRow} style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
                      <input type="text" placeholder="What's on your mind?" className={styles.input} style={{ padding: '0.5rem 1rem' }} value={quickNote} onChange={(e) => setQuickNote(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && quickNote.trim()) { addNote({ title: 'Reminder', content: quickNote, color: 'blue' }); setQuickNote(''); setIsAddingQuick(false); } }} />
                      <button className={styles.primaryBtn} style={{ padding: '0.5rem 1rem' }} onClick={() => { if (quickNote.trim()) { addNote({ title: 'Reminder', content: quickNote, color: 'blue' }); setQuickNote(''); setIsAddingQuick(false); } }}>Save</button>
                    </div>
                  )}
                  <div className={styles.notesGrid}>
                    {notes.slice(0, 4).map(note => (
                      <div key={note.id} className={`${styles.noteCard} ${note.color === 'yellow' ? styles.noteYellow : styles.noteBlue}`}>
                        <div className={styles.noteHeader}>
                           <p className={styles.noteTitle}>{note.title || 'Note'}{note.userId !== currentUser?.id && note.user?.name && (<span style={{ fontSize: '0.65rem', display: 'block', opacity: 0.8, color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase' }}>By {note.user.name}</span>)}</p>
                           {note.userId === currentUser?.id && (<button onClick={() => deleteNote(note.id)} className={styles.deleteNoteBtn}><Trash2 size={12} /></button>)}
                        </div>
                        <p className={styles.noteContent}>{note.content}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
              <AttendanceCard attendanceToday={attendanceToday} myPermissions={myPermissions} getUserName={getUserName} />
            </div>
          </div>
        )}
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
