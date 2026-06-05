'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useApp } from '@/context/AppContext';
import SOPChecklist from '@/components/SOPChecklist';
import styles from '../../page.module.css';
import {
  ArrowLeft, Calendar, User, Building, ClipboardList,
  FileText, Upload, File, X, ZoomIn, Download,
  ChevronLeft, ChevronRight, RefreshCw, Paperclip,
} from 'lucide-react';
import api from '@/lib/api';

const FILE_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, '') || 'http://localhost:5000';
const DOC_CATEGORIES = ['AADHAR', 'PAN', 'GST', 'PHOTO', 'OTHER'] as const;
type DocCategory = typeof DOC_CATEGORIES[number];

const CAT_COLOR: Record<DocCategory, string> = {
  AADHAR: '#1A4B8C', PAN: '#10B981', GST: '#F59E0B', PHOTO: '#8B5CF6', OTHER: '#6B7280',
};

interface TaskDoc {
  id: string;
  taskId: string;
  originalName: string;
  savedName: string;
  filePath: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

interface LeadDoc {
  id: string;
  leadId: string;
  category: DocCategory;
  originalName: string;
  savedName: string;
  filePath: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

/* ── Lightbox ───────────────────────────────────────────────────────────── */
function Lightbox({ docs, index, onClose, onNav, fileUrl, fmtSize }: {
  docs: TaskDoc[]; index: number; onClose: () => void;
  onNav: (i: number) => void; fileUrl: (d: TaskDoc) => string; fmtSize: (b: number) => string;
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
      <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', background: 'linear-gradient(to bottom,rgba(0,0,0,0.75),transparent)' }}>
        <div>
          <p style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>{doc.originalName}</p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>{fmtSize(doc.size)}</p>
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
        <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', gap: '0.5rem', justifyContent: 'center', padding: '1rem 1.5rem', background: 'linear-gradient(to top,rgba(0,0,0,0.75),transparent)', overflowX: 'auto' }}>
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

/* ── Main Page ───────────────────────────────────────────────────────────── */
export default function TaskDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { tasks, updateTaskStep, leads, users, departments, taskTypes } = useApp();
  const [task, setTask] = useState<any>(null);

  // Task documents
  const [documents, setDocuments] = useState<TaskDoc[]>([]);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [catFilter, setCatFilter] = useState<DocCategory | 'ALL'>('ALL');
  const [category, setCategory] = useState<DocCategory>('AADHAR');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [replacingDoc, setReplacingDoc] = useState<TaskDoc | null>(null);
  const [replacing, setReplacing] = useState(false);
  const replaceRef = useRef<HTMLInputElement>(null);

  // Lead documents (read-only — inherited from the linked lead)
  const [leadDocs, setLeadDocs] = useState<LeadDoc[]>([]);
  const [leadPreviewIndex, setLeadPreviewIndex] = useState<number | null>(null);
  const [leadCatFilter, setLeadCatFilter] = useState<DocCategory | 'ALL'>('ALL');

  useEffect(() => {
    if (id && tasks.length > 0) {
      const found = tasks.find(t => t.id === id);
      if (found) setTask(found);
    }
  }, [id, tasks]);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    api.get(`/tasks/${id}/documents`, { signal: controller.signal })
      .then(r => setDocuments(r.data.data))
      .catch((err) => { if (err.code !== 'ERR_CANCELED') console.error(err); });
    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    const leadId = task?.leadId;
    if (!leadId) return;
    // Resolve lead status from embedded object or context list
    const leadStatus = task?.lead?.status ?? leads.find((l: any) => l.id === leadId)?.status;
    if (leadStatus !== 'CONVERTED') return; // only show docs for converted leads
    const controller = new AbortController();
    api.get(`/leads/${leadId}/documents`, { signal: controller.signal })
      .then(r => { if (r.data?.success) setLeadDocs(r.data.data ?? []); })
      .catch((err) => { if (err.code !== 'ERR_CANCELED') console.error(err); });
    return () => controller.abort();
  }, [task?.leadId, task?.lead?.status, leads]);

