'use client';
import { useState, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useApp } from '@/context/AppContext';
import { Plus, Trash2, Edit3, Save, X, StickyNote, Search, Lightbulb } from 'lucide-react';
import styles from './notes.module.css';

const COLORS = [
  { id: 'blue',   label: 'Note',      hex: '#3B82F6', bg: 'rgba(59,130,246,0.06)'  },
  { id: 'yellow', label: 'Important', hex: '#F59E0B', bg: 'rgba(245,158,11,0.06)'  },
  { id: 'green',  label: 'Done',      hex: '#10B981', bg: 'rgba(16,185,129,0.06)'  },
  { id: 'red',    label: 'Urgent',    hex: '#EF4444', bg: 'rgba(239,68,68,0.06)'   },
] as const;
type ColorId = typeof COLORS[number]['id'];

const colorMeta = (color: string) => COLORS.find(c => c.id === color) ?? COLORS[0];

export default function NotesPage() {
  const { currentUser, notes, addNote, updateNote, deleteNote } = useApp();
  const [isAdding, setIsAdding]     = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [formData, setFormData]     = useState({ title: '', content: '', color: 'blue' as ColorId });
  const [search, setSearch]         = useState('');
  const [colorFilter, setColorFilter] = useState<string>('all');

  const openAdd = () => {
    setEditingId(null);
    setFormData({ title: '', content: '', color: 'blue' });
    setIsAdding(true);
  };

  const startEdit = (note: any) => {
    setEditingId(note.id);
    setFormData({ title: note.title || '', content: note.content, color: note.color || 'blue' });
    setIsAdding(true);
  };

  const closeModal = () => { setIsAdding(false); setEditingId(null); };

  const handleSave = async () => {
    if (!formData.content.trim()) return;
    if (editingId) {
      await updateNote(editingId, formData);
    } else {
      await addNote(formData);
    }
    closeModal();
    setFormData({ title: '', content: '', color: 'blue' });
  };

  const filtered = useMemo(() => notes.filter(n => {
    const matchSearch = !search ||
      n.title?.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase());
    const matchColor = colorFilter === 'all' || (n.color || 'blue') === colorFilter;
    return matchSearch && matchColor;
  }), [notes, search, colorFilter]);

  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <main className={styles.main}>
        <Header
          title={currentUser?.role === 'EMPLOYEE' ? 'My Notes' : 'Communication & Notes'}
          subtitle="Capture ideas, reminders, and team updates."
        />

        {/* Onboarding tip — shown until user has a few notes */}
        {notes.length < 3 && (
          <div style={{ background: 'var(--primary-light)', border: '1px solid rgba(26,75,140,0.18)', borderRadius: '12px', padding: '0.9rem 1.1rem', marginBottom: '1.25rem', display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
            <Lightbulb size={15} color="var(--primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div>
              <p style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--primary)', marginBottom: '0.25rem' }}>How to use Notes</p>
              <p style={{ fontSize: '0.77rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                Click <strong>+ New Note</strong> to write a reminder or idea. Tag it with a <strong>color</strong> —
                Blue for general notes, Yellow for important reminders, Green for completed items, Red for urgent things.
                Notes are visible to your whole team.
              </p>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>

            {/* Color filter chips */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setColorFilter('all')}
                style={{ padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, border: `1px solid ${colorFilter === 'all' ? 'var(--primary)' : 'var(--border)'}`, background: colorFilter === 'all' ? 'var(--primary)' : 'transparent', color: colorFilter === 'all' ? '#fff' : 'var(--text-secondary)', cursor: 'pointer' }}>
                All {notes.length > 0 && `(${notes.length})`}
              </button>
              {COLORS.map(c => {
                const count = notes.filter(n => (n.color || 'blue') === c.id).length;
                if (count === 0) return null;
                const active = colorFilter === c.id;
                return (
                  <button key={c.id} onClick={() => setColorFilter(active ? 'all' : c.id)}
                    style={{ padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, border: `1px solid ${active ? c.hex : 'var(--border)'}`, background: active ? `${c.hex}18` : 'transparent', color: active ? c.hex : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.hex, display: 'inline-block' }} />
                    {c.label} ({count})
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
              <input
                placeholder="Search notes..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ padding: '0.4rem 0.75rem 0.4rem 1.9rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '0.8rem', outline: 'none', width: 170, fontFamily: 'inherit' }}
              />
            </div>
          </div>

          <button onClick={openAdd}
            style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '0.55rem 1.1rem', borderRadius: '9px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'inherit' }}>
            <Plus size={15} /> New Note
          </button>
        </div>

        {/* Grid */}
        <div className={styles.notesGrid}>
          {filtered.map(note => {
            const meta = colorMeta(note.color || 'blue');
            const isMine = note.userId === currentUser?.id;
            return (
              <div key={note.id} style={{
                background: meta.bg,
                border: `1px solid ${meta.hex}30`,
                borderTop: `3px solid ${meta.hex}`,
                borderRadius: '12px',
                padding: '1rem 1.1rem',
                display: 'flex', flexDirection: 'column', gap: '0.65rem',
              }}>
                {/* Tag row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: meta.hex, background: `${meta.hex}18`, padding: '2px 7px', borderRadius: '20px' }}>
                    {meta.label}
                  </span>
                  <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                    {!isMine && note.user?.name && (
                      <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.06)', padding: '2px 6px', borderRadius: '4px' }}>
                        {note.user.name}
                      </span>
                    )}
                    {isMine && (
                      <>
                        <button onClick={() => startEdit(note)} style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid var(--border)', color: 'var(--text-secondary)', width: 26, height: 26, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                          <Edit3 size={12} />
                        </button>
                        <button onClick={() => deleteNote(note.id)} style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid var(--border)', color: '#EF4444', width: 26, height: 26, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Title */}
                {note.title && (
                  <h3 style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: 1.3, margin: 0 }}>{note.title}</h3>
                )}

                {/* Content */}
                <p style={{ fontSize: '0.83rem', color: 'var(--text-primary)', lineHeight: 1.6, flex: 1, whiteSpace: 'pre-wrap', margin: 0, opacity: 0.88 }}>{note.content}</p>

                {/* Footer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.6rem', borderTop: `1px solid ${meta.hex}20` }}>
                  <span style={{ fontSize: '0.67rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {new Date(note.createdAt).toLocaleDateString('en-GB')}
                  </span>
                  {!isMine && (
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, color: meta.hex }}>TEAM NOTE</span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Empty state */}
          {filtered.length === 0 && (
            <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3.5rem 2rem', textAlign: 'center', background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: '16px' }}>
              <div style={{ width: 52, height: 52, borderRadius: '14px', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <StickyNote size={24} color="var(--primary)" />
              </div>

              {search || colorFilter !== 'all' ? (
                <>
                  <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.4rem', fontSize: '0.95rem' }}>No notes match your filter</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '1rem' }}>Try a different search or color.</p>
                  <button onClick={() => { setSearch(''); setColorFilter('all'); }}
                    style={{ padding: '0.45rem 1.1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', color: 'var(--primary)', fontFamily: 'inherit' }}>
                    Clear Filters
                  </button>
                </>
              ) : (
                <>
                  <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.35rem', fontSize: '0.95rem' }}>No notes yet</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '1.5rem', maxWidth: 300 }}>
                    Capture reminders, ideas, or team updates. Notes are shared with your team.
                  </p>

                  {/* Steps */}
                  <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {['Click + New Note', 'Write your content', 'Pick a color tag'].map((text, i) => (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.82rem' }}>{i + 1}</div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'center', maxWidth: 85 }}>{text}</span>
                      </div>
                    ))}
                  </div>

                  <button onClick={openAdd}
                    style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '0.55rem 1.25rem', borderRadius: '9px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'inherit' }}>
                    <Plus size={14} /> Create First Note
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Add / Edit Modal */}
      {isAdding && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>{editingId ? 'Edit Note' : 'New Note'}</h2>
              <button onClick={closeModal} className={styles.closeBtn}><X size={18} /></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.inputGroup}>
                <label>Title (optional)</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Give this note a title..."
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Content *</label>
                <textarea
                  rows={5}
                  value={formData.content}
                  onChange={e => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Write your note here..."
                  autoFocus
                />
              </div>

              {/* Color / Tag picker */}
              <div className={styles.colorPicker}>
                <label>Tag</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {COLORS.map(c => {
                    const active = formData.color === c.id;
                    return (
                      <button key={c.id} onClick={() => setFormData({ ...formData, color: c.id })}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.85rem', borderRadius: '20px', border: `1.5px solid ${active ? c.hex : 'var(--border)'}`, background: active ? `${c.hex}15` : 'transparent', color: active ? c.hex : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, fontFamily: 'inherit' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.hex, display: 'inline-block', flexShrink: 0 }} />
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.secondaryBtn} onClick={closeModal}>Cancel</button>
              <button className={styles.primaryBtn} onClick={handleSave} disabled={!formData.content.trim()}>
                <Save size={14} /> Save Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
