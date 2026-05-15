'use client';
import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useApp, TaskStatus } from '@/context/AppContext';
import SOPChecklist from '@/components/SOPChecklist';
import { Modal, AddTaskForm, EditTaskForm } from '@/components/Modals';
import styles from '../page.module.css';
import { Trash2, ClipboardList, Search, Building, User, Users, Calendar, RotateCcw, AlertCircle, Edit3 } from 'lucide-react';
import CustomSelect from '@/components/CustomSelect';
import CustomDatePicker from '@/components/CustomDatePicker';

export default function TasksPage() {
  const {
    currentUser, tasks, leads, addTask, updateTask,
    updateTaskStep, deleteTask, users, departments,
    taskTypes, searchQuery, showToast
  } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const selectedTaskObj = tasks.find(t => t.id === selectedTask);
  const [statusFilter, setStatusFilter] = useState<string>('NOT_YET_STARTED');
  const [deptFilter, setDeptFilter] = useState<string>('All');
  const [userFilter, setUserFilter] = useState<string>('All');
  const [leadCategory, setLeadCategory] = useState<string>('All');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<any>(null);

  const isEmployee = currentUser?.role === 'EMPLOYEE';
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';
  const handleDeleteTask = (id: string) => {
    showToast(
      'Delete Task?',
      'Are you sure you want to permanently remove this task?',
      'confirm',
      async () => {
        try {
          await deleteTask(id);
          showToast('Task Deleted', 'The task has been permanently removed.', 'success');
        } catch (e: any) {
          // Toast is now handled globally in AppContext
          console.error('Delete task UI error:', e);
        }
      }
    );
  };

  const filters = ['All', 'NOT_YET_STARTED', 'WORK_IN_PROGRESS', 'PENDING_FOR_APPROVAL', 'COMPLETED', 'DATA_NOT_RECEIVED'];

  const filtered = tasks.filter(t => {
    const matchesSearch = !searchQuery ||
      t.taskNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.contactName?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      (t.remarks?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      (t.lead?.leadName?.toLowerCase().includes(searchQuery.toLowerCase()) || false);

    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
    const matchesDept = deptFilter === 'All' || t.departmentId === deptFilter;
    const matchesUser = userFilter === 'All' || t.assignedToId === userFilter;

    // Lead Category Filter
    const lead = leads.find(l => l.id === t.leadId);
    const matchesCategory = leadCategory === 'All'
      ? true
      : leadCategory === 'New' ? lead?.status === 'NEW' : lead?.status !== 'NEW';

    let matchesDate = true;
    if (startDate || endDate) {
      const taskDate = new Date(t.createdAt).getTime();
      if (startDate) matchesDate = matchesDate && taskDate >= startDate.getTime();
      if (endDate) matchesDate = matchesDate && taskDate <= endDate.getTime();
    }

    return matchesSearch && matchesStatus && matchesDept && matchesUser && matchesDate && matchesSearch && matchesCategory;
  });

  const getUserName = (id: string) => users.find(u => u.id === id)?.name || '—';
  const getDeptName = (id: string) => departments.find(d => d.id === id)?.name || '—';
  const getTypeName = (id: string) => taskTypes.find(t => t.id === id)?.name || '—';
  const getLeadName = (task: any) => task?.lead?.leadName || leads.find((l: any) => l.id === task?.leadId)?.leadName || 'Unknown';
  const getLeadEmail = (task: any) => task?.lead?.email || leads.find((l: any) => l.id === task?.leadId)?.email || '—';
  const getLeadPhone = (task: any) => task?.lead?.contactNumber || leads.find((l: any) => l.id === task?.leadId)?.contactNumber || '—';

  const statusBadge = (status: string) => `badge-${status.replace(/_/g, '').toLowerCase()}`;
  const priorityBadge = (priority: string) => `priority-${priority.toLowerCase()}`;

  const statusCounts = filters.reduce((acc, curr) => {
    acc[curr] = curr === 'All' ? tasks.length : tasks.filter(t => t.status === curr).length;
    return acc;
  }, {} as any);

  const getStatusLabel = (s: string) => s.replace(/_/g, ' ');

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'NOT_YET_STARTED': return 'var(--text-secondary)';
      case 'WORK_IN_PROGRESS': return 'var(--accent-blue)';
      case 'PENDING_FOR_APPROVAL': return 'var(--accent-yellow)';
      case 'COMPLETED': return 'var(--accent-green)';
      case 'DATA_NOT_RECEIVED': return 'var(--accent-red)';
      default: return 'inherit';
    }
  };

  const getStatusBgColor = (s: string) => {
    switch (s) {
      case 'NOT_YET_STARTED': return 'rgba(148, 163, 184, 0.12)';
      case 'WORK_IN_PROGRESS': return 'rgba(91, 146, 208, 0.12)';
      case 'PENDING_FOR_APPROVAL': return 'rgba(245, 158, 11, 0.12)';
      case 'COMPLETED': return 'rgba(16, 185, 129, 0.12)';
      case 'DATA_NOT_RECEIVED': return 'rgba(239, 68, 68, 0.12)';
      default: return 'transparent';
    }
  };

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

        <div className={styles.filterRow}>
          {filters.map(f => (
            <button
              key={f}
              className={`${styles.filterBtn} ${statusFilter === f ? styles.active : ''}`}
              onClick={() => setStatusFilter(f)}
            >
              {getStatusLabel(f)} <span className={styles.badge}>{statusCounts[f] || 0}</span>
            </button>
          ))}
        </div>

        {/* Advanced Filters */}
        <div className={styles.filterCard}>
          <div className={styles.filterGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>

            <CustomSelect
              label="Department"
              icon={<Building size={14} />}
              value={deptFilter}
              onChange={setDeptFilter}
              options={[{ id: 'All', name: 'All Departments' }, ...departments.map(d => ({ id: d.id, name: d.name }))]}
            />

            {!isEmployee && (
              <CustomSelect
                label="Assigned Staff"
                icon={<User size={14} />}
                value={userFilter}
                onChange={setUserFilter}
                options={[{ id: 'All', name: 'All Staff' }, ...users.map(u => ({ id: u.id, name: u.name }))]}
              />
            )}

            <CustomSelect
              label="Lead Category"
              icon={<Users size={14} />}
              value={leadCategory}
              onChange={setLeadCategory}
              options={[
                { id: 'All', name: 'All Categories' },
                { id: 'New', name: 'New Leads' },
                { id: 'Old', name: 'Old Leads' }
              ]}
            />

            <CustomDatePicker
              label="From"
              selected={startDate}
              onChange={setStartDate}
            />

            <CustomDatePicker
              label="To"
              selected={endDate}
              onChange={setEndDate}
            />

            <button
              className={styles.filterResetBtn}
              onClick={() => { setStatusFilter('All'); setDeptFilter('All'); setUserFilter('All'); setLeadCategory('All'); setStartDate(null); setEndDate(null); }}
            >
              <RotateCcw size={14} /> Reset Filters
            </button>
          </div>
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
                        <span style={{ fontWeight: 600 }}>{task.lead?.leadName || getLeadName(task)}</span>
                        {task.contactName && <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{task.contactName}</p>}
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>{getTypeName(task.taskTypeId)}</td>
                      <td>{getUserName(task.assignedToId)}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {task.completionDate ? new Date(task.completionDate).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                      </td>
                      <td><span className={`${styles.priority} ${priorityBadge(task.priority)}`}>{task.priority}</span></td>
                      <td>
                        {isEmployee && task.status === 'COMPLETED' ? (
                          <span 
                            className={`${styles.badge} ${statusBadge(task.status)}`}
                            style={{
                              background: getStatusBgColor(task.status),
                              color: getStatusColor(task.status),
                              fontWeight: 700,
                              fontSize: '0.68rem',
                              padding: '0.3rem 0.6rem',
                              borderRadius: '8px',
                              display: 'inline-block'
                            }}
                          >
                            {getStatusLabel(task.status)}
                          </span>
                        ) : (
                          <CustomSelect
                            size="sm"
                            options={(['NOT_YET_STARTED', 'WORK_IN_PROGRESS', 'PENDING_FOR_APPROVAL', 'COMPLETED', 'DATA_NOT_RECEIVED'] as TaskStatus[])
                              .filter(s => !isEmployee || s !== 'COMPLETED' || task.status === 'COMPLETED')
                              .map(s => ({ id: s, name: getStatusLabel(s) }))}
                            value={task.status}
                            onChange={async (val) => {
                              try {
                                await updateTask(task.id, { status: val as TaskStatus });
                                showToast('Status Updated', `Task ${task.taskNo} is now ${val.replace(/_/g, ' ')}`, 'success');
                              } catch (e: any) {
                                showToast('Update Failed', e.response?.data?.message || e.message, 'error');
                              }
                            }}
                          />
                        )}
                      </td>
                      <td>
                        <div style={{ cursor: 'pointer' }} onClick={() => setSelectedTask(task.id)}>
                          {total === 0 ? (
                            <span style={{ 
                              color: 'var(--accent-red)', 
                              fontSize: '0.65rem', 
                              fontWeight: 800, 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 4,
                              background: 'rgba(239, 68, 68, 0.08)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              width: 'fit-content'
                            }}>
                              <AlertCircle size={10} /> NO SOP
                            </span>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div className={styles.miniBar}>
                                <div 
                                  className={styles.miniFill} 
                                  style={{ 
                                    width: `${pct}%`,
                                    background: pct === 100 ? 'var(--accent-green)' : pct > 0 ? 'var(--accent-yellow)' : 'var(--text-secondary)'
                                  }}
                                />
                              </div>
                              <span style={{ 
                                fontSize: '0.72rem', 
                                fontWeight: 700,
                                color: pct === 100 ? 'var(--accent-green)' : pct > 0 ? 'var(--accent-yellow)' : 'var(--text-secondary)'
                              }}>
                                {completed}/{total}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {isAdmin && (
                            <button 
                              className={styles.iconBtn} 
                              onClick={() => { setTaskToEdit(task); setIsEditModalOpen(true); }} 
                              title="Edit"
                              style={{ color: 'var(--primary)' }}
                            >
                              <Edit3 size={16} />
                            </button>
                          )}
                          {!isEmployee && (
                            <button className={styles.iconBtn} onClick={() => handleDeleteTask(task.id)} title="Delete">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
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
        <Modal isOpen={!!selectedTask} onClose={() => setSelectedTask(null)} title={tasks.find(t => t.id === selectedTask)?.taskNo || 'Task SOP'}>
          {tasks.find(t => t.id === selectedTask) && (
            <div style={{ padding: '0.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                <p style={{ color: 'var(--text-secondary)' }}>Lead: <strong style={{ color: 'var(--text-primary)' }}>{getLeadName(selectedTaskObj)}</strong></p>
                <p style={{ color: 'var(--text-secondary)' }}>Assigned: <strong style={{ color: 'var(--text-primary)' }}>{getUserName(tasks.find(t => t.id === selectedTask)!.assignedToId)}</strong></p>
                <p style={{ color: 'var(--text-secondary)' }}>Type: <strong style={{ color: 'var(--text-primary)' }}>{getTypeName(tasks.find(t => t.id === selectedTask)!.taskTypeId)}</strong></p>
                <p style={{ color: 'var(--text-secondary)' }}>Priority: <strong style={{ color: selectedTaskObj?.priority === 'URGENT' ? 'var(--accent-red)' : 'var(--text-primary)' }}>{selectedTaskObj?.priority}</strong></p>
                <p style={{ color: 'var(--text-secondary)' }}>Email: <strong style={{ color: 'var(--text-primary)' }}>{getLeadEmail(selectedTaskObj!)}</strong></p>
                <p style={{ color: 'var(--text-secondary)' }}>Phone: <strong style={{ color: 'var(--text-primary)' }}>{getLeadPhone(selectedTaskObj!)}</strong></p>
                {tasks.find(t => t.id === selectedTask)!.remarks && <p style={{ color: 'var(--text-secondary)', gridColumn: '1 / -1' }}>Remarks: <strong style={{ color: 'var(--text-primary)' }}>{tasks.find(t => t.id === selectedTask)!.remarks}</strong></p>}
              </div>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>SOP CHECKLIST</h3>
              <SOPChecklist 
                steps={tasks.find(t => t.id === selectedTask)!.sopSteps || []} 
                taskId={selectedTask!} 
                taskTypeId={tasks.find(t => t.id === selectedTask)!.taskTypeId}
                onToggle={async (stepId, completed) => {
                  try {
                    await updateTaskStep(selectedTask!, stepId, completed);
                  } catch (e: any) {
                    showToast('Update Failed', e.response?.data?.message || 'Failed to update step.', 'error');
                  }
                }} 
              />
            </div>
          )}
        </Modal>

        {/* Add Task Modal */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Task" size="lg">
          <AddTaskForm onSubmit={async (data) => { 
            try {
              await addTask(data); 
              setIsModalOpen(false); 
              showToast('Task Created', 'The new task has been successfully assigned.', 'success');
            } catch (e: any) {
              showToast('Creation Failed', e.response?.data?.message || e.message || 'Could not create the task. Please check all fields.', 'error');
            }
          }} />
        </Modal>

        {/* Edit Task Modal */}
        <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={`Edit Task: ${taskToEdit?.taskNo}`} size="lg">
          {taskToEdit && (
            <EditTaskForm 
              task={taskToEdit} 
              onSubmit={async (data) => { 
                try {
                  await updateTask(taskToEdit.id, data); 
                  setIsEditModalOpen(false); 
                  showToast('Task Reassigned', 'The task has been successfully reassigned to the team member.', 'success');
                } catch (e) {
                  showToast('Update Failed', 'Failed to update task details.', 'error');
                }
              }} 
            />
          )}
        </Modal>
      </main>
    </div>
  );
}
