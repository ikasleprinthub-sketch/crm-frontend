'use client';
import React, { useState, useMemo, useRef } from 'react';
import { Eye, EyeOff, Upload, CheckCircle, XCircle, Loader } from 'lucide-react';
import { useApp, LeadStatus, Priority, TaskStatus, Role, User } from '@/context/AppContext';
import styles from './Modals.module.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Calendar } from 'lucide-react';
import CustomSelect from './CustomSelect';
import CustomTimePicker from './CustomTimePicker';
import CustomDatePicker from './CustomDatePicker';
import api from '@/lib/api';

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
const DOC_CATEGORIES = ['AADHAR', 'PAN', 'GST', 'PHOTO', 'OTHER'] as const;
type DocCategory = typeof DOC_CATEGORIES[number];
type UploadStatus = 'idle' | 'uploading' | 'done' | 'error';

interface UploadRow {
  category: DocCategory;
  file: File | null;
  status: UploadStatus;
}

export function AddLeadForm({
  onSubmit,
  onClose,
}: {
  onSubmit: (data: any) => Promise<any>;
  onClose: () => void;
}) {
  const { departments, sources, taskTypes, showToast } = useApp();
  const [form, setForm] = useState({
    leadName: '', contactName: '', email: '', contactNumber: '',
    sourceId: sources[0]?.id || '',
    departmentId: departments[0]?.id || '',
    taskTypeId: taskTypes[0]?.id || '',
    status: 'NEW' as LeadStatus,
    remarks: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 2 state
  const [step, setStep] = useState<1 | 2>(1);
  const [createdLead, setCreatedLead] = useState<{ id: string; leadNo: string; leadName: string } | null>(null);
  const [uploadRows, setUploadRows] = useState<UploadRow[]>(
    DOC_CATEGORIES.map(c => ({ category: c, file: null, status: 'idle' }))
  );
  const [isUploading, setIsUploading] = useState(false);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const filteredTypes = taskTypes.filter(t => t.departmentId === form.departmentId);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.leadName) {
      newErrors.leadName = 'Lead name is required';
      showToast('Validation Error', 'Lead/Business name is required');
    }
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) {
      newErrors.email = 'Invalid email format';
      showToast('Validation Error', 'Please enter a valid email address');
    }
    if (form.contactNumber) {
      const digits = form.contactNumber.replace(/\D/g, '');
      if (digits.length !== 10) {
        newErrors.contactNumber = 'Phone number must be exactly 10 digits';
        showToast('Validation Error', 'Phone number must be exactly 10 digits');
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const lead = await onSubmit(form);
      setCreatedLead(lead);
      setStep(2);
    } finally {
      setIsSubmitting(false);
    }
  };

  const setRowFile = (category: DocCategory, file: File | null) => {
    setUploadRows(prev =>
      prev.map(r => r.category === category ? { ...r, file, status: 'idle' } : r)
    );
  };

  const handleUploadAndDone = async () => {
    if (!createdLead) return;
    const toUpload = uploadRows.filter(r => r.file && r.status === 'idle');

    if (toUpload.length === 0) {
      onClose();
      return;
    }

    setIsUploading(true);
    for (const row of toUpload) {
      if (!row.file) continue;
      setUploadRows(prev => prev.map(r => r.category === row.category ? { ...r, status: 'uploading' } : r));
      try {
        const fd = new FormData();
        fd.append('file', row.file);
        fd.append('category', row.category);
        await api.post(`/leads/${createdLead.id}/documents`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setUploadRows(prev => prev.map(r => r.category === row.category ? { ...r, status: 'done' } : r));
      } catch {
        setUploadRows(prev => prev.map(r => r.category === row.category ? { ...r, status: 'error' } : r));
      }
    }
    setIsUploading(false);

    const hasError = uploadRows.some(r => r.status === 'error');
    if (!hasError) {
      showToast('Documents Uploaded', 'All documents saved successfully.', 'success');
      setTimeout(onClose, 600);
    }
  };

  // ── Step 1: Lead Info ──────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.88rem' }}>1</div>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--primary)' }}>Lead Details</span>
          </div>
          <div style={{ width: 64, height: 2, background: 'var(--border)', margin: '0 10px', marginBottom: '18px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--border)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.88rem' }}>2</div>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Documents</span>
          </div>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formRow}>
          <FormField label="Lead/Business Name *">
            <input
              className={`${styles.input} ${errors.leadName ? styles.inputError : ''}`}
              required
              value={form.leadName}
              onChange={e => setForm({ ...form, leadName: e.target.value })}
              placeholder="Enter lead name"
            />
            {errors.leadName && <p className={styles.errorText}>{errors.leadName}</p>}
          </FormField>
          <FormField label="Contact Person *">
            <input
              className={styles.input}
              required
              value={form.contactName}
              onChange={e => setForm({ ...form, contactName: e.target.value })}
              placeholder="Contact Person Name"
            />
          </FormField>
        </div>
        <div className={styles.formRow}>
          <FormField label="Phone">
            <input
              className={`${styles.input} ${errors.contactNumber ? styles.inputError : ''}`}
              value={form.contactNumber}
              onChange={e => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                setForm({ ...form, contactNumber: val });
              }}
              placeholder="10-digit number"
            />
            {errors.contactNumber && <p className={styles.errorText}>{errors.contactNumber}</p>}
          </FormField>
          <FormField label="Email">
            <input
              className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="Email address"
            />
            {errors.email && <p className={styles.errorText}>{errors.email}</p>}
          </FormField>
        </div>
        <div className={styles.formRow}>
          <CustomSelect
            label="Source"
            options={sources.map(s => ({ id: s.id, name: s.name }))}
            value={form.sourceId}
            onChange={val => setForm({ ...form, sourceId: val })}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.72rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.25rem' }}>
              STATUS
            </label>
            <div style={{ height: '48px', borderRadius: '14px', border: '1.5px dashed rgba(16, 185, 129, 0.4)', background: 'rgba(16, 185, 129, 0.05)', padding: '0 1.25rem', display: 'flex', alignItems: 'center', cursor: 'not-allowed', userSelect: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-green)', boxShadow: '0 0 0 2px rgba(16,185,129,0.2)' }} />
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-green)' }}>NEW</span>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.formRow}>
          <CustomSelect
            label="Department"
            options={departments.map(d => ({ id: d.id, name: d.name }))}
            value={form.departmentId}
            onChange={val => setForm({ ...form, departmentId: val, taskTypeId: taskTypes.find(t => t.departmentId === val)?.id || '' })}
          />
          <CustomSelect
            label="Task Type"
            options={filteredTypes.map(t => ({ id: t.id, name: t.name }))}
            value={form.taskTypeId}
            onChange={val => setForm({ ...form, taskTypeId: val })}
          />
        </div>
        <FormField label="Remarks *">
          <textarea
            className={styles.textarea}
            required
            value={form.remarks}
            onChange={e => setForm({ ...form, remarks: e.target.value })}
            placeholder="Additional remarks..."
            rows={3}
          />
        </FormField>
        <div className={styles.formActions}>
          <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
            {isSubmitting ? 'Creating Lead...' : 'Create Lead & Upload Documents →'}
          </button>
        </div>
        </form>
      </>
    );
  }

  // ── Step 2: Document Upload ────────────────────────────────────────────────
  const anySelected = uploadRows.some(r => r.file);
  const allDone = uploadRows.every(r => !r.file || r.status === 'done');

  return (
    <>
      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={16} />
          </div>
          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Lead Details</span>
        </div>
        <div style={{ width: 64, height: 2, background: 'var(--primary)', margin: '0 10px', marginBottom: '18px' }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.88rem' }}>2</div>
          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--primary)' }}>Documents</span>
        </div>
      </div>

      <div className={styles.form}>
        {/* Header info */}
        <div style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.9rem 1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <CheckCircle size={18} color="var(--accent-green)" />
          <div>
            <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{createdLead?.leadName} — Created</p>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{createdLead?.leadNo} · Upload documents now or skip</p>
          </div>
        </div>

        {/* Upload rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
          {uploadRows.map(row => (
            <div key={row.category} style={{
              display: 'grid',
              gridTemplateColumns: '90px 1fr 28px',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.65rem 1rem',
              borderRadius: '10px',
              border: `1px solid ${row.status === 'done' ? 'rgba(16,185,129,0.35)' : row.status === 'error' ? 'rgba(239,68,68,0.35)' : 'var(--border)'}`,
              background: row.status === 'done' ? 'rgba(16,185,129,0.05)' : row.status === 'error' ? 'rgba(239,68,68,0.05)' : 'var(--surface-hover)',
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {row.category}
              </span>

              {/* Hidden native input + styled button + filename */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                <input
                  ref={el => { fileRefs.current[row.category] = el; }}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  disabled={isUploading || row.status === 'done'}
                  onChange={e => setRowFile(row.category, e.target.files?.[0] || null)}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => fileRefs.current[row.category]?.click()}
                  disabled={isUploading || row.status === 'done'}
                  style={{
                    padding: '0.3rem 0.7rem',
                    borderRadius: '6px',
                    border: `1px solid ${row.file ? 'var(--primary)' : 'var(--border)'}`,
                    background: row.file ? 'var(--primary)' : 'transparent',
                    color: row.file ? '#fff' : 'var(--text-secondary)',
                    fontSize: '0.73rem',
                    fontWeight: 600,
                    cursor: isUploading || row.status === 'done' ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    transition: 'all 0.15s',
                  }}
                >
                  {row.status === 'done' ? 'Uploaded' : row.file ? 'Change' : 'Choose File'}
                </button>
                <span style={{
                  fontSize: '0.73rem',
                  color: row.file ? 'var(--text-primary)' : 'var(--text-secondary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                }}>
                  {row.file ? row.file.name : 'No file chosen'}
                </span>
              </div>

              {/* Status icon */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                {row.status === 'uploading' && <Loader size={15} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />}
                {row.status === 'done'      && <CheckCircle size={15} color="var(--accent-green)" />}
                {row.status === 'error'     && <XCircle size={15} color="var(--accent-red)" />}
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            style={{ padding: '0.55rem 1.25rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: isUploading ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
          >
            Skip
          </button>
          <button
            type="button"
            onClick={handleUploadAndDone}
            disabled={isUploading || !anySelected || allDone}
            className={styles.submitBtn}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Upload size={14} />
            {isUploading ? 'Uploading...' : 'Upload & Done'}
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Form Helpers ── */


const combineDateAndTime = (date: Date | null, timeStr: string) => {
  if (!date) return null;
  const newDate = new Date(date);
  const [hours, minutes] = timeStr.split(':').map(Number);
  newDate.setHours(hours, minutes, 0, 0);
  return newDate;
};

const getTimeFromDate = (date: Date | null) => {
  if (!date) return '09:00';
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
};

/* ── Add Task Form ── */
export function AddTaskForm({ onSubmit, initialLeadId }: { onSubmit: (data: any) => void, initialLeadId?: string }) {
  const { departments, taskTypes, users, leads, tasks, showToast } = useApp();
  const [form, setForm] = useState({
    leadId: '',
    assignedToId: '',
    departmentId: '',
    taskTypeId: '',
    priority: 'REGULAR' as Priority,
    status: 'NOT_YET_STARTED' as TaskStatus,
    startDate: new Date() as Date | null,
    completionDate: null as Date | null,
    remarks: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper: sync department, taskType, and remarks from a lead
  const syncFromLead = (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      return { leadId, departmentId: lead.departmentId, taskTypeId: lead.taskTypeId, remarks: lead.remarks || '' };
    }
    return { leadId };
  };

  const availableLeads = useMemo(() => leads.filter(l => l.status === 'CONVERTED' && !tasks.some(t => t.leadId === l.id)), [leads, tasks]);

  // Initialize defaults once lists are available
  React.useEffect(() => {
    if (initialLeadId) {
      setForm(curr => ({ ...curr, ...syncFromLead(initialLeadId) }));
    } else if (availableLeads.length > 0 && !form.leadId) {
      const firstLead = availableLeads[0];
      setForm(curr => ({
        ...curr,
        leadId: firstLead.id,
        departmentId: firstLead.departmentId,
        taskTypeId: firstLead.taskTypeId,
        remarks: firstLead.remarks || '',
      }));
    }
    if (users.length > 0 && !form.assignedToId) {
      const firstEmp = users.find(u => u.role === 'EMPLOYEE');
      setForm(curr => ({ ...curr, assignedToId: firstEmp?.id || users[0].id }));
    }
  }, [availableLeads, users, departments, initialLeadId]);

  const filteredTypes = taskTypes.filter(t => t.departmentId === form.departmentId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Explicit Validation
    if (!form.leadId || !form.assignedToId || !form.departmentId || !form.taskTypeId) {
      showToast('Selection Required', 'Please ensure all required fields (*) are selected.', 'error');
      return;
    }

    if (!form.remarks.trim()) {
      showToast('Remarks Required', 'Remarks are required for the task.', 'error');
      return;
    }

    if (form.completionDate && form.startDate && form.completionDate < form.startDate) {
      showToast('Validation Error', 'Target completion time cannot be before start time.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(form);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get display names for locked fields
  const selectedDept = departments.find(d => d.id === form.departmentId);
  const selectedType = taskTypes.find(t => t.id === form.taskTypeId);

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formRow}>
        <CustomSelect
          label="Associated Lead *"
          options={availableLeads.map(l => ({ id: l.id, name: `${l.leadName} (${l.leadNo})` }))}
          value={form.leadId}
          onChange={val => setForm({ ...form, ...syncFromLead(val) })}
        />
        <CustomSelect
          label="Assign To *"
          options={users.map(u => ({ id: u.id, name: `${u.name} (${u.role === 'MANAGER' ? 'Team Leader' : u.role.replace('_', ' ')})` }))}
          value={form.assignedToId}
          onChange={val => setForm({ ...form, assignedToId: val })}
        />
      </div>
      <div className={styles.formRow}>
        <CustomSelect
          label="Department"
          options={departments.map(d => ({ id: d.id, name: d.name }))}
          value={form.departmentId}
          onChange={val => setForm({ ...form, departmentId: val, taskTypeId: taskTypes.find(t => t.departmentId === val)?.id || '' })}
        />
        <CustomSelect
          label="Task Type"
          options={filteredTypes.map(t => ({ id: t.id, name: t.name }))}
          value={form.taskTypeId}
          onChange={val => setForm({ ...form, taskTypeId: val })}
        />
      </div>
      <div className={styles.formRow}>
        <CustomSelect
          label="Priority"
          options={(['REGULAR', 'IMPORTANT', 'URGENT'] as Priority[]).map(p => ({ id: p, name: p }))}
          value={form.priority}
          onChange={val => setForm({ ...form, priority: val as Priority })}
        />
        <CustomSelect
          label="Initial Status"
          options={(['NOT_YET_STARTED', 'WORK_IN_PROGRESS', 'PENDING_FOR_APPROVAL', 'DATA_NOT_RECEIVED'] as TaskStatus[]).map(p => ({ id: p, name: p.replace(/_/g, ' ') }))}
          value={form.status}
          onChange={val => setForm({ ...form, status: val as TaskStatus })}
        />
      </div>
      <div className={styles.formRow}>
        <FormField label="Start Date *">
          <div className={styles.datePickerWrapper}>
            <Calendar size={14} className={styles.dateIcon} />
            <DatePicker
              selected={form.startDate}
              onChange={(date: Date | null) => {
                const time = getTimeFromDate(form.startDate);
                setForm({ ...form, startDate: combineDateAndTime(date, time) });
              }}
              dateFormat="dd/MM/yyyy"
              className={styles.input}
              placeholderText="Select start date"
              required
              minDate={new Date()}
              popperClassName="react-datepicker-popper"
              calendarClassName="premium-datepicker"
              dayClassName={() => 'premium-day'}
              showPopperArrow={false}
            />
          </div>
        </FormField>
        <CustomTimePicker
          label="Start Time"
          value={getTimeFromDate(form.startDate)}
          onChange={time => setForm({ ...form, startDate: combineDateAndTime(form.startDate, time) })}
          required
        />
      </div>

      <div className={styles.formRow}>
        <FormField label="Target Completion Date *">
          <div className={styles.datePickerWrapper}>
            <Calendar size={14} className={styles.dateIcon} />
            <DatePicker
              selected={form.completionDate}
              onChange={(date: Date | null) => {
                const time = getTimeFromDate(form.completionDate || new Date());
                setForm({ ...form, completionDate: combineDateAndTime(date, time) });
              }}
              dateFormat="dd/MM/yyyy"
              className={styles.input}
              placeholderText="Select completion date"
              required
              minDate={new Date()}
              popperClassName="react-datepicker-popper"
              calendarClassName="premium-datepicker"
              dayClassName={() => 'premium-day'}
              showPopperArrow={false}
            />
          </div>
        </FormField>
        <CustomTimePicker
          label="Target Completion Time"
          value={getTimeFromDate(form.completionDate)}
          onChange={time => setForm({ ...form, completionDate: combineDateAndTime(form.completionDate || new Date(), time) })}
          required
        />
      </div>
      <FormField label="Remarks *">
        <textarea className={styles.textarea} required value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} placeholder="Any specific instructions..." rows={3} />
      </FormField>
      <div className={styles.formActions}>
        <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
          {isSubmitting ? 'Creating Task...' : 'Create Task'}
        </button>
      </div>
    </form>
  );
}

/* ── Add User Form ── */
export function AddUserForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const { currentUser, users } = useApp();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'EMPLOYEE' as Role,
    managerId: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isSuper = currentUser?.role === 'SUPER_ADMIN';
  const isAdmin = currentUser?.role === 'ADMIN';
  const isTeamLeader = currentUser?.role === 'MANAGER';

  // Role options based on who is creating
  const roleOptions: Role[] = isSuper
    ? ['ADMIN', 'MANAGER', 'EMPLOYEE']
    : isAdmin
      ? ['MANAGER', 'EMPLOYEE']
      : ['EMPLOYEE'];

  // Team Leader options based on selected role
  const teamLeaderOptions = users.filter(u => {
    if (form.role === 'EMPLOYEE') return u.role === 'MANAGER' || u.role === 'SUPER_ADMIN' || u.role === 'ADMIN';
    if (form.role === 'MANAGER') return u.role === 'SUPER_ADMIN' || u.role === 'ADMIN';
    return false;
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.name) newErrors.name = 'Name is required';
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Valid email is required';
    }
    if (!form.password || form.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      setIsSubmitting(true);
      try {
        const submissionData = {
          ...form,
          managerId: form.managerId === "" ? null : form.managerId
        };
        await onSubmit(submissionData);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <FormField label="Full Name *">
        <input
          className={styles.input}
          required
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          placeholder="John Doe"
        />
        {errors.name && <p className={styles.errorText}>{errors.name}</p>}
      </FormField>

      <div className={styles.formRow}>
        <FormField label="Email Address *">
          <input
            className={styles.input}
            type="email"
            required
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            placeholder="john@example.com"
          />
          {errors.email && <p className={styles.errorText}>{errors.email}</p>}
        </FormField>
        <FormField label="Temporary Password *">
          <div className={styles.passwordWrapper}>
            <input
              className={styles.input}
              type={showPassword ? 'text' : 'password'}
              required
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="Min 6 characters"
            />
            <button
              type="button"
              className={styles.eyeBtn}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>
          {errors.password && <p className={styles.errorText}>{errors.password}</p>}
        </FormField>
      </div>

      <div className={styles.formRow}>
        <FormField label="Assign Role *">
          <select
            className={styles.select}
            value={form.role}
            onChange={e => setForm({ ...form, role: e.target.value as Role })}
          >
            {roleOptions.map(r => (
              <option key={r} value={r}>
                {r === 'MANAGER' ? 'TEAM LEADER' : r.replace('_', ' ')}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Reporting Person">
          <select
            className={styles.select}
            value={form.managerId}
            onChange={e => setForm({ ...form, managerId: e.target.value })}
          >
            <option value="">No Team Leader (Direct)</option>
            {teamLeaderOptions.map(m => <option key={m.id} value={m.id}>{m.name} ({m.role === 'MANAGER' ? 'TEAM LEADER' : m.role.replace('_', ' ')})</option>)}
          </select>
        </FormField>
      </div>

      <div className={styles.formActions}>
        <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
          {isSubmitting ? 'Creating Account...' : (isTeamLeader ? 'Submit Request' : 'Create Account')}
        </button>
      </div>
    </form>
  );
}

/* ── Edit User Form ── */
export function EditUserForm({ user, onSubmit }: { user: User; onSubmit: (data: any) => void }) {
  const { users, showToast } = useApp();
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    password: '',
    role: user.role,
    managerId: user.managerId || '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const roleOptions: Role[] = ['ADMIN', 'MANAGER', 'EMPLOYEE'];

  const teamLeaderOptions = users.filter(u => {
    if (form.role === 'EMPLOYEE') return u.role === 'MANAGER' || u.role === 'ADMIN' || u.role === 'SUPER_ADMIN';
    if (form.role === 'MANAGER') return u.role === 'ADMIN' || u.role === 'SUPER_ADMIN';
    return false;
  }).filter(u => u.id !== user.id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (form.password && form.password.length < 6) {
      showToast('Weak Password', 'Password must be at least 6 characters long', 'error');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      showToast('Invalid Email', 'Valid email is required', 'error');
      return;
    }

    const submissionData: any = { ...form };
    if (!submissionData.password) delete submissionData.password;
    submissionData.managerId = submissionData.managerId === "" ? null : submissionData.managerId;
    onSubmit(submissionData);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <FormField label="Full Name *">
        <input
          className={styles.input}
          required
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
        />
      </FormField>

      <div className={styles.formRow}>
        <FormField label="Email Address *">
          <input
            className={styles.input}
            type="email"
            required
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
          />
        </FormField>
        <FormField label="New Password (optional)">
          <div className={styles.passwordWrapper}>
            <input
              className={styles.input}
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="Leave blank to keep"
            />
            <button
              type="button"
              className={styles.eyeBtn}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </FormField>
      </div>

      <div className={styles.formRow}>
        <FormField label="Role *">
          <select
            className={styles.select}
            value={form.role}
            onChange={e => setForm({ ...form, role: e.target.value as Role })}
          >
            {roleOptions.map(r => (
              <option key={r} value={r}>
                {r === 'MANAGER' ? 'TEAM LEADER' : r.replace('_', ' ')}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Reporting Person">
          <select
            className={styles.select}
            value={form.managerId}
            onChange={e => setForm({ ...form, managerId: e.target.value })}
          >
            <option value="">No Team Leader (Direct)</option>
            {teamLeaderOptions.map(m => <option key={m.id} value={m.id}>{m.name} ({m.role === 'MANAGER' ? 'TEAM LEADER' : m.role.replace('_', ' ')})</option>)}
          </select>
        </FormField>
      </div>

      <div className={styles.formActions}>
        <button type="submit" className={styles.submitBtn}>Save Changes</button>
      </div>
    </form>
  );
}

/* ── Edit Task Form ── */
export function EditTaskForm({ task, onSubmit }: { task: any; onSubmit: (data: any) => void }) {
  const { departments, taskTypes, users, leads, showToast } = useApp();
  const [form, setForm] = useState({
    leadId: task.leadId,
    assignedToId: task.assignedToId,
    departmentId: task.departmentId,
    taskTypeId: task.taskTypeId,
    priority: task.priority as Priority,
    status: task.status as TaskStatus,
    startDate: (task.startDate ? new Date(task.startDate) : new Date()) as Date | null,
    completionDate: (task.completionDate ? new Date(task.completionDate) : null) as Date | null,
    remarks: task.remarks || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredTypes = taskTypes.filter(t => t.departmentId === form.departmentId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.leadId || !form.assignedToId || !form.departmentId || !form.taskTypeId) {
      showToast('Selection Required', 'Please ensure all required fields (*) are selected.', 'error');
      return;
    }
    if (!form.remarks.trim()) {
      showToast('Remarks Required', 'Remarks are required for the task.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(form);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.detailsCard}>
        <p className={styles.detailsTitle}>Task Details (Read-Only)</p>
        <div className={styles.detailsGrid}>
          <p><strong>Task No:</strong> {task.taskNo}</p>
          <p><strong>Priority:</strong> <span style={{ color: task.priority === 'URGENT' ? 'var(--accent-red)' : 'inherit' }}>{task.priority}</span></p>
          <p><strong>Type:</strong> {taskTypes.find(t => t.id === task.taskTypeId)?.name || '—'}</p>
          <p><strong>Deadline:</strong> {task.completionDate ? new Date(task.completionDate).toLocaleDateString() : '—'}</p>
        </div>
      </div>

      <div className={styles.formRow}>
        <CustomSelect
          label="Reassign To Member *"
          options={users.map(u => ({ id: u.id, name: `${u.name} (${u.role === 'MANAGER' ? 'TEAM LEADER' : u.role.replace('_', ' ')})` }))}
          value={form.assignedToId}
          onChange={val => setForm({ ...form, assignedToId: val })}
        />
      </div>

      <FormField label="Reassignment Remarks / Instructions *">
        <textarea className={styles.textarea} required value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} placeholder="Explain why this task is being reassigned..." rows={3} />
      </FormField>

      <div className={styles.formActions}>
        <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
          {isSubmitting ? 'Updating Assignment...' : 'Update Assignment'}
        </button>
      </div>
    </form>
  );
}

/* ── Convert Lead Form ── */
export function ConvertLeadForm({ 
  lead, 
  onSubmit,
  onCancel
}: { 
  lead: any; 
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}) {
  const { users, showToast, currentUser } = useApp();
  const [remarks, setRemarks] = useState(lead?.remarks || '');
  const [interval, setInterval] = useState<'NONE' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM'>('NONE');
  const [customNextDueDate, setCustomNextDueDate] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent, skipRecurrence: boolean = false) => {
    e.preventDefault();
    if (!currentUser) {
      showToast('Authentication Required', 'You must be logged in to perform this action.', 'error');
      return;
    }

    const recurrenceInterval = skipRecurrence ? 'NONE' : interval;
    if (recurrenceInterval === 'CUSTOM' && !customNextDueDate) {
      showToast('Custom Date Required', 'Please select the next return filing date.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const data: any = {
        assignedToId: currentUser.id,
        remarks: remarks || lead.remarks || '',
        priority: 'REGULAR',
        startDate: new Date().toISOString(),
      };

      if (recurrenceInterval !== 'NONE') {
        data.recurrence = {
          interval: recurrenceInterval,
          ...(recurrenceInterval === 'CUSTOM' && { nextDueDate: customNextDueDate?.toISOString() })
        };
      }

      await onSubmit(data);
    } catch (e: any) {
      // Toast error is handled by the caller
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={(e) => handleSubmit(e, false)} className={styles.form}>
      <div style={{
        background: 'linear-gradient(145deg, rgba(67, 24, 255, 0.05) 0%, rgba(67, 24, 255, 0.01) 100%)',
        border: '1px solid rgba(67, 24, 255, 0.15)',
        boxShadow: 'inset 0 2px 10px rgba(67, 24, 255, 0.02)',
        padding: '1.25rem 1.5rem',
        borderRadius: '16px',
        marginBottom: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem'
      }}>
        <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--primary)' }}>Converting Lead</p>
        <p style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>{lead.leadName}</p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '0.2rem' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)', boxShadow: '0 0 0 2px rgba(67, 24, 255, 0.2)' }} />
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{lead.taskType?.name || 'Standard Filing'}</span>
        </div>
      </div>

      {/* Recurrence Frequency Options */}
      <div className={styles.formRow} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px', marginBottom: '1rem', width: '100%' }}>
        <CustomSelect
          label="Return Update Frequency"
          options={[
            { id: 'NONE', name: 'One-time Task (No Recurrence)' },
            { id: 'MONTHLY', name: 'Monthly Return' },
            { id: 'QUARTERLY', name: 'Quarterly Return' },
            { id: 'YEARLY', name: 'Yearly Return' },
            { id: 'CUSTOM', name: 'Custom Date' }
          ]}
          value={interval}
          onChange={(val) => setInterval(val as any)}
        />
      </div>

      {/* Custom Next Due Date Picker */}
      {interval === 'CUSTOM' && (
        <div className={styles.formRow} style={{ marginTop: '0.5rem', width: '100%' }}>
          <CustomDatePicker
            label="Select Next Return Filing Date *"
            selected={customNextDueDate}
            onChange={(date: Date | null) => setCustomNextDueDate(date)}
          />
        </div>
      )}

      <FormField label="Remarks / Return Notes">
        <textarea
          className={styles.textarea}
          value={remarks}
          onChange={e => setRemarks(e.target.value)}
          placeholder="Add specific details or instructions for this return filing..."
          rows={3}
        />
      </FormField>

      <div className={styles.formActions} style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', width: '100%' }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            border: '1px solid var(--border)',
            background: 'none',
            color: 'var(--text-secondary)',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            border: 'none',
            background: 'var(--primary)',
            color: 'white',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(67, 24, 255, 0.2)'
          }}
        >
          {isSubmitting ? 'Converting...' : 'Convert Lead'}
        </button>
      </div>
    </form>
  );
}
