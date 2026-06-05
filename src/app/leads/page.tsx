'use client';
import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useApp, LeadStatus } from '@/context/AppContext';
import { Modal, AddLeadForm, ConvertLeadForm } from '@/components/Modals';
import styles from '../page.module.css';
import { Trash2, Users, Search, Building, Globe, Calendar, RotateCcw, FolderOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import CustomSelect from '@/components/CustomSelect';
import CustomDatePicker from '@/components/CustomDatePicker';

export default function LeadsPage() {
  const {
    currentUser, leads, addLead, updateLead,
    deleteLead, departments, users, sources,
    taskTypes, searchQuery, showToast, convertLeadToTask
  } = useApp();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [leadToConvert, setLeadToConvert] = useState<any | null>(null);
  const [filter, setFilter] = useState<string>('All');
  const [deptFilter, setDeptFilter] = useState<string>('All');
  const [sourceFilter, setSourceFilter] = useState<string>('All');
  const [leadCategory, setLeadCategory] = useState<string>('All');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  
  const filters: string[] = ['All', 'NEW', 'CONVERTED', 'HOLD_BY_LEAD', 'NOT_RESPONDED', 'DROPPED', 'AWAITING_CONFIRMATION', 'MEETING_SCHEDULED'];

  const filtered = leads.filter(l => {
    const matchesSearch = !searchQuery || 
      l.leadName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      l.leadNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      !!l.contactNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      !!l.email?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filter === 'All' || l.status === filter;
    const matchesDept = deptFilter === 'All' || l.departmentId === deptFilter;
    const matchesSource = sourceFilter === 'All' || l.sourceId === sourceFilter;
    
    const matchesCategory = leadCategory === 'All' 
      ? true 
      : leadCategory === 'New' ? l.status === 'NEW' : l.status !== 'NEW';

    // Date Filtering
    let matchesDate = true;
    if (startDate || endDate) {
      const leadDate = new Date(l.date).getTime();
      if (startDate) matchesDate = matchesDate && leadDate >= startDate.getTime();
      if (endDate) matchesDate = matchesDate && leadDate <= endDate.getTime();
    }

    return matchesStatus && matchesDept && matchesSource && matchesDate && matchesSearch && matchesCategory;
  });

  const getDeptName = (id: string) => departments.find(d => d.id === id)?.name || '—';
  const getUserName = (id: string) => users.find(u => u.id === id)?.name || 'Unassigned';
  const getSourceName = (id: string) => sources.find(s => s.id === id)?.name || '—';

  const getLeadStatusColor = (status: string) => {
    switch (status) {
      case 'NEW': return 'var(--accent-blue)';
      case 'CONVERTED': return 'var(--accent-green)';
      case 'HOLD_BY_LEAD': return 'var(--accent-yellow)';
      case 'NOT_RESPONDED': return 'var(--accent-red)';
      case 'DROPPED': return 'var(--text-secondary)';
      case 'AWAITING_CONFIRMATION': return 'var(--accent-yellow)';
      case 'MEETING_SCHEDULED': return 'var(--accent-purple)';
      default: return 'inherit';
    }
  };

  const getLeadStatusBgColor = (status: string) => {
    switch (status) {
      case 'NEW': return 'rgba(91, 146, 208, 0.12)';
      case 'CONVERTED': return 'rgba(16, 185, 129, 0.12)';
      case 'HOLD_BY_LEAD': return 'rgba(245, 158, 11, 0.12)';
      case 'NOT_RESPONDED': return 'rgba(239, 68, 68, 0.12)';
      case 'DROPPED': return 'rgba(148, 163, 184, 0.12)';
      case 'AWAITING_CONFIRMATION': return 'rgba(245, 158, 11, 0.12)';
      case 'MEETING_SCHEDULED': return 'rgba(167, 139, 250, 0.12)';
      default: return 'transparent';
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'CONVERTED': return 'badge-converted';
      case 'NEW': return 'badge-new';
      case 'DROPPED': return 'badge-dropped';
      case 'NOT_RESPONDED': return 'badge-notresponded';
      default: return 'badge-new';
    }
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
              label="Lead Category"
              icon={<Users size={14} />}
              value={leadCategory}
              onChange={setLeadCategory}
              options={[
                { id: 'All', name: 'All Categories' },
                { id: 'New', name: 'New Leads (NEW Status)' },
                { id: 'Old', name: 'Old Leads (Other Status)' }
              ]}
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
              onClick={() => { setFilter('All'); setDeptFilter('All'); setSourceFilter('All'); setLeadCategory('All'); setStartDate(null); setEndDate(null); }}
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
                      <span
                        style={{ fontWeight: 600, color: 'var(--primary)', cursor: 'pointer' }}
                        onClick={() => router.push(`/leads/${lead.id}`)}
                      >
                        {lead.leadNo}
                      </span>
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
                      {lead.date ? new Date(lead.date).toLocaleDateString('en-GB') : '—'}
                    </td>
                    <td>
                      <CustomSelect
                        size="sm"
                        options={filters.filter(f => f !== 'All').map(s => ({ id: s, name: s.replace(/_/g, ' ') }))}
                        value={lead.status}
                        onChange={async (val) => {
                          if (val === 'CONVERTED') {
                            setLeadToConvert(lead);
                          } else {
                            try {
                              await updateLead(lead.id, { status: val as LeadStatus });
                              showToast('Status Updated', `Lead ${lead.leadNo} status changed to ${val}`, 'success');
                            } catch (e: any) {
                              showToast('Update Failed', e.response?.data?.message || e.message, 'error');
                            }
                          }
                        }}
                      />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <button className={styles.iconBtn} onClick={() => router.push(`/leads/${lead.id}`)} title="View & Upload Documents">
                          <FolderOpen size={16} />
                        </button>
                        <button className={styles.iconBtn} onClick={() => {
                          showToast(
                            'Delete Lead?',
                            'Are you sure you want to remove this lead from the pipeline?',
                            'confirm',
                            async () => {
                              try {
                                await deleteLead(lead.id);
                                showToast('Lead Deleted', 'The lead has been removed.', 'success');
                              } catch (e: any) {
                                console.error('Delete lead UI error:', e);
                              }
                            }
                          );
                        }} title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </div>
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
          <AddLeadForm
            onSubmit={async (data) => {
              const lead = await addLead(data);
              showToast('Lead Created', `${data.leadName} added. Upload documents below.`, 'success');
              return lead;
            }}
            onClose={() => setIsModalOpen(false)}
          />
        </Modal>

        <Modal isOpen={!!leadToConvert} onClose={() => setLeadToConvert(null)} title="Convert Lead to Return Filing Task" size="lg">
          {leadToConvert && (
            <ConvertLeadForm
              lead={leadToConvert}
              onSubmit={async (data) => {
                try {
                  await convertLeadToTask(leadToConvert.id, data);
                  setLeadToConvert(null);
                  showToast('Lead Converted', `Lead ${leadToConvert.leadNo} successfully converted to task.`, 'success');
                } catch (e: any) {
                  showToast('Conversion Failed', e.message, 'error');
                }
              }}
              onCancel={() => setLeadToConvert(null)}
            />
          )}
        </Modal>
      </main>
    </div>
  );
}
