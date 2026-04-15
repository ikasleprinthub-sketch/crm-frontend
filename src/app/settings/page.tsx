'use client';
import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useApp } from '@/context/AppContext';
import { Modal } from '@/components/Modals';
import api from '@/lib/api';
import styles from '../page.module.css';
import { Plus, Edit2, Trash2, Layers, Tag, Globe } from 'lucide-react';

export default function SettingsPage() {
  const { currentUser, departments, taskTypes, sources, fetchInitialData } = useApp();
  const [activeTab, setActiveTab] = useState<'depts' | 'types' | 'sources'>('depts');
  
  // Modal states
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', departmentId: '' });

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className={styles.wrapper}>
        <Sidebar />
        <main className={styles.main}>
          <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', marginTop: '2rem' }}>
            <h2 style={{ color: 'var(--accent-red)' }}>Access Denied</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Only administrators can access Configuration.</p>
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

  const openEdit = (item: any, type: string) => {
    setModalMode('edit');
    setTargetId(item.id);
    setFormData({ 
      name: item.name, 
      departmentId: item.departmentId || '' 
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const endpoint = activeTab === 'depts' ? '/departments' : activeTab === 'types' ? '/task-types' : '/sources';
      
      if (modalMode === 'add') {
        await api.post(endpoint, formData);
      } else {
        await api.put(`${endpoint}/${targetId}`, formData);
      }
      
      await fetchInitialData();
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Action failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category? This may fail if it is currently being used by leads or tasks.')) return;
    try {
      const endpoint = activeTab === 'depts' ? '/departments' : activeTab === 'types' ? '/task-types' : '/sources';
      await api.delete(`${endpoint}/${id}`);
      await fetchInitialData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Delete failed');
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

        <div className={styles.pageTitleRow}>
          <div>
            <h2>{activeTab === 'depts' ? 'Teams' : activeTab === 'types' ? 'Task Types' : 'Lead Sources'}</h2>
            <p>Manage list of {activeTab === 'depts' ? 'functional teams' : activeTab === 'types' ? 'services offered' : 'marketing sources'}</p>
          </div>
          <button className={styles.submitBtn} onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={18} /> Add New
          </button>
        </div>

        {/* Table List */}
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
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    {activeTab === 'types' && <td>{item.department?.name || '—'}</td>}
                    <td>
                      {activeTab === 'depts' ? item._count?.tasks || 0 : 
                       activeTab === 'types' ? item._count?.tasks || 0 : 
                       item._count?.leads || 0}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button className={styles.iconBtn} onClick={() => openEdit(item, activeTab)} title="Edit">
                          <Edit2 size={16} />
                        </button>
                        <button className={styles.iconBtn} onClick={() => handleDelete(item.id)} title="Delete" style={{ color: 'var(--accent-red)' }}>
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
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
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

      </main>
    </div>
  );
}
