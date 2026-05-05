'use client';
import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useApp, LeadStatus, Priority, TaskStatus, Role, User } from '@/context/AppContext';
import styles from './Modals.module.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Calendar } from 'lucide-react';
import CustomSelect from './CustomSelect';
import CustomTimePicker from './CustomTimePicker';

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
  const { departments, sources, taskTypes, showToast } = useApp();
  const [form, setForm] = useState({
    leadName: '', contactName: '', email: '', contactNumber: '', sourceId: sources[0]?.id || '',
    departmentId: departments[0]?.id || '', taskTypeId: taskTypes[0]?.id || '', status: 'NEW' as LeadStatus, remarks: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    if (validate()) {
      setIsSubmitting(true);
      try {
        await onSubmit(form);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
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
          <input className={styles.input} required value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })} placeholder="Contact Person Name" />
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
        <CustomSelect
          label="Status"
          options={(['NEW', 'CONVERTED'] as LeadStatus[]).map(s => ({ id: s, name: s }))}
          value={form.status}
          onChange={val => setForm({ ...form, status: val as LeadStatus })}
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
      <FormField label="Remarks *">
        <textarea className={styles.textarea} required value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} placeholder="Additional remarks..." rows={3} />
      </FormField>
      <div className={styles.formActions}>
        <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
          {isSubmitting ? 'Creating Lead...' : 'Create Lead'}
        </button>
      </div>
    </form>
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
export function AddTaskForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const { departments, taskTypes, users, leads, showToast } = useApp();
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

  // Helper: sync department & taskType from a lead
  const syncFromLead = (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      return { leadId, departmentId: lead.departmentId, taskTypeId: lead.taskTypeId };
    }
    return { leadId };
  };

  // Initialize defaults once lists are available
  React.useEffect(() => {
    if (leads.length > 0 && !form.leadId) {
      const firstLead = leads[0];
      setForm(curr => ({
        ...curr,
        leadId: firstLead.id,
        departmentId: firstLead.departmentId,
        taskTypeId: firstLead.taskTypeId,
      }));
    }
    if (users.length > 0 && !form.assignedToId) {
      const firstEmp = users.find(u => u.role === 'EMPLOYEE');
      setForm(curr => ({ ...curr, assignedToId: firstEmp?.id || users[0].id }));
    }
    
    // Default start time to 5:30 PM (17:30)
    const now = new Date();
    now.setHours(17, 30, 0, 0);
    setForm(curr => ({ ...curr, startDate: now }));
  }, [leads, users, departments]);

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

    if (form.startDate && form.startDate.getHours() < 17 || (form.startDate?.getHours() === 17 && form.startDate?.getMinutes() < 30)) {
      showToast('Validation Error', 'Task start time must be 5:30 PM or later.', 'error');
      return;
    }

    if (form.completionDate) {
      const compTime = form.completionDate.getHours() * 60 + form.completionDate.getMinutes();
      const minTime = 17 * 60 + 30; // 17:30 in minutes
      if (compTime < minTime) {
        showToast('Validation Error', 'Target completion time cannot be before 5:30 PM.', 'error');
        return;
      }
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
          options={leads.map(l => ({ id: l.id, name: `${l.leadName} (${l.leadNo})` }))}
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
              portalId="root"
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
              portalId="root"
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
