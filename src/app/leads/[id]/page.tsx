'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useApp } from '@/context/AppContext';
import styles from '../../page.module.css';
import {
  ArrowLeft, Calendar, User, Building, Phone, Mail, FileText,
  Target, Upload, X, File, ChevronLeft, ChevronRight,
  Download, ZoomIn, RefreshCw, Paperclip, ShieldCheck,
} from 'lucide-react';
import api from '@/lib/api';

const CATEGORIES = ['AADHAR', 'PAN', 'GST', 'PHOTO', 'OTHER'] as const;
type DocumentCategory = typeof CATEGORIES[number];

const FILE_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

interface LeadDoc {
  id: string;
  leadId: string;
  fromLeadNo: string;
  category: DocumentCategory;
  originalName: string;
  savedName: string;
  filePath: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  NEW:                   { label: 'New',                  color: '#1A4B8C', bg: 'rgba(26,75,140,0.1)' },
  CONVERTED:             { label: 'Converted',            color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
  HOLD_BY_LEAD:          { label: 'Hold by Lead',         color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  NOT_RESPONDED:         { label: 'Not Responded',        color: '#6B7280', bg: 'rgba(107,114,128,0.1)' },
  DROPPED:               { label: 'Dropped',              color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
  AWAITING_CONFIRMATION: { label: 'Awaiting Confirmation',color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
  MEETING_SCHEDULED:     { label: 'Meeting Scheduled',    color: '#0EA5E9', bg: 'rgba(14,165,233,0.1)' },
};

const CAT_COLOR: Record<DocumentCategory, string> = {
  AADHAR: '#1A4B8C',
  PAN:    '#10B981',
  GST:    '#F59E0B',
  PHOTO:  '#8B5CF6',
  OTHER:  '#6B7280',
};

/* ── Lightbox ────────────────────────────────────────────────────────────── */
function Lightbox({ docs, index, onClose, onNav, fileUrl, fmtSize }: {
  docs: LeadDoc[]; index: number; onClose: () => void;
  onNav: (i: number) => void; fileUrl: (d: LeadDoc) => string; fmtSize: (b: number) => string;
}) {
  const doc = docs[index];
  const isImg = doc.mimeType.startsWith('image/');
  const hasPrev = index > 0;
  const hasNext = index < docs.length - 1;

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowLeft' && hasPrev) onNav(index - 1);
    if (e.key === 'ArrowRight' && hasNext) onNav(index + 1);
  }, [index, hasPrev, hasNext, onClose, onNav]);

  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
  }, [handleKey]);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.92)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', background: 'linear-gradient(to bottom, rgba(0,0,0,0.75), transparent)' }}>
        <div>
          <p style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>{doc.originalName}</p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>{doc.category} · {fmtSize(doc.size)} · {doc.fromLeadNo}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <a href={fileUrl(doc)} download={doc.originalName} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', textDecoration: 'none' }}>
            <Download size={16} />
          </a>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} color="#fff" />
          </button>
        </div>
      </div>
      {hasPrev && (
        <button onClick={e => { e.stopPropagation(); onNav(index - 1); }} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={22} color="#fff" />
        </button>
      )}
      {hasNext && (
        <button onClick={e => { e.stopPropagation(); onNav(index + 1); }} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronRight size={22} color="#fff" />
        </button>
      )}
      <div onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '80vh' }}>
        {isImg ? (
          <img src={fileUrl(doc)} alt={doc.originalName} style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} />
        ) : (
          <div style={{ width: 320, padding: '3rem 2rem', textAlign: 'center', background: 'var(--glass-bg)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
            <File size={64} color="var(--primary)" style={{ marginBottom: '1rem' }} />
            <p style={{ color: '#fff', fontWeight: 700, marginBottom: '0.5rem' }}>{doc.originalName}</p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>{fmtSize(doc.size)}</p>
            <a href={fileUrl(doc)} target="_blank" rel="noopener noreferrer"
              style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', background: 'var(--primary)', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <Download size={14} /> Open PDF
            </a>
          </div>
        )}
      </div>
      {docs.length > 1 && (
        <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', gap: '0.5rem', justifyContent: 'center', padding: '1rem 1.5rem', background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent)', overflowX: 'auto' }}>
          {docs.map((d, i) => (
            <button key={d.id} onClick={() => onNav(i)}
              style={{ width: 52, height: 52, flexShrink: 0, borderRadius: '8px', overflow: 'hidden', border: i === index ? '2px solid var(--primary)' : '2px solid transparent', padding: 0, cursor: 'pointer', background: 'rgba(255,255,255,0.1)' }}>
              {d.mimeType.startsWith('image/') ? (
                <img src={fileUrl(d)} alt={d.originalName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <File size={20} color="rgba(255,255,255,0.7)" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Info Card ───────────────────────────────────────────────────────────── */
function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)', padding: '1rem 1.25rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
      <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--primary)' }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>{label}</p>
        <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</p>
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────────────────── */
export default function LeadDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { leads, departments, sources } = useApp();
  const [lead, setLead] = useState<any>(null);
  const [documents, setDocuments] = useState<LeadDoc[]>([]);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [catFilter, setCatFilter] = useState<'ALL' | DocumentCategory>('ALL');

  const [category, setCategory] = useState<DocumentCategory>('AADHAR');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [replacingDoc, setReplacingDoc] = useState<LeadDoc | null>(null);
  const [replacing, setReplacing] = useState(false);
  const replaceRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id && leads.length > 0) {
      const found = leads.find((l) => l.id === id);
      if (found) setLead(found);
    }
  }, [id, leads]);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    api.get(`/leads/${id}/documents`, { signal: controller.signal })
      .then((r) => setDocuments(r.data.data))
      .catch((err) => { if (err.code !== 'ERR_CANCELED') console.error(err); });
    return () => controller.abort();
  }, [id]);

  const handleUpload = async () => {
    if (!file || !id || !lead) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('category', category);
    setUploading(true);
    try {
      const r = await api.post(`/leads/${id}/documents`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setDocuments((prev) => [{ ...r.data.data, fromLeadNo: lead.leadNo }, ...prev]);
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch {} finally { setUploading(false); }
  };

  const triggerReplace = (doc: LeadDoc) => { setReplacingDoc(doc); replaceRef.current?.click(); };

  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFile = e.target.files?.[0];
    if (!newFile || !replacingDoc || !id || !lead) return;
    setReplacing(true);
    try {
      const fd = new FormData();
      fd.append('file', newFile);
      fd.append('category', replacingDoc.category);
      const r = await api.post(`/leads/${id}/documents`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await api.delete(`/lead-documents/${replacingDoc.id}`);
      const newDoc: LeadDoc = { ...r.data.data, fromLeadNo: lead.leadNo };
      setDocuments((prev) => prev.map((d) => d.id === replacingDoc.id ? newDoc : d));
    } catch {} finally { setReplacing(false); setReplacingDoc(null); if (replaceRef.current) replaceRef.current.value = ''; }
  };

  const handleDelete = async (docId: string) => {
    try {
      await api.delete(`/lead-documents/${docId}`);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      if (previewIndex !== null) setPreviewIndex(null);
    } catch {}
  };

  const fileUrl = (doc: LeadDoc) => `${FILE_BASE}${doc.filePath}/${doc.savedName}`;
  const isImage = (m: string) => m.startsWith('image/');
  const fmtSize = (b: number) => b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`;

  if (!lead) {
    return (
      <div className={styles.wrapper}>
        <Sidebar />
        <main className={styles.main}>
          <Header title="Lead Details" />
          <div className={styles.emptyState}><p>Loading lead details...</p></div>
        </main>
      </div>
    );
  }

  const getDeptName = (dId: string) => departments.find((d) => d.id === dId)?.name || '—';
  const getSourceName = (sId: string) => sources.find((s) => s.id === sId)?.name || '—';
  const statusMeta = STATUS_META[lead.status] ?? { label: lead.status, color: 'var(--text-secondary)', bg: 'var(--surface-hover)' };

  // All other leads that belong to the same client (same business)
  const relatedLeads = lead.clientId
    ? leads.filter(l => l.clientId === lead.clientId && l.id !== lead.id)
    : [];

  const filteredDocs = catFilter === 'ALL' ? documents : documents.filter(d => d.category === catFilter);
  const countFor = (cat: DocumentCategory) => documents.filter(d => d.category === cat).length;

  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <main className={styles.main}>
        <Header title={`Lead ${lead.leadNo}`} subtitle={lead.leadName} />

        {/* ── Top bar ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <button onClick={() => router.back()}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.9rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}>
            <ArrowLeft size={14} /> Back
          </button>
          <span style={{ padding: '0.35rem 0.9rem', borderRadius: '20px', fontWeight: 700, fontSize: '0.78rem', background: statusMeta.bg, color: statusMeta.color }}>
            {statusMeta.label}
          </span>
        </div>

        {/* ── Lead Banner ── */}
        <div style={{ background: 'var(--primary)', borderRadius: '16px', padding: '1.75rem 2rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ width: 52, height: 52, borderRadius: '14px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Building size={26} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>{lead.leadName}</p>
              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.65)', marginTop: '2px' }}>{lead.leadNo} · Added {new Date(lead.date).toLocaleDateString('en-GB')}</p>
            </div>
          </div>
          {(relatedLeads.length > 0) && (
            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '10px', padding: '0.5rem 1rem', textAlign: 'center', flexShrink: 0 }}>
              <p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{relatedLeads.length + 1}</p>
              <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Total Leads</p>
            </div>
          )}
        </div>

        {/* ── Info Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <InfoCard icon={<User size={16} />}     label="Contact Person" value={lead.contactName || '—'} />
          <InfoCard icon={<Phone size={16} />}    label="Phone Number"   value={lead.contactNumber || '—'} />
          <InfoCard icon={<Mail size={16} />}     label="Email Address"  value={lead.email || '—'} />
          <InfoCard icon={<Target size={16} />}   label="Lead Source"    value={getSourceName(lead.sourceId)} />
          <InfoCard icon={<FileText size={16} />} label="Department"     value={getDeptName(lead.departmentId)} />
          <InfoCard icon={<Calendar size={16} />} label="Created Date"   value={new Date(lead.date).toLocaleDateString('en-GB')} />
        </div>

        {/* ── Related Leads (same client/business) ── */}
        {relatedLeads.length > 0 && (
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Building size={13} color="var(--text-secondary)" />
              <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Other Leads for {lead.leadName}
              </p>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '10px', padding: '1px 7px' }}>
                {relatedLeads.length}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              {relatedLeads.map(l => {
                const sm = STATUS_META[l.status] ?? { label: l.status, color: 'var(--text-secondary)', bg: 'var(--surface-hover)' };
                return (
                  <button key={l.id} onClick={() => router.push(`/leads/${l.id}`)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 1rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', transition: 'box-shadow 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FileText size={14} color="var(--primary)" />
                    </div>
                    <div>
                      <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>{l.leadNo}</p>
                      <p style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '1px' }}>
                        {getDeptName(l.departmentId)} · {new Date(l.date).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                    <span style={{ marginLeft: '0.25rem', fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: sm.bg, color: sm.color, whiteSpace: 'nowrap' }}>
                      {sm.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Remarks ── */}
        {lead.remarks && (
          <div style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)', borderLeft: '4px solid #F59E0B', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <ShieldCheck size={16} color="#F59E0B" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: '0.7rem', fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>Remarks</p>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>{lead.remarks}</p>
            </div>
          </div>
        )}

        {/* ── Documents Section ── */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>

          {/* Section header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: 32, height: 32, borderRadius: '9px', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                <FileText size={15} />
              </div>
              <div>
                <h3 style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Documents</h3>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{documents.length} file{documents.length !== 1 ? 's' : ''} uploaded</p>
              </div>
            </div>
          </div>

          {/* Category filter tabs */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            {(['ALL', ...CATEGORIES] as const).map(cat => {
              const count = cat === 'ALL' ? documents.length : countFor(cat);
              const active = catFilter === cat;
              return (
                <button key={cat} onClick={() => setCatFilter(cat)}
                  style={{
                    padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                    border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                    background: active ? 'var(--primary)' : 'transparent',
                    color: active ? '#fff' : 'var(--text-secondary)',
                    cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '0.35rem',
                  }}>
                  {cat}
                  {count > 0 && (
                    <span style={{ background: active ? 'rgba(255,255,255,0.25)' : 'var(--surface-hover)', borderRadius: '10px', padding: '0 5px', fontSize: '0.68rem', fontWeight: 800 }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Document grid */}
          {filteredDocs.length === 0 ? (
            <div style={{ padding: '3rem 2rem', textAlign: 'center', background: 'var(--surface-hover)', borderRadius: '12px', border: '1px dashed var(--border)', marginBottom: '1.25rem' }}>
              <div style={{ width: 56, height: 56, borderRadius: '16px', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <File size={24} color="var(--text-secondary)" />
              </div>
              <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
                {catFilter === 'ALL' ? `No documents yet for ${lead.leadName}` : `No ${catFilter} documents`}
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Upload a file below to get started</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.9rem', marginBottom: '1.25rem' }}>
              {filteredDocs.map((doc, i) => {
                const globalIndex = documents.indexOf(doc);
                const catColor = CAT_COLOR[doc.category];
                return (
                  <div key={doc.id} style={{ background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden', position: 'relative', transition: 'box-shadow 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)')}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)')}>

                    {/* Replace + Delete overlay buttons */}
                    <button onClick={e => { e.stopPropagation(); triggerReplace(doc); }} title="Replace"
                      disabled={replacing && replacingDoc?.id === doc.id}
                      style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 1 }}>
                      <RefreshCw size={12} color="#fff" style={replacing && replacingDoc?.id === doc.id ? { animation: 'spin 1s linear infinite' } : {}} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); handleDelete(doc.id); }} title="Delete"
                      style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 1 }}>
                      <X size={12} color="#fff" />
                    </button>

                    {/* Preview */}
                    <div onClick={() => setPreviewIndex(globalIndex)} style={{ cursor: 'zoom-in' }}>
                      {isImage(doc.mimeType) ? (
                        <div style={{ position: 'relative' }}>
                          <img src={fileUrl(doc)} alt={doc.originalName} style={{ width: '100%', height: '120px', objectFit: 'cover', display: 'block' }} />
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0)', transition: 'background 0.2s' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.3)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0)')}>
                            <ZoomIn size={22} color="#fff" style={{ opacity: 0.9 }} />
                          </div>
                        </div>
                      ) : (
                        <div style={{ height: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', background: `${catColor}10` }}>
                          <File size={36} color={catColor} />
                          <span style={{ fontSize: '0.65rem', color: catColor, fontWeight: 700, textTransform: 'uppercase' }}>PDF</span>
                        </div>
                      )}

                      {/* Card info */}
                      <div style={{ padding: '0.6rem 0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: catColor, textTransform: 'uppercase', letterSpacing: '0.05em', background: `${catColor}15`, padding: '1px 6px', borderRadius: '4px' }}>
                            {doc.category}
                          </span>
                          {doc.fromLeadNo && doc.fromLeadNo !== lead.leadNo && (
                            <span title={`From ${doc.fromLeadNo}`} style={{ fontSize: '0.58rem', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '4px', padding: '1px 4px' }}>
                              {doc.fromLeadNo}
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{doc.originalName}</p>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{fmtSize(doc.size)} · {new Date(doc.uploadedAt).toLocaleDateString('en-GB')}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Upload Panel ── */}
          <div style={{ background: 'var(--surface-hover)', borderRadius: '12px', border: '1px solid var(--border)', padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Paperclip size={14} color="var(--primary)" />
              <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Upload New Document</p>
            </div>

            {/* Category pills */}
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Document Type</p>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {CATEGORIES.map(cat => {
                  const active = category === cat;
                  const c = CAT_COLOR[cat];
                  return (
                    <button key={cat} onClick={() => setCategory(cat)}
                      style={{
                        padding: '0.35rem 0.8rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                        border: `1.5px solid ${active ? c : 'var(--border)'}`,
                        background: active ? `${c}15` : 'transparent',
                        color: active ? c : 'var(--text-secondary)',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}>
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* File picker + upload button */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                style={{ display: 'none' }}
              />
              <button onClick={() => fileRef.current?.click()}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1rem', borderRadius: '8px', border: `1.5px dashed ${file ? CAT_COLOR[category] : 'var(--border)'}`, background: file ? `${CAT_COLOR[category]}08` : 'var(--surface)', color: file ? CAT_COLOR[category] : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', transition: 'all 0.15s' }}>
                <Paperclip size={14} />
                {file ? file.name : 'Choose File'}
              </button>
              {file && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{fmtSize(file.size)}</span>
              )}
              <button onClick={handleUpload} disabled={!file || uploading}
                style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.25rem', borderRadius: '8px', background: file && !uploading ? 'var(--primary)' : 'var(--border)', color: file && !uploading ? '#fff' : 'var(--text-secondary)', border: 'none', cursor: file && !uploading ? 'pointer' : 'not-allowed', fontWeight: 700, fontSize: '0.85rem', transition: 'all 0.2s' }}>
                <Upload size={14} />
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
            <p style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '0.6rem' }}>Accepted: JPG, PNG, WEBP, PDF · Max 10 MB</p>
          </div>
        </div>
      </main>

      <input ref={replaceRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" style={{ display: 'none' }} onChange={handleReplaceFile} />

      {previewIndex !== null && (
        <Lightbox docs={documents} index={previewIndex} onClose={() => setPreviewIndex(null)} onNav={setPreviewIndex} fileUrl={fileUrl} fmtSize={fmtSize} />
      )}
    </div>
  );
}
