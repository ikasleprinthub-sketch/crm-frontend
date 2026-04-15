'use client';
import { TaskSOPStep } from '@/context/AppContext';
import styles from './SOPList.module.css';

interface SOPListProps {
  steps: TaskSOPStep[];
  onToggle: (stepId: string, completed: boolean) => void;
}

export default function SOPList({ steps, onToggle }: SOPListProps) {
  const completedCount = steps.filter(s => s.isCompleted).length;
  const progress = steps.length ? Math.round((completedCount / steps.length) * 100) : 0;

  return (
    <div className={styles.sopWrapper}>
      <div className={styles.progressHeader}>
        <span className={styles.progressLabel}>Task Progress</span>
        <span className={styles.progressValue}>{progress}%</span>
      </div>
      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${progress}%` }}></div>
      </div>
      
      <div className={styles.stepList}>
        {steps.map((step) => (
          <label key={step.id} className={`${styles.stepItem} ${step.isCompleted ? styles.completed : ''}`}>
            <input 
              type="checkbox" 
              checked={step.isCompleted} 
              onChange={(e) => onToggle(step.id, e.target.checked)}
            />
            <span className={styles.checkmark}></span>
            <span className={styles.stepLabel}>{step.title}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
