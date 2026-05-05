'use client';
import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useApp } from '@/context/AppContext';
import { Plus, Trash2, Edit3, Save, X, StickyNote } from 'lucide-react';
import styles from './notes.module.css';

export default function NotesPage() {
  const { currentUser, notes, addNote, updateNote, deleteNote } = useApp();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: '', content: '', color: 'blue' });

  const handleSave = async () => {
    if (!formData.content) return;
    if (editingId) {
      await updateNote(editingId, formData);
      setEditingId(null);
    } else {
      await addNote(formData);
      setIsAdding(false);
    }
    setFormData({ title: '', content: '', color: 'blue' });
  };

  const startEdit = (note: any) => {
    setEditingId(note.id);
    setFormData({ title: note.title || '', content: note.content, color: note.color || 'blue' });
  };

  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <main className={styles.main}>
        <Header 
          title={currentUser?.role === 'EMPLOYEE' ? 'My Notes' : 'Communication & Notes'} 
          subtitle={currentUser?.role === 'EMPLOYEE' ? 'Capture your thoughts and daily reminders.' : 'View team updates and personal reminders.'} 
        />

        <div className={styles.container}>
          <div className={styles.pageHeader}>
             <div className={styles.stats}>
                <div className={styles.statItem}>
                   <span className={styles.statVal}>{notes.length}</span>
                   <span className={styles.statLabel}>Total Notes</span>
                </div>
             </div>
             <button className={styles.addBtn} onClick={() => setIsAdding(true)}>
                <Plus size={20} />
                New Note
             </button>
          </div>

          <div className={styles.notesGrid}>
            {notes.map(note => (
              <div key={note.id} className={`${styles.noteCard} ${note.color === 'yellow' ? styles.noteYellow : styles.noteBlue}`}>
                <div className={styles.noteHeader}>
                  <div style={{ flex: 1 }}>
                    <h3 className={styles.noteTitle}>{note.title || 'Untitled'}</h3>
                    {note.userId !== currentUser?.id && note.user?.name && (
                      <span style={{ fontSize: '0.65rem', display: 'block', opacity: 0.8, color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', marginTop: '2px' }}>
                        From {note.user.name}
                      </span>
                    )}
                  </div>
                  {note.userId === currentUser?.id && (
                    <div className={styles.actions}>
                      <button onClick={() => startEdit(note)} className={styles.actionBtn}><Edit3 size={16} /></button>
                      <button onClick={() => deleteNote(note.id)} className={styles.actionBtn}><Trash2 size={16} /></button>
                    </div>
                  )}
                </div>
                <p className={styles.noteContent}>{note.content}</p>
                <div className={styles.noteFooter}>
                   {new Date(note.createdAt).toLocaleDateString()}
                   {note.userId !== currentUser?.id && <span style={{ marginLeft: 'auto', fontSize: '0.65rem', fontWeight: 700 }}>TEAM NOTE</span>}
                </div>
              </div>
            ))}
            {notes.length === 0 && !isAdding && (
               <div className={styles.emptyState}>
                  <StickyNote size={60} />
                  <h3>No notes yet</h3>
                  <p>Start capturing your ideas and reminders.</p>
                  <button onClick={() => setIsAdding(true)} className={styles.primaryBtn}>Create First Note</button>
               </div>
            )}
          </div>
        </div>

        {/* Modal for Add/Edit */}
        {(isAdding || editingId) && (
          <div className={styles.modalOverlay}>
            <div className={styles.modal}>
              <div className={styles.modalHeader}>
                <h2>{editingId ? 'Edit Note' : 'Create New Note'}</h2>
                <button onClick={() => { setIsAdding(false); setEditingId(null); }} className={styles.closeBtn}><X size={20} /></button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.inputGroup}>
                  <label>Title</label>
                  <input 
                    type="text" 
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})} 
                    placeholder="Note Title"
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>Content</label>
                  <textarea 
                    rows={6}
                    value={formData.content} 
                    onChange={e => setFormData({...formData, content: e.target.value})} 
                    placeholder="Write your note here..."
                  />
                </div>
                <div className={styles.colorPicker}>
                   <label>Color</label>
                   <div className={styles.colors}>
                      <button 
                        className={`${styles.colorCircle} ${styles.blueCircle} ${formData.color === 'blue' ? styles.selected : ''}`}
                        onClick={() => setFormData({...formData, color: 'blue'})}
                      />
                      <button 
                        className={`${styles.colorCircle} ${styles.yellowCircle} ${formData.color === 'yellow' ? styles.selected : ''}`}
                        onClick={() => setFormData({...formData, color: 'yellow'})}
                      />
                   </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button className={styles.secondaryBtn} onClick={() => { setIsAdding(false); setEditingId(null); }}>Cancel</button>
                <button className={styles.primaryBtn} onClick={handleSave}>
                  <Save size={18} />
                  Save Note
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
