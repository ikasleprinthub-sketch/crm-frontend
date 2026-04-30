'use client';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import StatCard from '@/components/StatCard';
import { useApp } from '@/context/AppContext';
import SOPList from '@/components/SOPList';
import styles from '../page.module.css';

export default function EmployeeDashboard() {
  const { tasks, updateTaskStep } = useApp();
  
  // Simulation: Filter tasks for the logged-in employee "Rahul S."
  const myTasks = tasks.filter(t => t.assignedTo?.name === 'Rahul S.');
  const pendingTasks = myTasks.filter(t => t.status !== 'COMPLETED');
  const completedTasksCount = myTasks.filter(t => t.status === 'COMPLETED').length;

  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <main className={styles.main}>
        <Header title="My Performance" />
        
        <div className={styles.statsGrid}>
          <StatCard 
            label="My Total Tasks" 
            value={myTasks.length} 
            icon="📋" 
          />
          <StatCard 
            label="Pending Work" 
            value={pendingTasks.length} 
            change={pendingTasks.length > 5 ? 'High Volume' : 'Steady'}
            changeType={pendingTasks.length > 5 ? 'down' : 'up'}
            icon="⏳" 
          />
          <StatCard 
            label="Completed This Month" 
            value={completedTasksCount} 
            change="Keep it up!" 
            icon="🏆" 
          />
        </div>

        <h2 style={{ marginBottom: '1.5rem', fontWeight: 800 }}>My Active Work</h2>
        
        <div className={styles.grid2Col}>
          {pendingTasks.map(task => (
            <section key={task.id} className="glass-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{task.taskNo}</h3>
                <span className={`${styles.badge} ${task.status.toLowerCase()}`}>{task.status.replace(/_/g, ' ')}</span>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Client: <strong>{task.lead?.leadName || 'Unknown'}</strong></p>
              
              <SOPList 
                steps={task.sopSteps || []} 
                onToggle={(stepId, completed) => updateTaskStep(task.id, stepId, completed)} 
              />
            </section>
          ))}
          {pendingTasks.length === 0 && (
            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', gridColumn: '1 / -1' }}>
              <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>No pending tasks! Enjoy your day. 🎉</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
