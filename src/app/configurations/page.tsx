'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useApp } from '@/context/AppContext';
import { Modal } from '@/components/Modals';
import api from '@/lib/api';
import styles from './configurations.module.css';
import {
  Plus, Edit2, Trash2, Layers, Tag, Globe,
  ToggleLeft, ToggleRight, Users, CheckCircle, XCircle, BarChart2,
  ClipboardList, TrendingUp, Search, X
} from 'lucide-react';
import SOPBuilder from '@/components/admin/SOPBuilder';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Department {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: { taskTypes: number; leads: number; tasks: number };
}

interface TaskType {
  id: string;
  name: string;
  departmentId: string;
  description: string | null;
  slaDays: number;
  defaultPriority: 'REGULAR' | 'IMPORTANT' | 'URGENT';
  isActive: boolean;
  createdAt: string;
  department?: { id: string; name: string };
  sopTemplate?: { id: string } | null;
  _count?: { leads: number; tasks: number };
}

interface SourceOfLead {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: { leads: number };
}

interface SourceAnalytics extends SourceOfLead {
  total: number;
  converted: number;
  lost: number;
  active: number;
  conversionRate: number;
}

const PRIORITY_COLORS: Record<string, string> = {
  REGULAR: 'var(--primary)',
  IMPORTANT: 'var(--accent-yellow)',
  URGENT: 'var(--accent-red)',
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatBadge({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: color || 'var(--primary)' }}>{value}</div>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    </div>
  );
}

