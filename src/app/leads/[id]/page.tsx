'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useApp } from '@/context/AppContext';
import styles from '../../page.module.css';
import { ArrowLeft, Calendar, User, Building, Phone, Mail, FileText, Target, ClipboardList } from 'lucide-react';

export default function LeadDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { leads, departments, sources, taskTypes } = useApp();
  const [lead, setLead] = useState<any>(null);

  useEffect(() => {
    if (id && leads.length > 0) {
      const found = leads.find(l => l.id === id);
      if (found) setLead(found);
    }
  }, [id, leads]);

  if (!lead) {
    return (
      <div className={styles.wrapper}>
        <Sidebar />
        <main className={styles.main}>
          <Header title="Lead Details" />
          <div className={styles.emptyState}>
            <p>Loading lead details...</p>
          </div>
        </main>
      </div>
    );
  }

  const getDeptName = (deptId: string) => departments.find(d => d.id === deptId)?.name || '—';
  const getSourceName = (srcId: string) => sources.find(s => s.id === srcId)?.name || '—';
  const getTypeName = (typeId: string) => taskTypes.find(t => t.id === typeId)?.name || '—';

  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <main className={styles.main}>
        <Header title={`Lead ${lead.leadNo}`} subtitle={lead.leadName} />

        <button className={styles.filterResetBtn} onClick={() => router.back()} style={{ marginBottom: '1.5rem', alignSelf: 'flex-start' }}>
          <ArrowLeft size={14} /> Back to Leads
        </button>

        <div className="glass-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2.5rem', marginBottom: '3rem' }}>
            <div className={styles.detailItem}>
              <p className={styles.label}><Building size={14} /> Business Name</p>
              <p className={styles.value}>{lead.leadName}</p>
            </div>
            <div className={styles.detailItem}>
              <p className={styles.label}><User size={14} /> Contact Person</p>
              <p className={styles.value}>{lead.contactName || '—'}</p>
            </div>
            <div className={styles.detailItem}>
              <p className={styles.label}><Phone size={14} /> Phone Number</p>
              <p className={styles.value}>{lead.contactNumber || '—'}</p>
            </div>
            <div className={styles.detailItem}>
              <p className={styles.label}><Mail size={14} /> Email Address</p>
              <p className={styles.value}>{lead.email || '—'}</p>
            </div>
            <div className={styles.detailItem}>
              <p className={styles.label}><Target size={14} /> Lead Source</p>
              <p className={styles.value}>{getSourceName(lead.sourceId)}</p>
            </div>
            <div className={styles.detailItem}>
              <p className={styles.label}><Calendar size={14} /> Created Date</p>
              <p className={styles.value}>{new Date(lead.date).toLocaleDateString()}</p>
            </div>
            <div className={styles.detailItem}>
              <p className={styles.label}><FileText size={14} /> Department</p>
              <p className={styles.value}>{getDeptName(lead.departmentId)}</p>
            </div>
            <div className={styles.detailItem}>
              <p className={styles.label}><ClipboardList size={14} /> Status</p>
              <p className={styles.value}><span className={`badge-${lead.status.toLowerCase().replace(/_/g, '')}`}>{lead.status.replace(/_/g, ' ')}</span></p>
            </div>
          </div>

          {lead.remarks && (
            <div style={{ maxWidth: '800px', padding: '1.5rem', background: 'var(--surface-hover)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--primary)', textTransform: 'uppercase' }}>Remarks</h3>
              <p style={{ fontSize: '0.95rem', lineHeight: '1.6', color: 'var(--text-primary)' }}>{lead.remarks}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
