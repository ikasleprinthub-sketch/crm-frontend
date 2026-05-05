'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useApp } from '@/context/AppContext';
import api from '@/lib/api';
import styles from './plans.module.css';
import { Calendar, FileText, Clock, ChevronRight, ChevronDown, CheckCircle2, ListTodo } from 'lucide-react';

interface PlanRecord {
  id: string;
  date: string;
  morningPlan: string | null;
  afternoonPlan: string | null;
  eveningPlan: string | null;
  nightPlan: string | null;
  dayCompletion: string | null;
  status: string;
}

export default function PlansPage() {
  const { currentUser, showToast } = useApp();
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await api.get('/attendance/my');
      if (res.data?.success) {
        setPlans(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch plans:', err);
      showToast('Error', 'Failed to load your work plans.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const hasAnyPlan = (plan: PlanRecord) => {
    return plan.morningPlan || plan.afternoonPlan || plan.eveningPlan || plan.nightPlan || plan.dayCompletion;
  };

  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <main className={styles.main}>
        <Header title="Work Plans" subtitle="Review your daily goals and accomplishments" />

        <div className={styles.container}>
          <div className={styles.statsRow}>
            <div className="glass-card" style={{ padding: '1.5rem', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <div style={{ background: 'rgba(67, 24, 255, 0.1)', color: 'var(--primary)', padding: '0.5rem', borderRadius: '10px' }}>
                  <ListTodo size={20} />
                </div>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Total Plans</h3>
              </div>
              <p style={{ fontSize: '1.5rem', fontWeight: 800 }}>{plans.filter(hasAnyPlan).length}</p>
            </div>
          </div>

          <div className={styles.timeline}>
            {loading ? (
              <div className={styles.empty}>Loading your plans...</div>
            ) : plans.length === 0 ? (
              <div className={styles.empty}>No plan history found.</div>
            ) : (
              plans.filter(hasAnyPlan).map((plan, index) => (
                <div key={plan.id} className={`${styles.planCard} ${expandedId === plan.id ? styles.expanded : ''}`}>
                  <div className={styles.planHeader} onClick={() => toggleExpand(plan.id)}>
                    <div className={styles.dateInfo}>
                      <Calendar size={16} className={styles.icon} />
                      <span className={styles.dateText}>{formatDate(plan.date)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div className={styles.planSummary}>
                        {plan.morningPlan && <span className={styles.dot} title="Morning Plan set"></span>}
                        {plan.afternoonPlan && <span className={`${styles.dot} ${styles.afternoon}`} title="Afternoon Plan set"></span>}
                        {plan.eveningPlan && <span className={`${styles.dot} ${styles.evening}`} title="Evening Plan set"></span>}
                        {plan.nightPlan && <span className={`${styles.dot} ${styles.night}`} title="Night Plan set"></span>}
                        {plan.dayCompletion && <CheckCircle2 size={14} className={styles.doneIcon} />}
                      </div>
                      {expandedId === plan.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </div>
                  </div>

                  {expandedId === plan.id && (
                    <div className={styles.planDetails}>
                      <div className={styles.grid}>
                        <div className={styles.section}>
                          <div className={styles.sectionLabel}>
                            <Clock size={14} /> Morning Plan
                          </div>
                          <div className={styles.content}>
                            {plan.morningPlan || <span className={styles.placeholder}>No plan entered</span>}
                          </div>
                        </div>

                        <div className={styles.section}>
                          <div className={styles.sectionLabel}>
                            <Clock size={14} /> Afternoon Plan
                          </div>
                          <div className={styles.content}>
                            {plan.afternoonPlan || <span className={styles.placeholder}>No plan entered</span>}
                          </div>
                        </div>

                        <div className={styles.section}>
                          <div className={styles.sectionLabel}>
                            <Clock size={14} /> Evening Plan
                          </div>
                          <div className={styles.content}>
                            {plan.eveningPlan || <span className={styles.placeholder}>No plan entered</span>}
                          </div>
                        </div>

                        <div className={styles.section}>
                          <div className={styles.sectionLabel}>
                            <Clock size={14} /> Night Plan
                          </div>
                          <div className={styles.content}>
                            {plan.nightPlan || <span className={styles.placeholder}>No plan entered</span>}
                          </div>
                        </div>

                        <div className={`${styles.section} ${styles.fullWidth}`}>
                          <div className={`${styles.sectionLabel} ${styles.completionLabel}`}>
                            <CheckCircle2 size={14} /> Day Completion Summary
                          </div>
                          <div className={`${styles.content} ${styles.completionContent}`}>
                            {plan.dayCompletion || <span className={styles.placeholder}>No completion summary submitted</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
