'use client';
import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useApp } from '@/context/AppContext';
import { Modal } from '@/components/Modals';
import api from '@/lib/api';
import styles from '../page.module.css';
import settingsStyles from './settings.module.css';
import {
  Plus, Edit2, Trash2, Layers, Tag, Globe, ClipboardList
} from 'lucide-react';
import SOPBuilder from '@/components/admin/SOPBuilder';

export default function ConfigurationsPage() {
  const { currentUser, departments, taskTypes, sources, fetchInitialData, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'depts' | 'types' | 'sources'>('depts');
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', departmentId: '' });
  const [isSOPModalOpen, setIsSOPModalOpen] = useState(false);
  const [selectedTaskType, setSelectedTaskType] = useState<{ id: string; name: string } | null>(null);

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
      const endpoint =
        activeTab === 'depts' ? '/departments' :
        activeTab === 'types' ? '/task-types' : '/sources';
      if (modalMode === 'add') {
        await api.post(endpoint, formData);
      } else {
        await api.put(`${endpoint}/${targetId}`, formData);
      }
      await fetchInitialData();
      setIsModalOpen(false);
    } catch (err: any) {
      showToast('Action Failed', err.response?.data?.message || 'Action failed', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure? This may fail if it is currently in use.')) return;
    try {
      const endpoint =
        activeTab === 'depts' ? '/departments' :
        activeTab === 'types' ? '/task-types' : '/sources';
      await api.delete(`${endpoint}/${id}`);
      await fetchInitialData();
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
        </div>

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

        {/* Modal */}
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
              onSave={() => {
                showToast('Success', 'SOP Workflow updated successfully', 'success');
                setIsSOPModalOpen(false);
              }}
            />
          )}
        </Modal>
      </main>
    </div>
  );
}
