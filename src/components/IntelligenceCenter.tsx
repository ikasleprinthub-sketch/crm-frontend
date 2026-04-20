'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { 
  TrendingUp, Users, Activity, Target, 
  Award, Zap, Calendar, ShipWheel, BarChart3,
  AlertCircle
} from 'lucide-react';
import styles from './IntelligenceCenter.module.css';

interface TrendData {
  date: string;
  present: number;
  absent: number;
  late: number;
}

interface PerformanceStats {
  userId: string;
  userName: string;
  role: string;
  attendanceRate: number;
  taskCompletionRate: number;
  leadConversionRate: number;
  performanceScore: number;
}

export default function IntelligenceCenter() {
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [performance, setPerformance] = useState<PerformanceStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setError(null);
        // Explicitly adding api prefix if needed, but api instance handles it
        const [trendsRes, perfRes] = await Promise.all([
          api.get('/intelligence/attendance-trends?days=7'),
          api.get('/intelligence/performance-stats')
        ]);
        
        if (trendsRes.data.success) setTrends(trendsRes.data.data);
        if (perfRes.data.success) setPerformance(perfRes.data.data);
      } catch (err: any) {
        console.error('Error fetching intelligence data:', err);
        setError(err.response?.data?.message || 'Failed to sync with backend intelligence.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Activity size={40} className={styles.pulseIcon} style={{ color: 'var(--primary)' }} />
        <p>Synchronizing Global Intelligence...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.dashboardSection} style={{ border: '2px dashed var(--accent-red)', opacity: 0.8 }}>
        <div className={styles.emptyState}>
          <AlertCircle size={40} style={{ color: 'var(--accent-red)', marginBottom: '1rem' }} />
          <h3>Intelligence Sync Failed</h3>
          <p>{error}</p>
          <button className="primary-btn" style={{ marginTop: '1rem' }} onClick={() => window.location.reload()}>Retry Sync</button>
        </div>
      </div>
    );
  }

  const avgScore = performance.length ? Math.round(performance.reduce((a, b) => a + b.performanceScore, 0) / performance.length) : 0;
  const activeToday = trends.length ? trends[trends.length - 1].present : 0;

  return (
    <div className={styles.container}>
      
      {/* ── Top Intelligence Pulse ── */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.iconBox} style={{ background: 'rgba(67, 24, 255, 0.1)', color: '#4318FF' }}>
            <Users size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{activeToday}</span>
            <span className={styles.statLabel}>Active Members</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.iconBox} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
            <Zap size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{avgScore}%</span>
            <span className={styles.statLabel}>Office Efficiency</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.iconBox} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>
            <Target size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{performance.length}</span>
            <span className={styles.statLabel}>Monitored Entities</span>
          </div>
        </div>
      </div>

      {/* ── Attendance Pulse Chart ── */}
      <section className={styles.dashboardSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.titleArea}>
            <div className={styles.iconBox} style={{ background: 'var(--primary-light)', color: 'var(--primary)', width: 40, height: 40 }}>
              <TrendingUp size={20} />
            </div>
            <div>
              <span className={styles.titleMain}>Attendance Heatmap</span>
              <p className={styles.titleSub}>Presence trends for the trailing 7 days</p>
            </div>
          </div>
          <div className={styles.roleTag}>REAL-TIME PULSE</div>
        </div>

        <div className={styles.trendRow}>
          {trends.map((day) => {
            const total = day.present + day.absent + day.late || 1;
            const presPct = (day.present / total) * 100;
            const latePct = (day.late / total) * 100;
            
            return (
              <div key={day.date} className={styles.trendCol}>
                <div className={styles.barGroup}>
                  <div className={styles.bar} style={{ height: `${presPct}%`, background: 'var(--accent-green)' }}></div>
                  <div className={styles.bar} style={{ height: `${latePct}%`, background: 'var(--accent-yellow)' }}></div>
                </div>
                <span className={styles.barDate}>{new Date(day.date).toLocaleDateString([], { weekday: 'short' })}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Performance Leaderboard ── */}
      <section className={styles.dashboardSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.titleArea}>
            <div className={styles.iconBox} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', width: 40, height: 40 }}>
              <Award size={20} />
            </div>
            <div>
              <span className={styles.titleMain}>Performance Rankings</span>
              <p className={styles.titleSub}>Ranked by weighted efficiency score</p>
            </div>
          </div>
          <BarChart3 size={20} style={{ color: 'var(--text-secondary)' }} />
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.performanceTable}>
            <thead>
              <tr>
                <th>Member</th>
                <th>Attendance</th>
                <th>Task Focus</th>
                <th>Lead Score</th>
                <th>Global Efficiency</th>
              </tr>
            </thead>
            <tbody>
              {performance.sort((a,b) => b.performanceScore - a.performanceScore).map((user) => (
                <tr key={user.userId}>
                  <td>
                    <div className={styles.userCell}>
                      <div className={styles.avatar}>{user.userName.charAt(0)}</div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{user.userName}</div>
                        <span className={styles.roleTag}>{user.role.replace('_',' ')}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className={styles.metricBox}>
                      <div className={styles.progressBar}>
                        <div className={styles.progressFill} style={{ width: `${user.attendanceRate}%`, background: '#10B981' }}></div>
                      </div>
                      <span className={styles.metricVal}>{user.attendanceRate}%</span>
                    </div>
                  </td>
                  <td>
                    <div className={styles.metricBox}>
                      <div className={styles.progressBar}>
                        <div className={styles.progressFill} style={{ width: `${user.taskCompletionRate}%`, background: '#4318FF' }}></div>
                      </div>
                      <span className={styles.metricVal}>{user.taskCompletionRate}%</span>
                    </div>
                  </td>
                  <td>
                    <div className={styles.metricBox}>
                      <div className={styles.progressBar}>
                        <div className={styles.progressFill} style={{ width: `${user.leadConversionRate}%`, background: '#F59E0B' }}></div>
                      </div>
                      <span className={styles.metricVal}>{user.leadConversionRate}%</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className={styles.scoreBadge} style={{ 
                      background: user.performanceScore > 85 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(67, 24, 255, 0.05)', 
                      color: user.performanceScore > 85 ? '#10B981' : '#4318FF' 
                    }}>
                      {user.performanceScore} / 100
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
