'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';

// ─── ENUMS / TYPES ────────────────────────────────────────────────────────────

export type Role = 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
export type LeadStatus = 'NEW' | 'CONVERTED';
export type TaskStatus = 'NOT_YET_STARTED' | 'DATA_NOT_RECEIVED' | 'WORK_IN_PROGRESS' | 'PENDING_FOR_APPROVAL' | 'COMPLETED';
export type Priority = 'REGULAR' | 'IMPORTANT' | 'URGENT';

// ─── MODELS ───────────────────────────────────────────────────────────────────

export interface SOPStep {
  id: string;
  title: string;
  order: number;
}

export interface Department {
  id: string;
  name: string;
}

export interface TaskType {
  id: string;
  name: string;
  departmentId: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  managerId?: string;
  createdAt: string;
}

export interface SourceOfLead {
  id: string;
  name: string;
}

export interface Lead {
  id: string;
  leadNo: string;
  date: string;
  sourceId: string;
  leadName: string;
  contactName?: string;
  contactNumber?: string;
  email?: string;
  departmentId: string;
  taskTypeId: string;
  remarks?: string;
  status: LeadStatus;
  createdAt: string;
  source?: SourceOfLead;
}

export interface TaskSOPStep {
  id: string;
  taskId: string;
  title: string;
  order: number;
  isCompleted: boolean;
}

export interface Task {
  id: string;
  taskNo: string;
  leadId: string;
  departmentId: string;
  taskTypeId: string;
  remarks?: string;
  contactName?: string;
  contactNumber?: string;
  email?: string;
  assignedToId: string;
  status: TaskStatus;
  priority: Priority;
  startDate?: string;
  completionDate?: string;
  sopSteps: TaskSOPStep[];
  createdAt: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  token?: string;
}

// ─── CONTEXT TYPE ─────────────────────────────────────────────────────────────

interface AppContextType {
  // Auth
  currentUser: AuthUser | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;

  // Master Data
  departments: Department[];
  taskTypes: TaskType[];
  sources: SourceOfLead[];

  // Users
  users: User[];

  // Leads
  leads: Lead[];
  addLead: (leadData: any) => Promise<void>;
  updateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;

  // Tasks
  tasks: Task[];
  addTask: (taskData: any) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  updateTaskStep: (taskId: string, stepId: string, isCompleted: boolean) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  refreshTasks: () => Promise<void>;
}

import { useRouter, usePathname } from 'next/navigation';

// ─── CONTEXT ──────────────────────────────────────────────────────────────────

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('crm_user');
      if (stored) return JSON.parse(stored);
    }
    return null;
  });

  const [departments, setDepartments] = useState<Department[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [sources, setSources] = useState<SourceOfLead[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    setMounted(true);
    if (!currentUser && pathname !== '/login') {
      router.push('/login');
    }
  }, [currentUser, pathname, router]);

  // Configure axios auth header
  useEffect(() => {
    if (currentUser?.token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${currentUser.token}`;
      fetchInitialData();
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  }, [currentUser]);

  const fetchInitialData = async () => {
    try {
      const [depsRes, typesRes, usersRes, leadsRes, tasksRes, sourcesRes] = await Promise.all([
        api.get('/departments'),
        api.get('/task-types'),
        api.get('/users'),
        api.get('/leads'),
        api.get('/tasks'),
        api.get('/sources')
      ]);

      const getArr = (payload: any, key: string) => {
        if (!payload) return [];
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload[key])) return payload[key];
        if (Array.isArray(payload.data)) return payload.data;
        return [];
      };

      if (depsRes.data?.success) setDepartments(getArr(depsRes.data.data, 'departments'));
      if (typesRes.data?.success) setTaskTypes(getArr(typesRes.data.data, 'taskTypes'));
      if (usersRes.data?.success) setUsers(getArr(usersRes.data.data, 'users'));
      if (leadsRes.data?.success) setLeads(getArr(leadsRes.data.data, 'leads'));
      if (tasksRes.data?.success) setTasks(getArr(tasksRes.data.data, 'tasks'));
      if (sourcesRes.data?.success) setSources(getArr(sourcesRes.data.data, 'sources'));
    } catch (error) {
      console.error('Failed to fetch initial data', error);
    }
  };

  const refreshTasks = async () => {
    try {
      const res = await api.get('/tasks');
      if (res.data?.success) {
        const payload = res.data.data;
        const arr = Array.isArray(payload) ? payload : (payload?.tasks || payload?.data || []);
        setTasks(arr);
      }
    } catch (error) {
      console.error('Failed to refresh tasks', error);
    }
  }

  // Auth
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data?.success) {
        const user = { ...res.data.data.user, token: res.data.data.token };
        setCurrentUser(user);
        localStorage.setItem('crm_user', JSON.stringify(user));
        return true;
      }
    } catch (e) {
      console.error('Login failed', e);
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('crm_user');
    router.push('/login');
  };

  // Leads
  const addLead = async (leadData: any) => {
    try {
      const res = await api.post('/leads', leadData);
      if (res.data?.success) {
        setLeads(prev => [...prev, res.data.data]);
      }
    } catch (e) { console.error(e); }
  };
  const updateLead = async (id: string, updates: Partial<Lead>) => {
    try {
      const res = await api.patch(`/leads/${id}`, updates);
      if (res.data?.success) {
        setLeads(prev => prev.map(l => l.id === id ? res.data.data : l));
      }
    } catch (e) { console.error(e); }
  };
  const deleteLead = async (id: string) => {
    try {
      await api.delete(`/leads/${id}`);
      setLeads(prev => prev.filter(l => l.id !== id));
    } catch (e) { console.error(e); }
  };

  // Tasks
  const addTask = async (taskData: any) => {
    try {
      const res = await api.post('/tasks', taskData);
      if (res.data?.success) {
        setTasks(prev => [...prev, res.data.data]);
      }
    } catch (e) { console.error(e); }
  };
  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      const res = await api.patch(`/tasks/${id}`, updates);
      if (res.data?.success) {
        setTasks(prev => prev.map(t => t.id === id ? res.data.data : t));
      }
    } catch (e) { console.error(e); }
  };
  const updateTaskStep = async (taskId: string, stepId: string, isCompleted: boolean) => {
    try {
      const res = await api.patch(`/tasks/${taskId}/sop/${stepId}`, { isCompleted });
      if (res.data?.success) {
        refreshTasks(); // Easiest way to sync SOP step changes
      }
    } catch (e) { console.error(e); }
  };
  const deleteTask = async (id: string) => {
    try {
      await api.delete(`/tasks/${id}`);
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (e) { console.error(e); }
  };

  if (!mounted) return null;
  if (!currentUser && pathname !== '/login') return null;

  return (
    <AppContext.Provider value={{
      currentUser, login, logout,
      departments, taskTypes, sources,
      users,
      leads, addLead, updateLead, deleteLead,
      tasks, addTask, updateTask, updateTaskStep, deleteTask, refreshTasks
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
