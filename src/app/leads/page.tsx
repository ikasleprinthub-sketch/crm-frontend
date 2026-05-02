'use client';
import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useApp, LeadStatus } from '@/context/AppContext';
import { Modal, AddLeadForm } from '@/components/Modals';
import styles from '../page.module.css';
import { Trash2, Users, Search, Building, Globe, Calendar, RotateCcw } from 'lucide-react';
import CustomSelect from '@/components/CustomSelect';
import CustomDatePicker from '@/components/CustomDatePicker';

export default function LeadsPage() {
  const { 
    currentUser, leads, addLead, updateLead, 
    deleteLead, departments, users, sources, 
    taskTypes, searchQuery 
  } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState<string>('All');
  const [deptFilter, setDeptFilter] = useState<string>('All');
  const [sourceFilter, setSourceFilter] = useState<string>('All');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  
  const filters: string[] = ['All', 'NEW', 'CONVERTED', 'HOLD_BY_LEAD', 'NOT_RESPONDED', 'DROPPED', 'AWAITING_CONFIRMATION', 'MEETING_SCHEDULED'];

  const filtered = leads.filter(l => {
    const matchesStatus = filter === 'All' || l.status === filter;
    const matchesDept = deptFilter === 'All' || l.departmentId === deptFilter;
    const matchesSource = sourceFilter === 'All' || l.sourceId === sourceFilter;
    
    let matchesSearch = true;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      matchesSearch = 
        l.leadName.toLowerCase().includes(q) ||
        l.leadNo.toLowerCase().includes(q) ||
        (l.email?.toLowerCase().includes(q) || false) ||
        (l.contactNumber?.toLowerCase().includes(q) || false);
    }

    // Date Filtering
    let matchesDate = true;
    if (startDate || endDate) {
      const leadDate = new Date(l.date).getTime();
      if (startDate) matchesDate = matchesDate && leadDate >= startDate.getTime();
      if (endDate) matchesDate = matchesDate && leadDate <= endDate.getTime();
    }

    return matchesStatus && matchesDept && matchesSource && matchesDate && matchesSearch;
  });

  const getDeptName = (id: string) => departments.find(d => d.id === id)?.name || '—';
  const getUserName = (id: string) => users.find(u => u.id === id)?.name || 'Unassigned';
  const getSourceName = (id: string) => sources.find(s => s.id === id)?.name || '—';

  const statusBadge = (status: string) => {
    return status === 'CONVERTED' ? 'badge-converted' : 'badge-new';
  };

  const statusCounts = filters.reduce((acc, curr) => {
    acc[curr] = curr === 'All' ? leads.length : leads.filter(l => l.status === curr).length;
    return acc;
  }, {} as any);

  if (currentUser?.role === 'EMPLOYEE') {
    return (
      <div className={styles.wrapper}>
        <Sidebar />
        <main className={styles.main}>
          <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', marginTop: '2rem' }}>
            <h2 style={{ color: 'var(--accent-red)' }}>Access Denied</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Employees do not have access to the Leads pipeline.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <main className={styles.main}>
        <Header title="Lead Management" subtitle="Track and convert your incoming clients" />

        <div className={styles.pageTitleRow}>
          <div>
            <h2>All Leads ({leads.length})</h2>
            <p>Manage your sales pipeline and follow up with potential clients</p>
          </div>
          <div className={styles.btnRow}>
            <button className={styles.primaryBtn} onClick={() => setIsModalOpen(true)}>+ New Lead</button>
          </div>
        </div>

        <div className={styles.filterRow}>
          {filters.map(f => (
            <button 
              key={f} 
              className={`${styles.filterBtn} ${filter === f ? styles.active : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.replace(/_/g, ' ')} <span className={styles.badge}>{statusCounts[f] || 0}</span>
            </button>
          ))}
        </div>

        {/* Advanced Filters */}
        <div className={styles.filterCard}>
          <div className={styles.filterGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
            
            <CustomSelect 
              label="Department"
              icon={<Building size={14} />}
              value={deptFilter}
              onChange={setDeptFilter}
              options={[{ id: 'All', name: 'All Departments' }, ...departments.map(d => ({ id: d.id, name: d.name }))]}
            />

            <CustomSelect 
              label="Lead Source"
              icon={<Globe size={14} />}
              value={sourceFilter}
              onChange={setSourceFilter}
              options={[{ id: 'All', name: 'All Sources' }, ...sources.map(s => ({ id: s.id, name: s.name }))]}
            />

            <CustomDatePicker 
              label="From"
              selected={startDate}
              onChange={setStartDate}
            />

            <CustomDatePicker 
              label="To"
              selected={endDate}
              onChange={setEndDate}
            />

            <button 
              className={styles.filterResetBtn} 
              onClick={() => { setFilter('All'); setDeptFilter('All'); setSourceFilter('All'); setStartDate(null); setEndDate(null); }}
            >
              <RotateCcw size={14} /> Reset Filters
            </button>
          </div>
        </div>

        {/* Table */}
        <section className="glass-card">
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Lead No</th>
                  <th>Client Name</th>
                  <th>Phone</th>
                  <th>Source</th>
                  <th>Department</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(lead => (
                  <tr key={lead.id}>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{lead.leadNo}</span>
                    </td>
                    <td>
                      <div>
                        <span style={{ fontWeight: 600 }}>{lead.leadName}</span>
                        {lead.email && <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>{lead.email}</p>}
                      </div>
                    </td>
                    <td>{lead.contactNumber || '—'}</td>
                    <td>{getSourceName(lead.sourceId)}</td>
                    <td>{getDeptName(lead.departmentId)}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {lead.date ? new Date(lead.date).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <select 
                        className={`${styles.badge} ${statusBadge(lead.status)}`}
                        value={lead.status}
                        onChange={e => updateLead(lead.id, { status: e.target.value as LeadStatus })}
                        style={{ border: 'none', cursor: 'pointer', background: 'transparent', fontWeight: 700, fontSize: '0.65rem', padding: '0.25rem 0.5rem' }}
                      >
                        {filters.filter(f => f !== 'All').map(s => (
                          <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button className={styles.iconBtn} onClick={() => deleteLead(lead.id)} title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon} style={{ fontSize: '2rem', color: 'var(--text-secondary)' }}>
                  <Users size={40} />
                </div>
                <p style={{ marginTop: '1rem' }}>No leads found for this filter</p>
              </div>
            )}
          </div>
        </section>

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Lead" size="lg">
          <AddLeadForm onSubmit={(data) => { addLead(data); setIsModalOpen(false); }} />
        </Modal>
      </main>
    </div>
  );
}