  const handleUpload = async () => {
    if (!file || !id) return;
    const fd = new FormData();
    fd.append('file', file);
    setUploading(true);
    try {
      const r = await api.post(`/tasks/${id}/documents`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setDocuments(prev => [r.data.data, ...prev]);
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch {} finally { setUploading(false); }
  };

  const triggerReplace = (doc: TaskDoc) => { setReplacingDoc(doc); replaceRef.current?.click(); };

  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFile = e.target.files?.[0];
    if (!newFile || !replacingDoc || !id) return;
    setReplacing(true);
    try {
      const fd = new FormData();
      fd.append('file', newFile);
      const r = await api.post(`/tasks/${id}/documents`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await api.delete(`/task-documents/${replacingDoc.id}`);
      setDocuments(prev => prev.map(d => d.id === replacingDoc.id ? r.data.data : d));
    } catch {} finally { setReplacing(false); setReplacingDoc(null); if (replaceRef.current) replaceRef.current.value = ''; }
  };

  const handleDelete = async (docId: string) => {
    try {
      await api.delete(`/task-documents/${docId}`);
      setDocuments(prev => prev.filter(d => d.id !== docId));
      if (previewIndex !== null) setPreviewIndex(null);
    } catch {}
  };

  const fileUrl = (doc: TaskDoc) => `${FILE_BASE}${doc.filePath}/${doc.savedName}`;
  const leadFileUrl = (doc: LeadDoc) => `${FILE_BASE}${doc.filePath}/${doc.savedName}`;
  const filteredLeadDocs = leadCatFilter === 'ALL' ? leadDocs : leadDocs.filter(d => d.category === leadCatFilter);
  const isImage = (m: string) => m.startsWith('image/');
  const fmtSize = (b: number) => b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`;
  const countFor = (cat: DocCategory) => documents.filter(d => {
    const ext = d.originalName.split('.').pop()?.toLowerCase();
    // task docs don't have category, filter by file type
    if (cat === 'PHOTO') return d.mimeType.startsWith('image/');
    if (cat === 'OTHER') return !d.mimeType.startsWith('image/') && d.mimeType !== 'application/pdf';
    if (cat === 'GST') return d.mimeType === 'application/pdf';
    return false;
  }).length;

  const filteredDocs = catFilter === 'ALL' ? documents : documents.filter(d => {
    if (catFilter === 'PHOTO') return d.mimeType.startsWith('image/');
    if (catFilter === 'OTHER') return !d.mimeType.startsWith('image/') && d.mimeType !== 'application/pdf';
    return true;
  });

  if (!task) {
    return (
      <div className={styles.wrapper}>
        <Sidebar />
        <main className={styles.main}>
          <Header title="Task Details" />
          <div className={styles.emptyState}><p>Loading task details...</p></div>
        </main>
      </div>
    );
  }

  const getLeadName = () => task.lead?.leadName || leads.find((l: any) => l.id === task.leadId)?.leadName || '—';
  const getUserName = (uid: string) => users.find((u: any) => u.id === uid)?.name || '—';
  const getDeptName = (did: string) => departments.find((d: any) => d.id === did)?.name || '—';
  const getTypeName = (tid: string) => taskTypes.find((t: any) => t.id === tid)?.name || '—';

  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <main className={styles.main}>
        <Header title={`Task ${task.taskNo}`} subtitle={getTypeName(task.taskTypeId)} />

        {/* Back */}
        <button onClick={() => router.back()}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.9rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', marginBottom: '1.5rem' }}>
          <ArrowLeft size={14} /> Back to Tasks
        </button>

        {/* ── Task Banner ── */}
        <div style={{ background: 'var(--primary)', borderRadius: '16px', padding: '1.5rem 2rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ClipboardList size={22} color="#fff" />
          </div>
          <div>
            <p style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>{getLeadName()}</p>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.65)', marginTop: '2px' }}>
              {task.taskNo} · {getTypeName(task.taskTypeId)} · {getDeptName(task.departmentId)}
            </p>
          </div>
        </div>

        {/* ── Info Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
          {[
            { icon: <Building size={15} />, label: 'Lead / Client', value: getLeadName() },
            { icon: <User size={15} />, label: 'Assigned To', value: getUserName(task.assignedToId) },
            { icon: <Calendar size={15} />, label: 'Due Date', value: task.completionDate ? new Date(task.completionDate).toLocaleDateString('en-GB') : '—' },
            { icon: <ClipboardList size={15} />, label: 'Status', value: task.status.replace(/_/g, ' ') },
          ].map(({ icon, label, value }) => (
            <div key={label} style={{ background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)', padding: '0.9rem 1.1rem', display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
              <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--primary)' }}>{icon}</div>
              <div>
                <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>{label}</p>
                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── SOP Progress ── */}
        <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
            <div style={{ width: 32, height: 32, borderRadius: '9px', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <ClipboardList size={15} />
            </div>
            <div>
              <h3 style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>SOP Progress</h3>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                {task.sopSteps?.filter((s: any) => s.isCompleted).length || 0} of {task.sopSteps?.length || 0} steps completed
              </p>
            </div>
          </div>
          <SOPChecklist
            steps={task.sopSteps || []}
            taskId={task.id}
            taskTypeId={task.taskTypeId}
            onToggle={(stepId, completed) => updateTaskStep(task.id, stepId, completed)}
          />
        </div>

        {/* ── Lead Documents (read-only) ── */}
        {leadDocs.length > 0 && (
          <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
              <div style={{ width: 32, height: 32, borderRadius: '9px', background: 'rgba(79,70,229,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5' }}>
                <FileText size={15} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Lead Documents</h3>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{leadDocs.length} file{leadDocs.length !== 1 ? 's' : ''} from the linked lead · read-only</p>
              </div>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#4f46e5', background: 'rgba(79,70,229,0.1)', border: '1px solid rgba(79,70,229,0.2)', padding: '3px 10px', borderRadius: '20px' }}>
                From Lead
              </span>
            </div>

            {/* Category filter */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {(['ALL', ...DOC_CATEGORIES] as const).map(cat => {
                const count = cat === 'ALL' ? leadDocs.length : leadDocs.filter(d => d.category === cat).length;
                const active = leadCatFilter === cat;
                const c = cat !== 'ALL' ? CAT_COLOR[cat] : 'var(--primary)';
                return (
                  <button key={cat} onClick={() => setLeadCatFilter(cat)}
                    style={{ padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, border: `1px solid ${active ? c : 'var(--border)'}`, background: active ? `${c}15` : 'transparent', color: active ? c : 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.15s' }}>
                    {cat} {count > 0 ? count : ''}
                  </button>
                );
              })}
            </div>

            {/* Doc grid */}
            {filteredLeadDocs.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>No documents in this category</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: '0.85rem' }}>
                {filteredLeadDocs.map((doc, idx) => {
                  const isImg = doc.mimeType.startsWith('image/');
                  const catColor = CAT_COLOR[doc.category] ?? '#6B7280';
                  const globalIdx = leadDocs.indexOf(doc);
                  return (
                    <div key={doc.id}
                      style={{ background: 'var(--surface)', borderRadius: '12px', border: `1px solid ${catColor}30`, overflow: 'hidden', position: 'relative', transition: 'box-shadow 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)')}
                      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>

                      {/* Category badge */}
                      <span style={{ position: 'absolute', top: 6, left: 6, fontSize: '0.58rem', fontWeight: 800, color: catColor, background: `${catColor}20`, padding: '2px 6px', borderRadius: '4px', zIndex: 1, letterSpacing: '0.3px' }}>
                        {doc.category}
                      </span>

                      <div onClick={() => setLeadPreviewIndex(globalIdx)} style={{ cursor: 'zoom-in' }}>
                        {isImg ? (
                          <div style={{ position: 'relative' }}>
                            <img src={leadFileUrl(doc)} alt={doc.originalName} style={{ width: '100%', height: '115px', objectFit: 'cover', display: 'block' }} />
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0)', transition: 'background 0.2s' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.3)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0)')}>
                              <ZoomIn size={20} color="#fff" />
                            </div>
                          </div>
                        ) : (
                          <div style={{ height: '115px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', background: `${catColor}08` }}>
                            <File size={34} color={catColor} />
                            <span style={{ fontSize: '0.63rem', color: catColor, fontWeight: 700, textTransform: 'uppercase' }}>
                              {doc.originalName.split('.').pop()?.toUpperCase() ?? 'FILE'}
                            </span>
                          </div>
                        )}
                        <div style={{ padding: '0.55rem 0.75rem' }}>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{doc.originalName}</p>
                          <p style={{ fontSize: '0.63rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{fmtSize(doc.size)} · {new Date(doc.uploadedAt).toLocaleDateString('en-GB')}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Documents ── */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
            <div style={{ width: 32, height: 32, borderRadius: '9px', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <FileText size={15} />
            </div>
            <div>
              <h3 style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Documents</h3>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{documents.length} file{documents.length !== 1 ? 's' : ''} uploaded</p>
            </div>
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            {(['ALL', ...DOC_CATEGORIES] as const).map(cat => {
              const active = catFilter === cat;
              return (
                <button key={cat} onClick={() => setCatFilter(cat)}
                  style={{ padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`, background: active ? 'var(--primary)' : 'transparent', color: active ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.15s' }}>
                  {cat}{cat === 'ALL' && documents.length > 0 ? ` ${documents.length}` : ''}
                </button>
              );
            })}
          </div>

          {/* Document grid */}
          {filteredDocs.length === 0 ? (
            <div style={{ padding: '2.5rem 2rem', textAlign: 'center', background: 'var(--surface-hover)', borderRadius: '12px', border: '1px dashed var(--border)', marginBottom: '1.25rem' }}>
              <div style={{ width: 52, height: 52, borderRadius: '14px', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <File size={22} color="var(--text-secondary)" />
              </div>
              <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>No documents yet</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Upload files using the panel below</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
              {filteredDocs.map((doc, i) => {
                const globalIndex = documents.indexOf(doc);
                const isImg = isImage(doc.mimeType);
                return (
                  <div key={doc.id}
                    style={{ background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden', position: 'relative', transition: 'box-shadow 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)')}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
                    <button onClick={e => { e.stopPropagation(); triggerReplace(doc); }} title="Replace"
                      disabled={replacing && replacingDoc?.id === doc.id}
                      style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 1 }}>
                      <RefreshCw size={12} color="#fff" style={replacing && replacingDoc?.id === doc.id ? { animation: 'spin 1s linear infinite' } : {}} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); handleDelete(doc.id); }} title="Delete"
                      style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 1 }}>
                      <X size={12} color="#fff" />
                    </button>
                    <div onClick={() => setPreviewIndex(globalIndex)} style={{ cursor: 'zoom-in' }}>
                      {isImg ? (
                        <div style={{ position: 'relative' }}>
                          <img src={fileUrl(doc)} alt={doc.originalName} style={{ width: '100%', height: '115px', objectFit: 'cover', display: 'block' }} />
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0)', transition: 'background 0.2s' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.3)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0)')}>
                            <ZoomIn size={20} color="#fff" />
                          </div>
                        </div>
                      ) : (
                        <div style={{ height: '115px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', background: 'rgba(245,158,11,0.08)' }}>
                          <File size={34} color="#F59E0B" />
                          <span style={{ fontSize: '0.63rem', color: '#F59E0B', fontWeight: 700, textTransform: 'uppercase' }}>PDF</span>
                        </div>
                      )}
                      <div style={{ padding: '0.55rem 0.75rem' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{doc.originalName}</p>
                        <p style={{ fontSize: '0.63rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{fmtSize(doc.size)} · {new Date(doc.uploadedAt).toLocaleDateString('en-GB')}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Upload Panel — visible to ALL roles ── */}
          <div style={{ background: 'var(--surface-hover)', borderRadius: '12px', border: '1px solid var(--border)', padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Paperclip size={14} color="var(--primary)" />
              <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Upload Document</p>
            </div>

            {/* Category pills */}
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Document Type</p>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {DOC_CATEGORIES.map(cat => {
                  const active = category === cat;
                  const c = CAT_COLOR[cat];
                  return (
                    <button key={cat} onClick={() => setCategory(cat)}
                      style={{ padding: '0.35rem 0.8rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, border: `1.5px solid ${active ? c : 'var(--border)'}`, background: active ? `${c}15` : 'transparent', color: active ? c : 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.15s' }}>
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* File picker + upload button */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={e => setFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
              <button onClick={() => fileRef.current?.click()}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1rem', borderRadius: '8px', border: `1.5px dashed ${file ? CAT_COLOR[category] : 'var(--border)'}`, background: file ? `${CAT_COLOR[category]}08` : 'var(--surface)', color: file ? CAT_COLOR[category] : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', transition: 'all 0.15s' }}>
                <Paperclip size={14} />
                {file ? file.name : 'Choose File'}
              </button>
              {file && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{fmtSize(file.size)}</span>}
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

      <input ref={replaceRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
        style={{ display: 'none' }} onChange={handleReplaceFile} />

      {previewIndex !== null && (
        <Lightbox docs={documents} index={previewIndex} onClose={() => setPreviewIndex(null)}
          onNav={setPreviewIndex} fileUrl={fileUrl} fmtSize={fmtSize} />
      )}

      {leadPreviewIndex !== null && (
        <Lightbox
          docs={leadDocs as unknown as TaskDoc[]}
          index={leadPreviewIndex}
          onClose={() => setLeadPreviewIndex(null)}
          onNav={setLeadPreviewIndex}
          fileUrl={d => leadFileUrl(d as unknown as LeadDoc)}
          fmtSize={fmtSize}
        />
      )}
    </div>
  );
}