function StatusToggle({ isActive, onToggle, disabled }: { isActive: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      title={isActive ? 'Disable' : 'Enable'}
      className={`${styles.switchToggle} ${isActive ? styles.switchActive : ''}`}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <span className={styles.switchHandle} />
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function ConfigurationsContent() {
  const searchParams = useSearchParams();
  const { currentUser, showToast } = useApp();

  const [activeTab, setActiveTab] = useState<'depts' | 'types' | 'sources'>('depts');

  // Departments
  const [departments, setDepartments] = useState<Department[]>([]);
  const [deptLoading, setDeptLoading] = useState(false);
  const [deptModal, setDeptModal] = useState(false);
  const [deptEdit, setDeptEdit] = useState<Department | null>(null);
  const [deptForm, setDeptForm] = useState({ name: '', code: '', description: '' });

  // Task Types
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [ttLoading, setTtLoading] = useState(false);
  const [ttModal, setTtModal] = useState(false);
  const [ttEdit, setTtEdit] = useState<TaskType | null>(null);
  const [ttForm, setTtForm] = useState<{ name: string; departmentId: string; description: string; slaDays: number; defaultPriority: 'REGULAR' | 'IMPORTANT' | 'URGENT' }>({ name: '', departmentId: '', description: '', slaDays: 3, defaultPriority: 'REGULAR' });
  const [ttDeptFilter, setTtDeptFilter] = useState('');
  const [ttSearch, setTtSearch] = useState('');
  const [sopModal, setSopModal] = useState(false);
  const [sopTarget, setSopTarget] = useState<{ id: string; name: string } | null>(null);

  // Sources
  const [sources, setSources] = useState<SourceAnalytics[]>([]);
  const [srcLoading, setSrcLoading] = useState(false);
  const [srcModal, setSrcModal] = useState(false);
  const [srcEdit, setSrcEdit] = useState<SourceOfLead | null>(null);
  const [srcForm, setSrcForm] = useState({ name: '', description: '' });


  // ── Loaders ────────────────────────────────────────────────────────────────

  const loadDepartments = useCallback(async (showLoader = true) => {
    if (showLoader) setDeptLoading(true);
    try {
      const res = await api.get('/departments');
      if (res.data?.success) setDepartments(res.data.data);
    } catch { showToast('Error', 'Failed to load departments', 'error'); }
    finally { if (showLoader) setDeptLoading(false); }
  }, [showToast]);

  const loadTaskTypes = useCallback(async (showLoader = true) => {
    if (showLoader) setTtLoading(true);
    try {
      const res = await api.get('/task-types');
      if (res.data?.success) setTaskTypes(res.data.data);
    } catch { showToast('Error', 'Failed to load task types', 'error'); }
    finally { if (showLoader) setTtLoading(false); }
  }, [showToast]);

  const loadSources = useCallback(async (showLoader = true) => {
    if (showLoader) setSrcLoading(true);
    try {
      const res = await api.get('/sources/analytics');
      if (res.data?.success) setSources(res.data.data);
    } catch { showToast('Error', 'Failed to load sources', 'error'); }
    finally { if (showLoader) setSrcLoading(false); }
  }, [showToast]);

  useEffect(() => {
    if (activeTab === 'depts') loadDepartments();
    else if (activeTab === 'types') { loadTaskTypes(); if (!departments.length) loadDepartments(); }
    else if (activeTab === 'sources') loadSources();
  }, [activeTab]);

  // Deep-link support
  useEffect(() => {
    const tab = searchParams.get('tab');
    const typeId = searchParams.get('typeId');
    if (tab === 'types') {
      setActiveTab('types');
      if (typeId) {
        const tt = taskTypes.find(t => t.id === typeId);
        if (tt) { setSopTarget({ id: tt.id, name: tt.name }); setSopModal(true); }
      }
    } else if (tab === 'depts') setActiveTab('depts');
    else if (tab === 'sources') setActiveTab('sources');
  }, [searchParams, taskTypes]);

  // ── Department handlers ────────────────────────────────────────────────────

  const openDeptAdd = () => { setDeptEdit(null); setDeptForm({ name: '', code: '', description: '' }); setDeptModal(true); };
  const openDeptEdit = (d: Department) => { setDeptEdit(d); setDeptForm({ name: d.name, code: d.code || '', description: d.description || '' }); setDeptModal(true); };

  const saveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (deptEdit) {
        await api.put(`/departments/${deptEdit.id}`, deptForm);
        showToast('Updated', 'Department updated', 'success');
      } else {
        await api.post('/departments', deptForm);
        showToast('Created', 'Department created', 'success');
      }
      setDeptModal(false);
      loadDepartments();
    } catch (err: any) { showToast('Error', err.response?.data?.message || 'Action failed', 'error'); }
  };

  const toggleDept = async (d: Department) => {
    try {
      await api.patch(`/departments/${d.id}/status`);
      showToast('Updated', `Department ${d.isActive ? 'disabled' : 'enabled'}`, 'success');
      loadDepartments(false);
    } catch (err: any) { showToast('Error', err.response?.data?.message || 'Toggle failed', 'error'); }
  };

  const deleteDept = async (d: Department) => {
    if (!confirm(`Delete "${d.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/departments/${d.id}`);
      showToast('Deleted', 'Department deleted', 'success');
      loadDepartments();
    } catch (err: any) { showToast('Error', err.response?.data?.message || 'Delete failed', 'error'); }
  };

  // ── Task Type handlers ─────────────────────────────────────────────────────

  const openTtAdd = () => { setTtEdit(null); setTtForm({ name: '', departmentId: departments[0]?.id || '', description: '', slaDays: 3, defaultPriority: 'REGULAR' }); setTtModal(true); };
  const openTtEdit = (tt: TaskType) => {
    setTtEdit(tt);
    setTtForm({ name: tt.name, departmentId: tt.departmentId, description: tt.description || '', slaDays: tt.slaDays, defaultPriority: tt.defaultPriority });
    setTtModal(true);
  };

  const saveTt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (ttEdit) {
        await api.put(`/task-types/${ttEdit.id}`, ttForm);
        showToast('Updated', 'Task type updated', 'success');
      } else {
        await api.post('/task-types', ttForm);
        showToast('Created', 'Task type created', 'success');
      }
      setTtModal(false);
      loadTaskTypes();
    } catch (err: any) { showToast('Error', err.response?.data?.message || 'Action failed', 'error'); }
  };

  const toggleTt = async (tt: TaskType) => {
    try {
      await api.patch(`/task-types/${tt.id}/status`);
      showToast('Updated', `Task type ${tt.isActive ? 'disabled' : 'enabled'}`, 'success');
      loadTaskTypes(false);
    } catch (err: any) { showToast('Error', err.response?.data?.message || 'Toggle failed', 'error'); }
  };

  const deleteTt = async (tt: TaskType) => {
    if (!confirm(`Delete "${tt.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/task-types/${tt.id}`);
      showToast('Deleted', 'Task type deleted', 'success');
      loadTaskTypes();
    } catch (err: any) { showToast('Error', err.response?.data?.message || 'Delete failed', 'error'); }
  };

  // ── Source handlers ────────────────────────────────────────────────────────

  const openSrcAdd = () => { setSrcEdit(null); setSrcForm({ name: '', description: '' }); setSrcModal(true); };
  const openSrcEdit = (s: SourceOfLead) => { setSrcEdit(s); setSrcForm({ name: s.name, description: s.description || '' }); setSrcModal(true); };

  const saveSrc = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (srcEdit) {
        await api.put(`/sources/${srcEdit.id}`, srcForm);
        showToast('Updated', 'Source updated', 'success');
      } else {
        await api.post('/sources', srcForm);
        showToast('Created', 'Source created', 'success');
      }
      setSrcModal(false);
      loadSources();
    } catch (err: any) { showToast('Error', err.response?.data?.message || 'Action failed', 'error'); }
  };

  const toggleSrc = async (s: SourceAnalytics) => {
    try {
      await api.patch(`/sources/${s.id}/status`);
      showToast('Updated', `Source ${s.isActive ? 'disabled' : 'enabled'}`, 'success');
      loadSources(false);
    } catch (err: any) { showToast('Error', err.response?.data?.message || 'Toggle failed', 'error'); }
  };

  const deleteSrc = async (s: SourceAnalytics) => {
    if (!confirm(`Delete "${s.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/sources/${s.id}`);
      showToast('Deleted', 'Source deleted', 'success');
      loadSources();
    } catch (err: any) { showToast('Error', err.response?.data?.message || 'Delete failed', 'error'); }
  };

  // ── Access guard ───────────────────────────────────────────────────────────

  if (currentUser?.role !== 'SUPER_ADMIN' && currentUser?.role !== 'ADMIN') {
    return (
      <div className={styles.wrapper}>
        <Sidebar />
        <main className={styles.main}>
          <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', marginTop: '2rem' }}>
            <h2 style={{ color: 'var(--accent-red)' }}>Access Denied</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Only administrators can access Configurations.</p>
          </div>
        </main>
      </div>
    );
  }

  // ── Derived stats ──────────────────────────────────────────────────────────

  const activeDepts = departments.filter(d => d.isActive).length;
  const activeTt = taskTypes.filter(t => t.isActive).length;
  const totalLeadsFromSources = sources.reduce((s, x) => s + x.total, 0);
  const totalConverted = sources.reduce((s, x) => s + x.converted, 0);
  const avgConversion = totalLeadsFromSources > 0 ? Math.round((totalConverted / totalLeadsFromSources) * 100) : 0;

  const filteredTt = taskTypes.filter(t =>
    (!ttDeptFilter || t.departmentId === ttDeptFilter) &&
    (!ttSearch || t.name.toLowerCase().includes(ttSearch.toLowerCase()) || t.description?.toLowerCase().includes(ttSearch.toLowerCase()))
  );

  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <main className={styles.main}>
        <Header title="Configurations" subtitle="Master data management" />

        {/* Sticky Tab Bar */}
        <div className={styles.stickyTabs}>
          <div className={styles.filterRow} style={{ marginBottom: 0 }}>
            {([
              { key: 'depts', label: 'Teams', icon: <Layers size={15} /> },
              { key: 'types', label: 'Task Types', icon: <Tag size={15} /> },
              { key: 'sources', label: 'Lead Sources', icon: <Globe size={15} /> },
            ] as const).map(tab => (
              <button
                key={tab.key}
                className={`${styles.filterBtn} ${activeTab === tab.key ? styles.active : ''}`}
                onClick={() => setActiveTab(tab.key)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── DEPARTMENTS ── */}
        {activeTab === 'depts' && (
          <>
            {/* Summary stats */}
            <div className={styles.statGrid}>
              {[
                { label: 'Total Teams', value: departments.length, color: 'var(--primary)', icon: <Layers size={20} /> },
                { label: 'Active', value: activeDepts, color: 'var(--accent-green)', icon: <CheckCircle size={20} /> },
                { label: 'Inactive', value: departments.length - activeDepts, color: 'var(--text-muted)', icon: <XCircle size={20} /> },
              ].map(s => (
                <div key={s.label} className={styles.statCard}>
                  <div className={styles.statIconContainer} style={{ background: `${s.color}12`, color: s.color }}>{s.icon}</div>
                  <div>
                    <div className={styles.statValue} style={{ color: s.color }}>{s.value}</div>
                    <div className={styles.statLabel}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.pageTitleRow} style={{ alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2>Teams</h2>
                <p>Manage functional teams and departments</p>
              </div>
              <button className={styles.primaryBtn} onClick={openDeptAdd}><Plus size={18} /> Add Team</button>
            </div>

            {deptLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading...</div>
            ) : (
              <div className={styles.cardGrid}>
                {departments.map(dept => (
                  <div key={dept.id} className={styles.dataCard} style={{ opacity: dept.isActive ? 1 : 0.65 }}>
                    <div className={styles.cardHeader}>
                      <div className={styles.cardTitleArea}>
                        <div className={styles.badgeRow}>
                          <h3 className={styles.cardTitle}>{dept.name}</h3>
                          {dept.code && (
                            <span className={`${styles.cardBadge} ${styles.cardBadgeCode}`}>
                              {dept.code}
                            </span>
                          )}
                          <span className={`${styles.cardBadge} ${dept.isActive ? styles.cardBadgeActive : styles.cardBadgeInactive}`}>
                            {dept.isActive ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </div>
                        {dept.description && <p className={styles.cardDesc}>{dept.description}</p>}
                      </div>
                    </div>

                    <div className={styles.cardStats}>
                      <div className={styles.statBadgeItem}>
                        <div className={styles.statBadgeValue} style={{ color: 'var(--primary)' }}>{dept._count?.taskTypes ?? 0}</div>
                        <div className={styles.statBadgeLabel}>Task Types</div>
                      </div>
                      <div className={styles.statBadgeItem}>
                        <div className={styles.statBadgeValue} style={{ color: 'var(--accent-yellow)' }}>{dept._count?.tasks ?? 0}</div>
                        <div className={styles.statBadgeLabel}>Tasks</div>
                      </div>
                      <div className={styles.statBadgeItem}>
                        <div className={styles.statBadgeValue} style={{ color: 'var(--accent-green)' }}>{dept._count?.leads ?? 0}</div>
                        <div className={styles.statBadgeLabel}>Leads</div>
                      </div>
                    </div>

                    <div className={styles.cardActions}>
                      <StatusToggle isActive={dept.isActive} onToggle={() => toggleDept(dept)} />
                      <button className={styles.iconBtn} onClick={() => openDeptEdit(dept)} title="Edit"><Edit2 size={15} /></button>
                      <button className={`${styles.iconBtn} ${styles.iconBtnDanger}`} onClick={() => deleteDept(dept)} title="Delete"><Trash2 size={15} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── TASK TYPES ── */}
        {activeTab === 'types' && (
          <>
            <div className={styles.statGrid}>
              {[
                { label: 'Total Types', value: taskTypes.length, color: 'var(--primary)', icon: <Tag size={20} /> },
                { label: 'Active', value: activeTt, color: 'var(--accent-green)', icon: <CheckCircle size={20} /> },
                { label: 'With SOP', value: taskTypes.filter(t => t.sopTemplate).length, color: 'var(--accent-yellow)', icon: <ClipboardList size={20} /> },
              ].map(s => (
                <div key={s.label} className={styles.statCard}>
                  <div className={styles.statIconContainer} style={{ background: `${s.color}12`, color: s.color }}>{s.icon}</div>
                  <div>
                    <div className={styles.statValue} style={{ color: s.color }}>{s.value}</div>
                    <div className={styles.statLabel}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.pageTitleRow} style={{ alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Task Types</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Services and task categories</p>
                </div>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                  <input
                    className={styles.input}
                    value={ttSearch}
                    onChange={e => setTtSearch(e.target.value)}
                    placeholder="Search task types..."
                    style={{ paddingLeft: '2rem', paddingRight: '2rem', fontSize: '0.85rem', padding: '0.5rem 2rem 0.5rem 2rem', minWidth: 200 }}
                  />
                  {ttSearch && (
                    <button
                      onClick={() => setTtSearch('')}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-secondary)',
                        padding: 0,
                        display: 'flex'
                      }}
                      title="Clear search"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <select
                  className={styles.select}
                  value={ttDeptFilter}
                  onChange={e => setTtDeptFilter(e.target.value)}
                  style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', minWidth: 160 }}
                >
                  <option value="">All Departments</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <button className={styles.primaryBtn} onClick={openTtAdd}><Plus size={18} /> Add Type</button>
            </div>

            {ttLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading...</div>
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Department</th>
                      <th>SLA</th>
                      <th>Priority</th>
                      <th>Usage</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTt.map(tt => (
                      <tr key={tt.id} style={{ opacity: tt.isActive ? 1 : 0.55 }}>
                        <td>
                          <div style={{ fontWeight: 750, color: 'var(--text-primary)' }}>{tt.name}</div>
                          {tt.description && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{tt.description}</div>}
                        </td>
                        <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>{tt.department?.name || '—'}</td>
                        <td>
                          <span style={{ background: 'var(--background)', padding: '0.25rem 0.6rem', borderRadius: '8px', fontWeight: 800, fontSize: '0.8rem' }}>
                            {tt.slaDays}d
                          </span>
                        </td>
                        <td>
                          <span style={{ padding: '0.25rem 0.6rem', borderRadius: '8px', fontWeight: 800, fontSize: '0.75rem', background: `${PRIORITY_COLORS[tt.defaultPriority]}18`, color: PRIORITY_COLORS[tt.defaultPriority] }}>
                            {tt.defaultPriority}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                            <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{tt._count?.tasks ?? 0}</span> tasks ·{' '}
                            <span style={{ fontWeight: 800, color: 'var(--accent-green)' }}>{tt._count?.leads ?? 0}</span> leads
                          </div>
                        </td>
                        <td>
                          <span className={`${styles.cardBadge} ${tt.isActive ? styles.cardBadgeActive : styles.cardBadgeInactive}`}>
                            {tt.isActive ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', alignItems: 'center' }}>
                            <StatusToggle isActive={tt.isActive} onToggle={() => toggleTt(tt)} />
                            <button className={styles.iconBtn} onClick={() => { setSopTarget({ id: tt.id, name: tt.name }); setSopModal(true); }} title="SOP Workflow"><ClipboardList size={14} /></button>
                            <button className={styles.iconBtn} onClick={() => openTtEdit(tt)} title="Edit"><Edit2 size={14} /></button>
                            <button className={`${styles.iconBtn} ${styles.iconBtnDanger}`} onClick={() => deleteTt(tt)} title="Delete"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredTt.length === 0 && (
                      <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No task types found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── LEAD SOURCES ── */}
        {activeTab === 'sources' && (
          <>
            {/* Analytics summary */}
            <div className={styles.statGrid}>
              {[
                { label: 'Total Leads', value: totalLeadsFromSources, color: 'var(--primary)', icon: <Users size={20} /> },
                { label: 'Converted', value: totalConverted, color: 'var(--accent-green)', icon: <TrendingUp size={20} /> },
                { label: 'Lost', value: sources.reduce((s, x) => s + x.lost, 0), color: 'var(--accent-red)', icon: <XCircle size={20} /> },
                { label: 'Avg Conversion', value: `${avgConversion}%`, color: 'var(--accent-yellow)', icon: <BarChart2 size={20} /> },
              ].map(s => (
                <div key={s.label} className={styles.statCard}>
                  <div className={styles.statIconContainer} style={{ background: `${s.color}12`, color: s.color }}>{s.icon}</div>
                  <div>
                    <div className={styles.statValue} style={{ color: s.color }}>{s.value}</div>
                    <div className={styles.statLabel}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.pageTitleRow} style={{ alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2>Lead Sources</h2>
                <p>Marketing channels and conversion analytics</p>
              </div>
              <button className={styles.primaryBtn} onClick={openSrcAdd}><Plus size={18} /> Add Source</button>
            </div>

            {srcLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading...</div>
            ) : (
              <div className={styles.cardGrid}>
                {sources.map(src => (
                  <div key={src.id} className={styles.dataCard} style={{ opacity: src.isActive ? 1 : 0.65 }}>
                    <div className={styles.cardHeader}>
                      <div className={styles.cardTitleArea}>
                        <div className={styles.badgeRow}>
                          <h3 className={styles.cardTitle}>{src.name}</h3>
                          <span className={`${styles.cardBadge} ${src.isActive ? styles.cardBadgeActive : styles.cardBadgeInactive}`}>
                            {src.isActive ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </div>
                        {src.description && <p className={styles.cardDesc}>{src.description}</p>}
                      </div>
                    </div>


                    <div className={styles.cardStats}>
                      <div className={styles.statBadgeItem}>
                        <div className={styles.statBadgeValue}>{src.total}</div>
                        <div className={styles.statBadgeLabel}>Total</div>
                      </div>
                      <div className={styles.statBadgeItem}>
                        <div className={styles.statBadgeValue} style={{ color: 'var(--primary)' }}>{src.active}</div>
                        <div className={styles.statBadgeLabel}>Active</div>
                      </div>
                      <div className={styles.statBadgeItem}>
                        <div className={styles.statBadgeValue} style={{ color: 'var(--accent-green)' }}>{src.converted}</div>
                        <div className={styles.statBadgeLabel}>Converted</div>
                      </div>
                      <div className={styles.statBadgeItem}>
                        <div className={styles.statBadgeValue} style={{ color: 'var(--accent-red)' }}>{src.lost}</div>
                        <div className={styles.statBadgeLabel}>Lost</div>
                      </div>
                    </div>

                    <div className={styles.cardActions}>
                      <StatusToggle isActive={src.isActive} onToggle={() => toggleSrc(src)} />
                      <button className={styles.iconBtn} onClick={() => openSrcEdit(src)} title="Edit"><Edit2 size={15} /></button>
                      <button className={`${styles.iconBtn} ${styles.iconBtnDanger}`} onClick={() => deleteSrc(src)} title="Delete"><Trash2 size={15} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── DEPT MODAL ── */}
        <Modal isOpen={deptModal} onClose={() => setDeptModal(false)} title={deptEdit ? 'Edit Team' : 'Add Team'}>
          <form onSubmit={saveDept} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Team Name *</label>
                <input className={styles.input} required value={deptForm.name} onChange={e => setDeptForm({ ...deptForm, name: e.target.value })} placeholder="e.g. Book Keeping Team" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Code</label>
                <input className={styles.input} value={deptForm.code} onChange={e => setDeptForm({ ...deptForm, code: e.target.value })} placeholder="e.g. BKT" style={{ width: 90, textTransform: 'uppercase' }} maxLength={10} />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Description</label>
              <textarea className={styles.input} value={deptForm.description} onChange={e => setDeptForm({ ...deptForm, description: e.target.value })} placeholder="Brief description of this team..." rows={2} style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button type="button" className={styles.filterBtn} onClick={() => setDeptModal(false)}>Cancel</button>
              <button type="submit" className={styles.submitBtn}>{deptEdit ? 'Update' : 'Create Team'}</button>
            </div>
          </form>
        </Modal>

        {/* ── TASK TYPE MODAL ── */}
        <Modal isOpen={ttModal} onClose={() => setTtModal(false)} title={ttEdit ? 'Edit Task Type' : 'Add Task Type'}>
          <form onSubmit={saveTt} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Name *</label>
              <input className={styles.input} required value={ttForm.name} onChange={e => setTtForm({ ...ttForm, name: e.target.value })} placeholder="e.g. GST Filing" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Department *</label>
              <select className={styles.select} required value={ttForm.departmentId} onChange={e => setTtForm({ ...ttForm, departmentId: e.target.value })}>
                <option value="">Select department...</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Description</label>
              <textarea className={styles.input} value={ttForm.description} onChange={e => setTtForm({ ...ttForm, description: e.target.value })} placeholder="What does this task type involve?" rows={2} style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>SLA Days</label>
                <input type="number" className={styles.input} min={1} max={365} value={ttForm.slaDays} onChange={e => setTtForm({ ...ttForm, slaDays: parseInt(e.target.value) || 3 })} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Default Priority</label>
                <select className={styles.select} value={ttForm.defaultPriority} onChange={e => setTtForm({ ...ttForm, defaultPriority: e.target.value as any })}>
                  <option value="REGULAR">Regular</option>
                  <option value="IMPORTANT">Important</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button type="button" className={styles.filterBtn} onClick={() => setTtModal(false)}>Cancel</button>
              <button type="submit" className={styles.submitBtn}>{ttEdit ? 'Update' : 'Create Type'}</button>
            </div>
          </form>
        </Modal>

        {/* ── SOURCE MODAL ── */}
        <Modal isOpen={srcModal} onClose={() => setSrcModal(false)} title={srcEdit ? 'Edit Source' : 'Add Lead Source'}>
          <form onSubmit={saveSrc} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Source Name *</label>
              <input className={styles.input} required value={srcForm.name} onChange={e => setSrcForm({ ...srcForm, name: e.target.value })} placeholder="e.g. Google Ads, Walk-in, Referral" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Description</label>
              <textarea className={styles.input} value={srcForm.description} onChange={e => setSrcForm({ ...srcForm, description: e.target.value })} placeholder="Brief description of this marketing channel..." rows={2} style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button type="button" className={styles.filterBtn} onClick={() => setSrcModal(false)}>Cancel</button>
              <button type="submit" className={styles.submitBtn}>{srcEdit ? 'Update' : 'Add Source'}</button>
            </div>
          </form>
        </Modal>

        {/* ── SOP MODAL ── */}
        <Modal isOpen={sopModal} onClose={() => setSopModal(false)} title="SOP Workflow Manager" size="md">
          {sopTarget && (
            <SOPBuilder
              taskTypeId={sopTarget.id}
              taskTypeName={sopTarget.name}
              onSave={async () => {
                showToast('Success', 'SOP Workflow updated', 'success');
                setSopModal(false);
              }}
            />
          )}
        </Modal>
      </main>
    </div>
  );
}

export default function ConfigurationsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ConfigurationsContent />
    </Suspense>
  );
}
