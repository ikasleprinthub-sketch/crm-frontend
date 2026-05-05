'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useApp } from '@/context/AppContext';
import SOPChecklist from '@/components/SOPChecklist';
import styles from '../../page.module.css';
import { ArrowLeft, Calendar, User, Building, ClipboardList } from 'lucide-react';

export default function TaskDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { tasks, updateTaskStep, leads, users, departments, taskTypes } = useApp();
  const [task, setTask] = useState<any>(null);

  useEffect(() => {
    if (id && tasks.length > 0) {
      const found = tasks.find(t => t.id === id);
      if (found) setTask(found);
    }
  }, [id, tasks]);

  if (!task) {
    return (
      <div className={styles.wrapper}>
        <Sidebar />
        <main className={styles.main}>
          <Header title="Task Details" />
          <div className={styles.emptyState}>
            <p>Loading task details...</p>
          </div>
        </main>
      </div>
    );
  }

  const getLeadName = (leadId: string) => task.lead?.leadName || leads.find(l => l.id === leadId)?.leadName || 'Unknown';
  const getUserName = (userId: string) => users.find(u => u.id === userId)?.name || '—';
  const getDeptName = (deptId: string) => departments.find(d => d.id === deptId)?.name || '—';
  const getTypeName = (typeId: string) => taskTypes.find(t => t.id === typeId)?.name || '—';

  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <main className={styles.main}>
        <Header title={`Task ${task.taskNo}`} subtitle={getTypeName(task.taskTypeId)} />

        <button className={styles.filterResetBtn} onClick={() => router.back()} style={{ marginBottom: '1.5rem', alignSelf: 'flex-start' }}>
          <ArrowLeft size={14} /> Back to Tasks
        </button>

        <div className="glass-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
            <div className={styles.detailItem}>
              <p className={styles.label}><Building size={14} /> Lead / Client</p>
              <p className={styles.value}>{getLeadName(task.leadId)}</p>
            </div>
            <div className={styles.detailItem}>
              <p className={styles.label}><User size={14} /> Assigned To</p>
              <p className={styles.value}>{getUserName(task.assignedToId)}</p>
            </div>
            <div className={styles.detailItem}>
              <p className={styles.label}><Calendar size={14} /> Created At</p>
              <p className={styles.value}>{new Date(task.createdAt).toLocaleDateString()}</p>
            </div>
            <div className={styles.detailItem}>
              <p className={styles.label}><ClipboardList size={14} /> Status</p>
              <p className={styles.value}><span className={`badge-${task.status.toLowerCase().replace(/_/g, '')}`}>{task.status.replace(/_/g, ' ')}</span></p>
            </div>
          </div>

          <div style={{ maxWidth: '800px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>SOP PROGRESS</h3>
            <SOPChecklist 
              steps={task.sopSteps || []} 
              taskId={task.id}
              onToggle={(stepId, completed) => updateTaskStep(task.id, stepId, completed)} 
            />
          </div>
        </div>
      </main>
    </div>
  );
}
