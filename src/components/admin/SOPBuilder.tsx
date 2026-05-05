'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, X, GripVertical } from 'lucide-react';
import api from '@/lib/api';
import styles from './SOPBuilder.module.css';

interface Step {
  id?: string;
  title: string;
  order: number;
  assignedRole: 'EMPLOYEE' | 'MANAGER' | 'ADMIN';
  deadlineHours: number;
}

interface SOPBuilderProps {
  taskTypeId: string;
  taskTypeName: string;
  onSave?: () => void;
}

export default function SOPBuilder({ taskTypeId, taskTypeName, onSave }: SOPBuilderProps) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newStep, setNewStep] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    fetchTemplate();
  }, [taskTypeId]);

  const fetchTemplate = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/sop/${taskTypeId}`);
      if (res.data?.success && res.data.data?.steps) {
        setSteps(res.data.data.steps);
      } else {
        setSteps([]);
      }
    } catch (error) {
      console.error('Failed to fetch SOP template', error);
    } finally {
      setLoading(false);
    }
  };

  const addStep = () => {
    if (!newStep.trim()) return;
    const nextOrder = steps.length > 0 ? Math.max(...steps.map(s => s.order)) + 1 : 0;
    setSteps([...steps, { 
      title: newStep.trim(), 
      order: nextOrder, 
      assignedRole: 'EMPLOYEE',
      deadlineHours: 0 
    }]);
    setNewStep('');
  };

  const removeStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i }));
    setSteps(newSteps);
  };

  const startEdit = (index: number) => {
    setEditingId(index);
    setEditValue(steps[index].title);
  };

  const saveEdit = () => {
    if (editingId === null) return;
    const newSteps = [...steps];
    newSteps[editingId].title = editValue.trim();
    setSteps(newSteps);
    setEditingId(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.post(`/sop/${taskTypeId}`, { steps });
      if (res.data?.success) {
        onSave?.();
      }
    } catch (error) {
      console.error('Failed to save SOP template', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading SOP template...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>SOP Workflow: <span className={styles.highlight}>{taskTypeName}</span></h3>
        <p className={styles.subtitle}>Define the steps that will be automatically added to new tasks of this type.</p>
      </div>

      <div className={styles.list}>
        {steps.map((step, index) => (
          <div key={index} className={styles.item}>
            <GripVertical size={16} className={styles.dragHandle} />
            <span className={styles.order}>{index + 1}.</span>
            
            {editingId === index ? (
              <div className={styles.editRow}>
                <input 
                  type="text" 
                  value={editValue} 
                  onChange={(e) => setEditValue(e.target.value)}
                  className={styles.editInput}
                  autoFocus
                />
                <select 
                  className={styles.editSelect}
                  value={steps[index].assignedRole}
                  onChange={(e) => {
                    const newSteps = [...steps];
                    newSteps[index].assignedRole = e.target.value as any;
                    setSteps(newSteps);
                  }}
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <input 
                  type="number"
                  className={styles.editNumber}
                  value={steps[index].deadlineHours}
                  onChange={(e) => {
                    const newSteps = [...steps];
                    newSteps[index].deadlineHours = parseInt(e.target.value) || 0;
                    setSteps(newSteps);
                  }}
                  placeholder="H"
                />
                <button onClick={saveEdit} className={styles.saveBtn}><Check size={16} /></button>
                <button onClick={() => setEditingId(null)} className={styles.cancelBtn}><X size={16} /></button>
              </div>
            ) : (
              <>
                <div className={styles.stepInfo}>
                  <span className={styles.stepTitle}>{step.title}</span>
                  <div className={styles.stepBadges}>
                    <span className={styles.roleBadge}>{step.assignedRole}</span>
                    {step.deadlineHours > 0 && <span className={styles.deadlineBadge}>{step.deadlineHours}h</span>}
                  </div>
                </div>
                <div className={styles.actions}>
                  <button onClick={() => startEdit(index)} className={styles.iconBtn}><Edit2 size={14} /></button>
                  <button onClick={() => removeStep(index)} className={styles.iconBtnRed}><Trash2 size={14} /></button>
                </div>
              </>
            )}
          </div>
        ))}

        {steps.length === 0 && (
          <div className={styles.empty}>
            <p>No steps defined. Add the first step below.</p>
          </div>
        )}
      </div>

      <div className={styles.addSection}>
        <input 
          type="text" 
          placeholder="New step title..." 
          value={newStep}
          onChange={(e) => setNewStep(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addStep()}
          className={styles.addInput}
        />
        <button onClick={addStep} className={styles.addBtn}>
          <Plus size={16} /> Add
        </button>
      </div>

      <div className={styles.footer}>
        <button 
          onClick={handleSave} 
          className={styles.mainSaveBtn}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save SOP Workflow'}
        </button>
      </div>
    </div>
  );
}
