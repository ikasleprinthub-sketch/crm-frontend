'use client';
import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useApp, TaskStatus } from '@/context/AppContext';
import SOPList from '@/components/SOPList';
import { Modal, AddTaskForm } from '@/components/Modals';
import styles from '../page.module.css';
import { Trash2, ClipboardList } from 'lucide-react';

export default function TasksPage() {
  const { currentUser, tasks, leads, addTask, updateTask, updateTaskStep, deleteTask, users, departments, taskTypes } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('All');
  const isEmployee = currentUser?.role === 'EMPLOYEE';

  const activeTask = tasks.find(t => t.id === selectedTask);
  const filters = ['All', 'NOT_YET_STARTED', 'WORK_IN_PROGRESS', 'PENDING_FOR_APPROVAL', 'COMPLETED', 'DATA_NOT_RECEIVED'];
  const filtered = filter === 'All' ? tasks : tasks.filter(t => t.status === filter);

  const getUserName = (id: string) => users.find(u => u.id === id)?.name || '—';
  const getDeptName = (id: string) => departments.find(d => d.id === id)?.name || '—';
  const getTypeName = (id: string) => taskTypes.find(t => t.id === id)?.name || '—';
  const getLeadName = (id: string) => leads.find(l => l.id === id)?.leadName || 'Unknown';

  const statusBadge = (status: string) => `badge-${status.replace(/_/g, '').toLowerCase()}`;
  const priorityBadge = (priority: string) => `priority-${priority.toLowerCase()}`;

  const statusCounts: Record<string, number> = {
    All: tasks.length,
    'NOT_YET_STARTED': tasks.filter(t => t.status === 'NOT_YET_STARTED').length,
    'WORK_IN_PROGRESS': tasks.filter(t => t.status === 'WORK_IN_PROGRESS').length,
    'PENDING_FOR_APPROVAL': tasks.filter(t => t.status === 'PENDING_FOR_APPROVAL').length,
    'COMPLETED': tasks.filter(t => t.status === 'COMPLETED').length,
    'DATA_NOT_RECEIVED': tasks.filter(t => t.status === 'DATA_NOT_RECEIVED').length,
  };

  const getStatusLabel = (s: string) => s.replace(/_/g, ' ');

  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <main className={styles.main}>
        <Header title="Task Management" subtitle="Monitor and update task progress in real-time" />

        <div className={styles.pageTitleRow}>
          <div>
            <h2>All Tasks ({tasks.length})</h2>
            <p>Track SOP progress, assign tasks, and manage deadlines</p>
          </div>
          <div className={styles.btnRow}>
            {!isEmployee && (
              <button className={styles.primaryBtn} onClick={() => setIsModalOpen(true)}>+ New Task</button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className={styles.filterRow}>
          {filters.map(f => (
            <button key={f} className={`${styles.filterBtn} ${filter === f ? styles.active : ''}`} onClick={() => setFilter(f)}>
              {getStatusLabel(f)} ({statusCounts[f] || 0})
            </button>
          ))}
        </div>

        {/* Table */}
        <section className="glass-card">
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Task No</th>
                  <th>Lead / Client</th>
                  <th>Type</th>
                  <th>Assigned To</th>
                  <th>Due Date</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>SOP</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(task => {
                  const completed = task.sopSteps?.filter(s => s.isCompleted).length || 0;
                  const total = task.sopSteps?.length || 0;
                  const pct = total ? Math.round((completed / total) * 100) : 0;
                  return (
                    <tr key={task.id}>
                      <td>
                        <span style={{ fontWeight: 600, cursor: 'pointer', color: 'var(--primary)' }} onClick={() => setSelectedTask(task.id)}>{task.taskNo}</span>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 2 }}>{getDeptName(task.departmentId)}</p>
                      </td>
                      <td>
                         <span style={{ fontWeight: 600 }}>{getLeadName(task.leadId)}</span>
                         {task.contactName && <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{task.contactName}</p>}
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>{getTypeName(task.taskTypeId)}</td>
                      <td>{getUserName(task.assignedToId)}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {task.completionDate ? new Date(task.completionDate).toLocaleDateString() : '—'}
                      </td>
                      <td><span className={`${styles.priority} ${priorityBadge(task.priority)}`}>{task.priority}</span></td>
                      <td>
                        <select
                          className={`${styles.badge} ${statusBadge(task.status)}`}
                          value={task.status}
                          onChange={e => updateTask(task.id, { status: e.target.value as TaskStatus })}
                          style={{ border: 'none', cursor: 'pointer', background: 'transparent', fontWeight: 700, fontSize: '0.72rem', padding: '0.25rem 0.5rem' }}
                        >
                          {(['NOT_YET_STARTED', 'WORK_IN_PROGRESS', 'PENDING_FOR_APPROVAL', 'COMPLETED', 'DATA_NOT_RECEIVED'] as TaskStatus[])
                            .filter(s => !isEmployee || s !== 'COMPLETED')
                            .map(s => (
                              <option key={s} value={s}>{getStatusLabel(s)}</option>
                            ))}
                        </select>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => setSelectedTask(task.id)}>
                          <div className={styles.miniBar}><div className={styles.miniFill} style={{ width: `${pct}%` }}></div></div>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>{completed}/{total}</span>
                        </div>
                      </td>
                      <td>
                        {!isEmployee && (
                          <button className={styles.iconBtn} onClick={() => deleteTask(task.id)} title="Delete">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon} style={{ fontSize: '2rem', color: 'var(--text-secondary)' }}><ClipboardList size={40} /></div>
                <p style={{ marginTop: '1rem' }}>No tasks found</p>
              </div>
            )}
          </div>
        </section>

        {/* SOP Modal */}
        <Modal isOpen={!!selectedTask} onClose={() => setSelectedTask(null)} title={activeTask?.taskNo || 'Task SOP'}>
          {activeTask && (
            <div style={{ padding: '0.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                <p style={{ color: 'var(--text-secondary)' }}>Lead: <strong style={{ color: 'var(--text-primary)' }}>{getLeadName(activeTask.leadId)}</strong></p>
                <p style={{ color: 'var(--text-secondary)' }}>Assigned: <strong style={{ color: 'var(--text-primary)' }}>{getUserName(activeTask.assignedToId)}</strong></p>
                <p style={{ color: 'var(--text-secondary)' }}>Type: <strong style={{ color: 'var(--text-primary)' }}>{getTypeName(activeTask.taskTypeId)}</strong></p>
                <p style={{ color: 'var(--text-secondary)' }}>Priority: <strong style={{ color: activeTask.priority === 'URGENT' ? 'var(--accent-red)' : 'var(--text-primary)' }}>{activeTask.priority}</strong></p>
                {activeTask.remarks && <p style={{ color: 'var(--text-secondary)', gridColumn: '1 / -1' }}>Remarks: <strong style={{ color: 'var(--text-primary)' }}>{activeTask.remarks}</strong></p>}
              </div>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>SOP CHECKLIST</h3>
              <SOPList steps={activeTask.sopSteps || []} onToggle={(stepId, completed) => updateTaskStep(activeTask.id, stepId, completed)} />
            </div>
          )}
        </Modal>

        {/* Add Task Modal */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Task" size="lg">
          <AddTaskForm onSubmit={(data) => { addTask(data); setIsModalOpen(false); }} />
        </Modal>
      </main>
    </div>
  );
}
