'use client';

import { useState } from 'react';
import { useApp, TaskSOPStep } from '@/context/AppContext';
import { CheckCircle2, Circle, Loader2, AlertCircle, Settings, Lock, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import styles from './SOPChecklist.module.css';
import { formatDistanceToNow } from 'date-fns';

interface SOPChecklistProps {
  steps: TaskSOPStep[];
  taskId: string;
  taskTypeId?: string;
  onToggle: (stepId: string, isCompleted: boolean) => Promise<void>;
}

export default function SOPChecklist({ steps, taskId, taskTypeId, onToggle }: SOPChecklistProps) {
  const router = useRouter();
  const { currentUser } = useApp();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

  const completedCount = steps.filter(s => s.isCompleted).length;
  const totalCount = steps.length;
  const percentage = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleToggle = async (stepId: string, currentStatus: boolean) => {
    setLoadingId(stepId);
    try {
      await onToggle(stepId, !currentStatus);
    } catch (error) {
      console.error('Failed to toggle step:', error);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className={styles.container}>
      {/* Header with Progress */}
      <div className={styles.header}>
        <div className={styles.headerTitleRow}>
          <h3 className={styles.title}>SOP Checklist</h3>
          <span className={styles.count}>{completedCount}/{totalCount} completed</span>
        </div>
        
        <div className={styles.progressTrack}>
          <div 
            className={styles.progressBar} 
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Checklist Items */}
      <div className={styles.list}>
        {steps.length === 0 ? (
          <div className={styles.emptyContainer}>
            <div className={styles.warningBox}>
              <AlertCircle size={24} className={styles.warningIcon} />
              <div>
                <p className={styles.warningTitle}>No SOP Defined</p>
                <p className={styles.warningText}>
                  {isAdmin 
                    ? "This task type does not have SOP steps. Configure them to enable tracking." 
                    : "No checklist steps assigned for this task yet."}
                </p>
              </div>
            </div>
            
            {isAdmin && (
              <div className={styles.adminActions}>
                <button 
                  className={styles.configureBtn}
                  onClick={() => router.push(`/configurations?tab=types&typeId=${taskTypeId}`)}
                >
                  <Settings size={14} /> Configure SOP Workflow
                </button>
              </div>
            )}
          </div>
        ) : (
          steps.sort((a, b) => a.order - b.order).map((step, index) => {
            const isLocked = index > 0 && !steps[index - 1].isCompleted;
            const roleHierarchy: Record<string, number> = { 'EMPLOYEE': 1, 'MANAGER': 2, 'ADMIN': 3, 'SUPER_ADMIN': 4 };
            const userRank = roleHierarchy[currentUser?.role || ''] || 0;
            const stepRank = roleHierarchy[step.assignedRole] || 0;
            const hasAccess = userRank >= stepRank || currentUser?.role === 'SUPER_ADMIN';
            
            return (
              <div 
                key={step.id} 
                className={`${styles.item} ${step.isCompleted ? styles.completed : ''} ${isLocked ? styles.locked : ''} ${!hasAccess ? styles.noAccess : ''}`}
                onClick={() => !isLocked && hasAccess && loadingId !== step.id && handleToggle(step.id, step.isCompleted)}
              >
                <div className={styles.iconWrapper}>
                  {loadingId === step.id ? (
                    <Loader2 size={18} className={styles.spin} />
                  ) : isLocked ? (
                    <Lock size={16} className={styles.lockIcon} />
                  ) : step.isCompleted ? (
                    <CheckCircle2 size={18} className={styles.checkedIcon} />
                  ) : (
                    <Circle size={18} className={styles.uncheckedIcon} />
                  )}
                </div>
                
                <div className={styles.stepContent}>
                  <div className={styles.stepTitleRow}>
                    <span className={styles.stepTitle}>{step.title}</span>
                    <div className={styles.stepBadges}>
                      <span className={styles.roleBadge}>{step.assignedRole}</span>
                      {step.dueAt && !step.isCompleted && (
                        <span className={`${styles.deadlineBadge} ${new Date(step.dueAt) < new Date() ? styles.overdue : ''}`}>
                          <Clock size={10} /> {formatDistanceToNow(new Date(step.dueAt))} left
                        </span>
                      )}
                    </div>
                  </div>
                  {isLocked && <p className={styles.lockText}>Complete previous step first</p>}
                  {!hasAccess && <p className={styles.lockText}>Requires {step.assignedRole} role</p>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
