'use client';
import React, { useState } from 'react';
import { useApp, LeadStatus, Priority, TaskStatus } from '@/context/AppContext';
import styles from './Modals.module.css';

/* ── Modal Shell ── */
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  if (!isOpen) return null;
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={`${styles.modal} ${styles[size]}`} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{title}</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>
  );
}

/* ── Form Utilities ── */
function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.formField}>
      <label className={styles.fieldLabel}>{label}</label>
      {children}
    </div>
  );
}

/* ── Add Lead Form ── */
export function AddLeadForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const { departments, sources, taskTypes } = useApp();
  const [form, setForm] = useState({
    leadName: '', contactName: '', email: '', contactNumber: '', sourceId: sources[0]?.id || '',
    departmentId: departments[0]?.id || '', taskTypeId: taskTypes[0]?.id || '', status: 'NEW' as LeadStatus, remarks: '',
  });

  const filteredTypes = taskTypes.filter(t => t.departmentId === form.departmentId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formRow}>
        <FormField label="Lead/Business Name *">
          <input className={styles.input} required value={form.leadName} onChange={e => setForm({ ...form, leadName: e.target.value })} placeholder="Enter lead name" />
        </FormField>
        <FormField label="Contact Name">
          <input className={styles.input} value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })} placeholder="Contact Person" />
        </FormField>
      </div>
      <div className={styles.formRow}>
        <FormField label="Phone">
          <input className={styles.input} value={form.contactNumber} onChange={e => setForm({ ...form, contactNumber: e.target.value })} placeholder="Phone number" />
        </FormField>
        <FormField label="Email">
          <input className={styles.input} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email address" />
        </FormField>
      </div>
      <div className={styles.formRow}>
        <FormField label="Source">
          <select className={styles.select} value={form.sourceId} onChange={e => setForm({ ...form, sourceId: e.target.value })}>
            {sources.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
          </select>
        </FormField>
        <FormField label="Status">
          <select className={styles.select} value={form.status} onChange={e => setForm({ ...form, status: e.target.value as LeadStatus })}>
            {(['NEW', 'CONVERTED'] as LeadStatus[]).map(s => (<option key={s} value={s}>{s}</option>))}
          </select>
        </FormField>
      </div>
      <div className={styles.formRow}>
        <FormField label="Department">
          <select className={styles.select} value={form.departmentId} onChange={e => setForm({ ...form, departmentId: e.target.value, taskTypeId: taskTypes.find(t => t.departmentId === e.target.value)?.id || '' })}>
            {departments.map(d => (<option key={d.id} value={d.id}>{d.name}</option>))}
          </select>
        </FormField>
        <FormField label="Task Type">
          <select className={styles.select} value={form.taskTypeId} onChange={e => setForm({ ...form, taskTypeId: e.target.value })}>
            {filteredTypes.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
          </select>
        </FormField>
      </div>
      <FormField label="Remarks">
        <textarea className={styles.textarea} value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} placeholder="Additional remarks..." rows={3} />
      </FormField>
      <div className={styles.formActions}>
        <button type="submit" className={styles.submitBtn}>Create Lead</button>
      </div>
    </form>
  );
}

/* ── Add Task Form ── */
export function AddTaskForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const { departments, taskTypes, users, leads } = useApp();
  const [form, setForm] = useState({
    leadId: '', 
    assignedToId: '',
    departmentId: '', 
    taskTypeId: '',
    priority: 'REGULAR' as Priority, 
    status: 'NOT_YET_STARTED' as TaskStatus,
    startDate: '', 
    completionDate: '', 
    remarks: '',
  });

  // Initialize defaults once lists are available
  React.useEffect(() => {
    if (leads.length > 0 && !form.leadId) setForm(curr => ({ ...curr, leadId: leads[0].id }));
    if (users.length > 0 && !form.assignedToId) {
      const firstEmp = users.find(u => u.role === 'EMPLOYEE');
      setForm(curr => ({ ...curr, assignedToId: firstEmp?.id || users[0].id }));
    }
    if (departments.length > 0 && !form.departmentId) setForm(curr => ({ ...curr, departmentId: departments[0].id }));
  }, [leads, users, departments]);

  const filteredTypes = taskTypes.filter(t => t.departmentId === form.departmentId);

  // Sync task type when department changes or types load
  React.useEffect(() => {
    if (filteredTypes.length > 0 && (!form.taskTypeId || !filteredTypes.find(t => t.id === form.taskTypeId))) {
      setForm(curr => ({ ...curr, taskTypeId: filteredTypes[0].id }));
    }
  }, [form.departmentId, filteredTypes]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Explicit Validation
    if (!form.leadId || !form.assignedToId || !form.departmentId || !form.taskTypeId) {
      alert("Please ensure all required fields (*) are selected.");
      return;
    }

    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formRow}>
        <FormField label="Associated Lead *">
          <select className={styles.select} required value={form.leadId} onChange={e => setForm({ ...form, leadId: e.target.value })}>
            <option value="" disabled>Select a Lead</option>
            {leads.map(l => (<option key={l.id} value={l.id}>{l.leadName} ({l.leadNo})</option>))}
          </select>
        </FormField>
        <FormField label="Assign To *">
          <select className={styles.select} required value={form.assignedToId} onChange={e => setForm({ ...form, assignedToId: e.target.value })}>
            <option value="" disabled>Select Employee</option>
            {users.map(u => (<option key={u.id} value={u.id}>{u.name} ({u.role})</option>))}
          </select>
        </FormField>
      </div>
      <div className={styles.formRow}>
        <FormField label="Department *">
          <select className={styles.select} required value={form.departmentId} onChange={e => setForm({ ...form, departmentId: e.target.value })}>
            <option value="" disabled>Select Department</option>
            {departments.map(d => (<option key={d.id} value={d.id}>{d.name}</option>))}
          </select>
        </FormField>
        <FormField label="Task Type *">
          <select className={styles.select} required value={form.taskTypeId} onChange={e => setForm({ ...form, taskTypeId: e.target.value })}>
            <option value="" disabled>{filteredTypes.length ? "Select Task Type" : "No types in this dept"}</option>
            {filteredTypes.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
          </select>
        </FormField>
      </div>
      <div className={styles.formRow}>
        <FormField label="Priority">
          <select className={styles.select} value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as Priority })}>
            {(['REGULAR', 'IMPORTANT', 'URGENT'] as Priority[]).map(p => (<option key={p} value={p}>{p}</option>))}
          </select>
        </FormField>
        <FormField label="Initial Status">
          <select className={styles.select} value={form.status} onChange={e => setForm({ ...form, status: e.target.value as TaskStatus })}>
            {(['NOT_YET_STARTED', 'WORK_IN_PROGRESS', 'PENDING_FOR_APPROVAL', 'DATA_NOT_RECEIVED'] as TaskStatus[]).map(p => (<option key={p} value={p}>{p.replace(/_/g, ' ')}</option>))}
          </select>
        </FormField>
      </div>
      <div className={styles.formRow}>
        <FormField label="Start Date">
          <input className={styles.input} type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
        </FormField>
        <FormField label="Target Completion">
          <input className={styles.input} type="date" value={form.completionDate} onChange={e => setForm({ ...form, completionDate: e.target.value })} />
        </FormField>
      </div>
      <FormField label="Remarks">
        <textarea className={styles.textarea} value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} placeholder="Any specific instructions..." rows={3} />
      </FormField>
      <div className={styles.formActions}>
        <button type="submit" className={styles.submitBtn}>Create Task</button>
      </div>
    </form>
  );
}
