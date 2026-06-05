'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useApp } from '@/context/AppContext';
import { Modal } from '@/components/Modals';
import api from '@/lib/api';
import styles from '../page.module.css';
import {
  Plus, Edit2, Trash2, Layers, Tag, Globe, ClipboardList, Settings, Clock,
  Sun, Moon, HelpCircle,
} from 'lucide-react';
import SOPBuilder from '@/components/admin/SOPBuilder';

function ConfigurationsContent() {
  const searchParams = useSearchParams();
  const {
    currentUser, departments, taskTypes, sources, showToast,
    addDepartment, updateDepartment, deleteDepartment,
    addTaskType, updateTaskType, deleteTaskType,
    addSource, updateSource, deleteSource,
  } = useApp();
  const [activeTab, setActiveTab] = useState<'depts' | 'types' | 'sources' | 'settings'>('depts');
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', departmentId: '' });
  const [isSOPModalOpen, setIsSOPModalOpen] = useState(false);
  const [selectedTaskType, setSelectedTaskType] = useState<{ id: string; name: string } | null>(null);
  const [configs, setConfigs] = useState<any[]>([]);
  const [startTimeVal, setStartTimeVal] = useState('10:00');
  const [endTimeVal, setEndTimeVal] = useState('19:00');

  useEffect(() => {
    const start = configs.find(c => c.key === 'officeStartTime')?.value;
    const end = configs.find(c => c.key === 'officeEndTime')?.value;
    if (start) setStartTimeVal(start);
    if (end) setEndTimeVal(end);
  }, [configs]);

  useEffect(() => {
    if (activeTab === 'settings') {
      fetchConfigs();
    }
  }, [activeTab]);

  // Handle Deep Linking (tab and typeId)
  useEffect(() => {
    const tab = searchParams.get('tab');
    const typeId = searchParams.get('typeId');

    if (tab === 'types') {
      setActiveTab('types');
      if (typeId) {
        // Wait for taskTypes to be loaded
        const type = taskTypes.find(t => t.id === typeId);
        if (type) {
          setSelectedTaskType({ id: type.id, name: type.name });
          setIsSOPModalOpen(true);
        }
      }
    } else if (tab === 'depts') {
      setActiveTab('depts');
    } else if (tab === 'sources') {
      setActiveTab('sources');
    } else if (tab === 'settings') {
      setActiveTab('settings');
    }
  }, [searchParams, taskTypes]);

  const fetchConfigs = async () => {
    try {
      const res = await api.get('/configs');
      if (res.data?.success) setConfigs(res.data.data);
    } catch (err: any) {
      showToast('Error', 'Failed to fetch settings', 'error');
    }
  };

  const handleUpdateConfig = async (key: string, value: string) => {
    try {
      await api.put('/configs', { key, value });
      showToast('Updated', `Setting updated successfully`, 'success');
      fetchConfigs();
    } catch (err: any) {
      showToast('Error', 'Failed to update setting', 'error');
    }
  };

  const to12Hour = (time24: string) => {
    if (!time24) return '—';
    const [h, m] = time24.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
  };

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

  const openAdd = () => {
    setModalMode('add');
    setFormData({ name: '', departmentId: departments[0]?.id || '' });
    setIsModalOpen(true);
  };

  const openEdit = (item: any) => {
    setModalMode('edit');
    setTargetId(item.id);
    setFormData({ name: item.name, departmentId: item.departmentId || '' });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (activeTab === 'depts') {
        if (modalMode === 'add') await addDepartment(formData.name);
        else if (targetId) await updateDepartment(targetId, formData.name);
      } else if (activeTab === 'types') {
        if (modalMode === 'add') await addTaskType({ name: formData.name, departmentId: formData.departmentId });
        else if (targetId) await updateTaskType(targetId, formData.name);
      } else {
        if (modalMode === 'add') await addSource(formData.name);
        else if (targetId) await updateSource(targetId, formData.name);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      showToast('Action Failed', err.response?.data?.message || 'Action failed', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure? This may fail if it is currently in use.')) return;
    try {
      if (activeTab === 'depts') await deleteDepartment(id);
      else if (activeTab === 'types') await deleteTaskType(id);
      else await deleteSource(id);
    } catch (err: any) {
      showToast('Delete Failed', err.response?.data?.message || 'Delete failed', 'error');
    }
  };

  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <main className={styles.main}>
        <Header title="Configurations" subtitle="Master data management for system categories" />

        {/* Tabs */}
        <div className={styles.filterRow} style={{ marginBottom: '2rem' }}>
          <button className={`${styles.filterBtn} ${activeTab === 'depts' ? styles.active : ''}`} onClick={() => setActiveTab('depts')}>
            <Layers size={16} /> Major Heads (Teams)
          </button>
          <button className={`${styles.filterBtn} ${activeTab === 'types' ? styles.active : ''}`} onClick={() => setActiveTab('types')}>
            <Tag size={16} /> Sub-Heads (Task Types)
          </button>
          <button className={`${styles.filterBtn} ${activeTab === 'sources' ? styles.active : ''}`} onClick={() => setActiveTab('sources')}>
            <Globe size={16} /> Lead Sources
          </button>
          <button className={`${styles.filterBtn} ${activeTab === 'settings' ? styles.active : ''}`} onClick={() => setActiveTab('settings')}>
            <Settings size={16} /> System Settings
          </button>
        </div>

        {activeTab !== 'settings' && (
          <>
            <div className={styles.pageTitleRow} style={{ alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h2 style={{ fontSize: '1.75rem', letterSpacing: '-0.5px' }}>
                  {activeTab === 'depts' ? 'Teams' : activeTab === 'types' ? 'Task Types' : 'Lead Sources'}
                </h2>
                <p style={{ fontWeight: 500 }}>
                  Manage list of {activeTab === 'depts' ? 'functional teams' : activeTab === 'types' ? 'services offered' : 'marketing sources'}
                </p>
              </div>
              <button className={styles.primaryBtn} onClick={openAdd} style={{ padding: '0.8rem 1.8rem' }}>
                <Plus size={20} /> Add New
              </button>
            </div>

            <section className="glass-card" style={{ marginTop: '1.5rem' }}>
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      {activeTab === 'types' && <th>Department</th>}
                      <th>Usage Count</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activeTab === 'depts' ? departments : activeTab === 'types' ? taskTypes : sources).map((item: any) => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{item.name}</td>
                        {activeTab === 'types' && <td style={{ fontWeight: 500 }}>{item.department?.name || '—'}</td>}
                        <td>
                          <span style={{
                            background: 'var(--surface-hover)',
                            padding: '0.35rem 0.75rem',
                            borderRadius: '8px',
                            fontWeight: 700,
                            color: 'var(--primary)'
                          }}>
                            {activeTab === 'depts' ? item._count?.tasks || 0 :
                            activeTab === 'types' ? item._count?.tasks || 0 :
                            item._count?.leads || 0}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                            {activeTab === 'types' && (
                          <button 
                            className={styles.iconBtn} 
                            onClick={() => {
                              setSelectedTaskType({ id: item.id, name: item.name });
                              setIsSOPModalOpen(true);
                            }} 
                            title="SOP Workflow" 
                            style={{ width: 36, height: 36, color: 'var(--primary)' }}
                          >
                            <ClipboardList size={16} />
                          </button>
                        )}
                        <button className={styles.iconBtn} onClick={() => openEdit(item)} title="Edit" style={{ width: 36, height: 36 }}>
                              <Edit2 size={16} />
                            </button>
                            <button className={styles.iconBtn} onClick={() => handleDelete(item.id)} title="Delete" style={{ color: 'var(--accent-red)', width: 36, height: 36 }}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {/* System Settings */}
        {activeTab === 'settings' && (
          <section className="glass-card" style={{ padding: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem', color: 'var(--primary)' }}>
              <Clock size={24} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Attendance Timing Configuration</h3>
            </div>
            
            <div>
              {/* Settings Grid */}
              <div className={styles.settingsGrid}>
                {/* Office Start Time Card */}
                <div className={styles.settingsCard}>
                  <div>
                    <div className={styles.settingsCardHeader}>
                      <div className={styles.settingsIconContainer}>
                        <Sun size={20} />
                      </div>
                      <div className={styles.settingsCardInfo}>
                        <span className={styles.settingsCardTitle}>Office Start Time</span>
                        <span className={styles.settingsCardSubtitle}>Cut-off for Late Attendance</span>
                      </div>
                    </div>
                    
                    <div className={styles.settingsInputWrapper}>
                      <input 
                        type="time" 
                        className={styles.settingsTimeInput} 
                        value={startTimeVal}
                        onChange={e => setStartTimeVal(e.target.value)}
                      />
                      {startTimeVal !== (configs.find(c => c.key === 'officeStartTime')?.value || '10:00') && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                          <button 
                            className={styles.submitBtn} 
                            style={{ padding: '0.4rem 1rem', fontSize: '0.75rem' }}
                            onClick={() => handleUpdateConfig('officeStartTime', startTimeVal)}
                          >
                            Save Change
                          </button>
                          <button 
                            className={styles.filterBtn} 
                            style={{ padding: '0.4rem 1rem', fontSize: '0.75rem', borderRadius: '10px' }}
                            onClick={() => setStartTimeVal(configs.find(c => c.key === 'officeStartTime')?.value || '10:00')}
                          >
                            Reset
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <p className={styles.settingsCardFooterText}>
                    Employees checking in <strong>after</strong> this time will be marked as <span style={{ color: 'var(--accent-red)', fontWeight: 700 }}>LATE</span>.
                  </p>
                </div>

                {/* Office End Time Card */}
                <div className={styles.settingsCard}>
                  <div>
                    <div className={styles.settingsCardHeader}>
                      <div className={`${styles.settingsIconContainer} ${styles.sunset}`}>
                        <Moon size={20} />
                      </div>
                      <div className={styles.settingsCardInfo}>
                        <span className={styles.settingsCardTitle}>Office End Time</span>
                        <span className={styles.settingsCardSubtitle}>Standard Shift End</span>
                      </div>
                    </div>
                    
                    <div className={styles.settingsInputWrapper}>
                      <input 
                        type="time" 
                        className={styles.settingsTimeInput} 
                        value={endTimeVal}
                        onChange={e => setEndTimeVal(e.target.value)}
                      />
                      {endTimeVal !== (configs.find(c => c.key === 'officeEndTime')?.value || '19:00') && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                          <button 
                            className={styles.submitBtn} 
                            style={{ padding: '0.4rem 1rem', fontSize: '0.75rem' }}
                            onClick={() => handleUpdateConfig('officeEndTime', endTimeVal)}
                          >
                            Save Change
                          </button>
                          <button 
                            className={styles.filterBtn} 
                            style={{ padding: '0.4rem 1rem', fontSize: '0.75rem', borderRadius: '10px' }}
                            onClick={() => setEndTimeVal(configs.find(c => c.key === 'officeEndTime')?.value || '19:00')}
                          >
                            Reset
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <p className={styles.settingsCardFooterText}>
                    Define the official closing time for shift completion tracking.
                  </p>
                </div>
              </div>
              
              {/* Rules & Regulations Card */}
              <div className={styles.rulesCard}>
                <div className={styles.rulesCardHeader}>
                  <HelpCircle size={18} style={{ color: 'var(--primary)' }} />
                  <h4 className={styles.rulesCardTitle}>Attendance Processing Rules</h4>
                </div>
                
                <div className={styles.rulesList}>
                  <div className={styles.ruleItem}>
                    <span className={`${styles.ruleBadge} ${styles.present}`}>PRESENT</span>
                    <span className={styles.ruleDescription}>If Check-in time is before or equal to the Office Start Time (Start Time)</span>
                  </div>
                  <div className={styles.ruleItem}>
                    <span className={`${styles.ruleBadge} ${styles.late}`}>LATE</span>
                    <span className={styles.ruleDescription}>If Check-in time is after the Office Start Time (Start Time)</span>
                  </div>
                  <div className={styles.ruleItem}>
                    <span className={`${styles.ruleBadge} ${styles.halfday}`}>HALF DAY</span>
                    <span className={styles.ruleDescription}>If total shift working duration is less than 4 hours</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Modal for Lists */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={`${modalMode === 'add' ? 'Add' : 'Edit'} ${activeTab === 'depts' ? 'Department' : activeTab === 'types' ? 'Task Type' : 'Source'}`}
        >
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Name</label>
              <input
                type="text"
                className={styles.input}
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter name..."
              />
            </div>
            {activeTab === 'types' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Department</label>
                <select
                  className={styles.select}
                  required
                  value={formData.departmentId}
                  onChange={e => setFormData({ ...formData, departmentId: e.target.value })}
                >
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
              <button type="button" className={styles.filterBtn} onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button type="submit" className={styles.submitBtn}>
                {modalMode === 'add' ? 'Save New' : 'Update Changes'}
              </button>
            </div>
          </form>
        </Modal>

        {/* SOP Builder Modal */}
        <Modal
          isOpen={isSOPModalOpen}
          onClose={() => setIsSOPModalOpen(false)}
          title="SOP Workflow Manager"
          size="md"
        >
          {selectedTaskType && (
            <SOPBuilder 
              taskTypeId={selectedTaskType.id} 
              taskTypeName={selectedTaskType.name}
              onSave={async () => {
                showToast('Success', 'SOP Workflow updated and applied to existing tasks', 'success');
                setIsSOPModalOpen(false);
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
