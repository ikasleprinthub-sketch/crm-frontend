'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useApp } from '@/context/AppContext';
import styles from '../../page.module.css';
import {
  ArrowLeft, Calendar, User, Building, Phone, Mail, FileText,
  Target, ClipboardList, Upload, X, File, ChevronLeft, ChevronRight,
  Download, ZoomIn,
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

/* ── Lightbox ────────────────────────────────────────────────────────────── */
function Lightbox({
  docs,
  index,
  onClose,
  onNav,
  fileUrl,
  fmtSize,
}: {
  docs: LeadDoc[];
  index: number;
  onClose: () => void;
  onNav: (i: number) => void;
  fileUrl: (d: LeadDoc) => string;
  fmtSize: (b: number) => string;
}) {
  const doc = docs[index];
  const isImage = doc.mimeType.startsWith('image/');
  const hasPrev = index > 0;
  const hasNext = index < docs.length - 1;

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onNav(index - 1);
      if (e.key === 'ArrowRight' && hasNext) onNav(index + 1);
    },
    [index, hasPrev, hasNext, onClose, onNav],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [handleKey]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.88)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        animation: 'overlayIn 0.18s ease',
      }}
    >
      {/* Top bar */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem 1.5rem',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
        }}
      >
        <div>
          <p style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>
            {doc.originalName}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem' }}>
            {doc.category} · {fmtSize(doc.size)} · {doc.fromLeadNo}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <a
            href={fileUrl(doc)}
            download={doc.originalName}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(255,255,255,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', textDecoration: 'none',
            }}
          >
            <Download size={16} />
          </a>
          <button
            onClick={onClose}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(255,255,255,0.12)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={16} color="#fff" />
          </button>
        </div>
      </div>

      {/* Prev / Next arrows */}
      {hasPrev && (
        <button
          onClick={e => { e.stopPropagation(); onNav(index - 1); }}
          style={{
            position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
            width: 44, height: 44, borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <ChevronLeft size={22} color="#fff" />
        </button>
      )}
      {hasNext && (
        <button
          onClick={e => { e.stopPropagation(); onNav(index + 1); }}
          style={{
            position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
            width: 44, height: 44, borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <ChevronRight size={22} color="#fff" />
        </button>
      )}

      {/* Content */}
      <div onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '80vh' }}>
        {isImage ? (
          <img
            src={fileUrl(doc)}
            alt={doc.originalName}
            style={{
              maxWidth: '90vw', maxHeight: '80vh',
              objectFit: 'contain', borderRadius: '8px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
          />
        ) : (
          <div style={{
            width: 320, padding: '3rem 2rem', textAlign: 'center',
            background: 'var(--glass-bg)', borderRadius: '16px',
            border: '1px solid var(--glass-border)',
          }}>
            <File size={64} color="var(--primary)" style={{ marginBottom: '1rem' }} />
            <p style={{ color: '#fff', fontWeight: 700, marginBottom: '0.5rem' }}>{doc.originalName}</p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
              {fmtSize(doc.size)}
            </p>
            <a
              href={fileUrl(doc)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '0.6rem 1.5rem', borderRadius: '8px',
                background: 'var(--primary)', color: '#fff',
                textDecoration: 'none', fontWeight: 700, fontSize: '0.85rem',
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              }}
            >
              <Download size={14} /> Open PDF
            </a>
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {docs.length > 1 && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            display: 'flex', gap: '0.5rem', justifyContent: 'center',
            padding: '1rem 1.5rem',
            background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
            overflowX: 'auto',
          }}
        >
          {docs.map((d, i) => (
            <button
              key={d.id}
              onClick={() => onNav(i)}
              style={{
                width: 52, height: 52, flexShrink: 0,
                borderRadius: '8px', overflow: 'hidden',
                border: i === index ? '2px solid var(--primary)' : '2px solid transparent',
                padding: 0, cursor: 'pointer', background: 'rgba(255,255,255,0.1)',
              }}
            >
              {d.mimeType.startsWith('image/') ? (
                <img
                  src={fileUrl(d)}
                  alt={d.originalName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
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
export default function LeadDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { leads, departments, sources } = useApp();
  const [lead, setLead] = useState<any>(null);
  const [documents, setDocuments] = useState<LeadDoc[]>([]);
  const [category, setCategory] = useState<DocumentCategory>('OTHER');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  useEffect(() => {
    if (id && leads.length > 0) {
      const found = leads.find((l) => l.id === id);
      if (found) setLead(found);
    }
  }, [id, leads]);

  useEffect(() => {
    if (!id) return;
    api.get(`/leads/${id}/documents`)
      .then((r) => setDocuments(r.data.data))
      .catch(() => {});
  }, [id]);

  const handleUpload = async () => {
    if (!file || !id) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('category', category);
    setUploading(true);
    try {
      const r = await api.post(`/leads/${id}/documents`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDocuments((prev) => [r.data.data, ...prev]);
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch {
      // handled by api interceptor
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    try {
      await api.delete(`/lead-documents/${docId}`);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      if (previewIndex !== null) setPreviewIndex(null);
    } catch {}
  };

  const fileUrl = (doc: LeadDoc) => `${FILE_BASE}${doc.filePath}/${doc.savedName}`;
  const isImage = (mimeType: string) => mimeType.startsWith('image/');
  const fmtSize = (bytes: number) =>
    bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

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

  const getDeptName = (deptId: string) => departments.find((d) => d.id === deptId)?.name || '—';
  const getSourceName = (srcId: string) => sources.find((s) => s.id === srcId)?.name || '—';

  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <main className={styles.main}>
        <Header title={`Lead ${lead.leadNo}`} subtitle={lead.leadName} />

        <button
          className={styles.filterResetBtn}
          onClick={() => router.back()}
          style={{ marginBottom: '1.5rem', alignSelf: 'flex-start' }}
        >
          <ArrowLeft size={14} /> Back to Leads
        </button>

        <div className="glass-card" style={{ padding: '2rem' }}>

          {/* Lead Info Grid */}
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
              <p className={styles.value}>
                <span className={`badge-${lead.status.toLowerCase().replace(/_/g, '')}`}>
                  {lead.status.replace(/_/g, ' ')}
                </span>
              </p>
            </div>
          </div>

          {/* Remarks */}
          {lead.remarks && (
            <div style={{ maxWidth: '800px', padding: '1.5rem', background: 'var(--surface-hover)', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--primary)', textTransform: 'uppercase' }}>
                Remarks
              </h3>
              <p style={{ fontSize: '0.95rem', lineHeight: '1.6', color: 'var(--text-primary)' }}>{lead.remarks}</p>
            </div>
          )}

          {/* Documents Section */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--primary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={14} /> Documents ({documents.length})
            </h3>

            {/* Upload Row */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', padding: '1.25rem', background: 'var(--surface-hover)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as DocumentCategory)}
                  style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div style={{ flex: 1, minWidth: '220px' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Select File (JPG, PNG, WEBP, PDF — max 10 MB)
                </label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  style={{ fontSize: '0.85rem', color: 'var(--text-primary)', display: 'block' }}
                />
              </div>

              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                style={{ padding: '0.55rem 1.25rem', borderRadius: '8px', background: 'var(--primary)', color: '#fff', border: 'none', cursor: file && !uploading ? 'pointer' : 'not-allowed', opacity: file && !uploading ? 1 : 0.5, fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap', transition: 'opacity 0.2s' }}
              >
                <Upload size={14} /> {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>

            {/* Document Grid */}
            {documents.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No documents uploaded yet.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
                {documents.map((doc, i) => (
                  <div
                    key={doc.id}
                    style={{ background: 'var(--surface-hover)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden', position: 'relative' }}
                  >
                    {/* Delete */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
                      title="Delete document"
                      style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 1 }}
                    >
                      <X size={13} color="#fff" />
                    </button>

                    {/* Zoom icon on hover area */}
                    <div
                      onClick={() => setPreviewIndex(i)}
                      style={{ cursor: 'zoom-in', display: 'block' }}
                    >
                      {isImage(doc.mimeType) ? (
                        <div style={{ position: 'relative' }}>
                          <img
                            src={fileUrl(doc)}
                            alt={doc.originalName}
                            style={{ width: '100%', height: '110px', objectFit: 'cover', display: 'block' }}
                          />
                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.3)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0)')}
                          >
                            <ZoomIn size={22} color="#fff" style={{ opacity: 0, transition: 'opacity 0.2s' }}
                              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                            />
                          </div>
                        </div>
                      ) : (
                        <div style={{ height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)' }}>
                          <File size={40} color="var(--primary)" />
                        </div>
                      )}

                      {/* Info */}
                      <div style={{ padding: '0.6rem 0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                          <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
                            {doc.category}
                          </p>
                          {doc.fromLeadNo !== lead.leadNo && (
                            <span title={`Uploaded via ${doc.fromLeadNo}`} style={{ fontSize: '0.62rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', padding: '1px 4px', color: 'var(--text-secondary)' }}>
                              {doc.fromLeadNo}
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {doc.originalName}
                        </p>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                          {fmtSize(doc.size)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Lightbox */}
      {previewIndex !== null && (
        <Lightbox
          docs={documents}
          index={previewIndex}
          onClose={() => setPreviewIndex(null)}
          onNav={setPreviewIndex}
          fileUrl={fileUrl}
          fmtSize={fmtSize}
        />
      )}
    </div>
  );
}
