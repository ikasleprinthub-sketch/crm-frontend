'use client';
import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useApp, LeadStatus, Priority, TaskStatus, Role, User } from '@/context/AppContext';
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
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isSuper = currentUser?.role === 'SUPER_ADMIN';
  const isAdmin = currentUser?.role === 'ADMIN';
  const isManager = currentUser?.role === 'MANAGER';

  // Role options based on who is creating
  const roleOptions: Role[] = isSuper
    ? ['ADMIN', 'MANAGER', 'EMPLOYEE']
    : isAdmin
      ? ['MANAGER', 'EMPLOYEE']
      : ['EMPLOYEE'];

  // Manager options based on selected role
  const managerOptions = users.filter(u => {
    if (form.role === 'EMPLOYEE') return u.role === 'MANAGER' || u.role === 'SUPER_ADMIN' || u.role === 'ADMIN';
    if (form.role === 'MANAGER') return u.role === 'SUPER_ADMIN' || u.role === 'ADMIN';
    return false;
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.name) newErrors.name = 'Name is required';
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) newErrors.email = 'Valid email is required';
    if (!form.password || form.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      const submissionData = {
        ...form,
        managerId: form.managerId === "" ? null : form.managerId
      };
      onSubmit(submissionData);
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
                {r === 'MANAGER' ? 'Team Leader' : r.replace('_', ' ')}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Reporting Manager">
          <select
            className={styles.select}
            value={form.managerId}
            onChange={e => setForm({ ...form, managerId: e.target.value })}
          >
            <option value="">No Manager (Direct)</option>
            {managerOptions.map(m => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
          </select>
        </FormField>
      </div>

      <div className={styles.formActions}>
        <button type="submit" className={styles.submitBtn}>
          {isManager ? 'Submit Request' : 'Create Account'}
        </button>
      </div>
    </form>
  );
}

/* ── Edit User Form ── */
export function EditUserForm({ user, onSubmit }: { user: User; onSubmit: (data: any) => void }) {
  const { users } = useApp();
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    password: '',
    role: user.role,
    managerId: user.managerId || '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const roleOptions: Role[] = ['ADMIN', 'MANAGER', 'EMPLOYEE'];

  const managerOptions = users.filter(u => {
    if (form.role === 'EMPLOYEE') return u.role === 'MANAGER' || u.role === 'ADMIN' || u.role === 'SUPER_ADMIN';
    if (form.role === 'MANAGER') return u.role === 'ADMIN' || u.role === 'SUPER_ADMIN';
    return false;
  }).filter(u => u.id !== user.id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
              <option key={r} value={r}>{r.replace('_', ' ')}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Reporting Manager">
          <select
            className={styles.select}
            value={form.managerId}
            onChange={e => setForm({ ...form, managerId: e.target.value })}
          >
            <option value="">No Manager (Direct)</option>
            {managerOptions.map(m => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
          </select>
        </FormField>
      </div>

      <div className={styles.formActions}>
        <button type="submit" className={styles.submitBtn}>Save Changes</button>
      </div>
    </form>
  );
}
