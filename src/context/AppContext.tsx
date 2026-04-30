'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';
import { Bell, X } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

// ─── ENUMS / TYPES ────────────────────────────────────────────────────────────

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
export type UserStatus = 'ACTIVE' | 'PENDING' | 'REJECTED';
export type LeadStatus = 'NEW' | 'CONVERTED' | 'HOLD_BY_LEAD' | 'NOT_RESPONDED' | 'DROPPED' | 'AWAITING_CONFIRMATION' | 'MEETING_SCHEDULED';
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
  status: UserStatus;
  managerId?: string;
  requestedBy?: { id: string; name: string };
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
  assignedTo?: User;
  lead?: Lead;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  type?: string;
  link?: string;
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

  // Sidebar
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;

  // Master Data
  departments: Department[];
  addDepartment: (name: string) => Promise<void>;
  updateDepartment: (id: string, name: string) => Promise<void>;
  deleteDepartment: (id: string) => Promise<void>;

  taskTypes: TaskType[];
  addTaskType: (data: { name: string; departmentId: string }) => Promise<void>;
  updateTaskType: (id: string, name: string) => Promise<void>;
  deleteTaskType: (id: string) => Promise<void>;

  sources: SourceOfLead[];
  addSource: (name: string) => Promise<void>;
  updateSource: (id: string, name: string) => Promise<void>;
  deleteSource: (id: string) => Promise<void>;

  // Users
  users: User[];
  addUser: (userData: any) => Promise<void>;
  updateUser: (id: string, updates: any) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  approveUser: (id: string) => Promise<void>;
  rejectUser: (id: string) => Promise<void>;

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
  // Notifications
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  
  // Activity Logs
  activities: any[];
  
  // Notes
  notes: any[];
  addNote: (data: any) => Promise<void>;
  updateNote: (id: string, data: any) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;

  refreshTasks: () => Promise<void>;
  fetchInitialData: () => Promise<void>;
}


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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toast, setToast] = useState<{ message: string; title: string } | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const toggleSidebar = () => setSidebarOpen(prev => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  // After mount, set sidebar default based on screen width
  useEffect(() => {
    setSidebarOpen(window.innerWidth > 768);
  }, []);

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

  // ─── Notification Polling ──────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;

    const fetchNotifs = async () => {
      try {
        const [notifRes, unreadRes, actRes, notesRes] = await Promise.all([
          api.get('/notifications'),
          api.get('/notifications/unread-count'),
          api.get('/activity/my'),
          api.get('/notes')
        ]);
        
        if (notifRes.data?.success) {
          const arr = Array.isArray(notifRes.data.data) ? notifRes.data.data : notifRes.data.data.notifications || [];
          
          // Check for new unread notifications to show toast
          if (arr.length > 0) {
            const latest = arr[0];
            if (!latest.isRead) {
              const alreadyNotified = notifications.some(n => n.id === latest.id);
              if (!alreadyNotified) {
                setToast({ title: latest.title || 'New Alert', message: latest.message });
                setTimeout(() => setToast(null), 5000);
              }
            }
          }
          setNotifications(arr);
        }
        
        if (unreadRes.data?.success) {
          setUnreadCount(unreadRes.data.data.count);
        }
        
        if (actRes.data?.success) {
          setActivities(actRes.data.data);
        }

        if (notesRes.data?.success) {
          setNotes(notesRes.data.data);
        }
      } catch (e) {
        console.error('Polling failed', e);
      }
    };

    const interval = setInterval(fetchNotifs, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [currentUser]);

  const fetchInitialData = async () => {
    try {
      const isManagerOrAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';

      const [depsRes, typesRes, usersRes, leadsRes, tasksRes, sourcesRes, notificationsRes, unreadRes] = await Promise.all([
        api.get('/departments'),
        api.get('/task-types'),
        api.get('/users'),
        isManagerOrAdmin ? api.get('/leads') : Promise.resolve({ data: { success: true, data: [] } }),
        api.get('/tasks'),
        api.get('/sources'),
        api.get('/notifications'),
        api.get('/notifications/unread-count')
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
      
      if (notificationsRes.data?.success) setNotifications(getArr(notificationsRes.data.data, 'notifications'));
      if (unreadRes.data?.success) setUnreadCount(unreadRes.data.data.count);
    } catch (error) {
      console.error('Failed to fetch initial data', error);
    }
  };

  // Master Data CRUD
  const addDepartment = async (name: string) => {
    try {
      const res = await api.post('/departments', { name });
      if (res.data?.success) setDepartments(prev => [...prev, res.data.data]);
    } catch (e) { console.error(e); }
  };
  const updateDepartment = async (id: string, name: string) => {
    try {
      const res = await api.put(`/departments/${id}`, { name });
      if (res.data?.success) setDepartments(prev => prev.map(d => d.id === id ? res.data.data : d));
    } catch (e) { console.error(e); }
  };
  const deleteDepartment = async (id: string) => {
    try {
      await api.delete(`/departments/${id}`);
      setDepartments(prev => prev.filter(d => d.id !== id));
    } catch (e) { console.error(e); }
  };

  const addTaskType = async (data: { name: string; departmentId: string }) => {
    try {
      const res = await api.post('/task-types', data);
      if (res.data?.success) setTaskTypes(prev => [...prev, res.data.data]);
    } catch (e) { console.error(e); }
  };
  const updateTaskType = async (id: string, name: string) => {
    try {
      const res = await api.put(`/task-types/${id}`, { name });
      if (res.data?.success) setTaskTypes(prev => prev.map(t => t.id === id ? res.data.data : t));
    } catch (e) { console.error(e); }
  };
  const deleteTaskType = async (id: string) => {
    try {
      await api.delete(`/task-types/${id}`);
      setTaskTypes(prev => prev.filter(t => t.id !== id));
    } catch (e) { console.error(e); }
  };

  const addSource = async (name: string) => {
    try {
      const res = await api.post('/sources', { name });
      if (res.data?.success) setSources(prev => [...prev, res.data.data]);
    } catch (e) { console.error(e); }
  };
  const updateSource = async (id: string, name: string) => {
    try {
      const res = await api.put(`/sources/${id}`, { name });
      if (res.data?.success) setSources(prev => prev.map(s => s.id === id ? res.data.data : s));
    } catch (e) { console.error(e); }
  };
  const deleteSource = async (id: string) => {
    try {
      await api.delete(`/sources/${id}`);
      setSources(prev => prev.filter(s => s.id !== id));
    } catch (e) { console.error(e); }
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

  // Users
  const addUser = async (userData: any) => {
    try {
      const res = await api.post('/auth/register', userData);
      if (res.data?.success) {
        // We fetch instead of just adding to state to get the full relations and status
        await fetchInitialData(); 
      }
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Failed to create user';
      console.error('❌ [Register Error]', e.response?.data || e.message);
      throw new Error(msg);
    }
  };

  const updateUser = async (id: string, updates: any) => {
    try {
      const res = await api.put(`/users/${id}`, updates);
      if (res.data?.success) {
        setUsers(prev => prev.map(u => u.id === id ? { ...u, ...res.data.data } : u));
      }
    } catch (e: any) {
      console.error('❌ [Update User Error]', e.response?.data || e.message);
    }
  };

  const deleteUser = async (id: string) => {
    try {
      await api.delete(`/users/${id}`);
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Failed to delete user';
      console.error('❌ [Delete User Error]', e.response?.data || e.message);
      throw new Error(msg);
    }
  };

  const approveUser = async (id: string) => {
    try {
      const res = await api.patch(`/users/${id}/approve`);
      if (res.data?.success) {
        setUsers(prev => prev.map(u => u.id === id ? res.data.data : u));
      }
    } catch (e: any) { 
      console.error('❌ [Approve Error]', e.response?.data || e.message); 
    }
  };

  const rejectUser = async (id: string) => {
    try {
      const res = await api.patch(`/users/${id}/reject`);
      if (res.data?.success) {
        setUsers(prev => prev.map(u => u.id === id ? res.data.data : u));
      }
    } catch (e: any) { 
      console.error('❌ [Reject Error]', e.response?.data || e.message); 
    }
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

  // Notifications
  const markAsRead = async (id: string) => {
    try {
      const res = await api.patch(`/notifications/${id}/read`);
      if (res.data?.success) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (e) { console.error(e); }
  };

  const markAllAsRead = async () => {
    try {
      const res = await api.patch('/notifications/read-all');
      if (res.data?.success) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (e) { console.error(e); }
  };
  const addNote = async (data: any) => {
    try {
      const res = await api.post('/notes', data);
      if (res.data?.success) {
        setNotes(prev => [res.data.data, ...prev]);
      }
    } catch (e) { console.error(e); }
  };
  const updateNote = async (id: string, data: any) => {
    try {
      const res = await api.put(`/notes/${id}`, data);
      if (res.data?.success) {
        setNotes(prev => prev.map(n => n.id === id ? res.data.data : n));
      }
    } catch (e) { console.error(e); }
  };
  const deleteNote = async (id: string) => {
    try {
      await api.delete(`/notes/${id}`);
      setNotes(prev => prev.filter(n => n.id !== id));
    } catch (e) { console.error(e); }
  };

  if (!mounted) return null;
  if (!currentUser && pathname !== '/login') return null;

  return (
    <AppContext.Provider value={{
      currentUser, login, logout,
      sidebarOpen, toggleSidebar, closeSidebar,
      users, addUser, updateUser, deleteUser, approveUser, rejectUser,
      departments, addDepartment, updateDepartment, deleteDepartment,
      taskTypes, addTaskType, updateTaskType, deleteTaskType,
      sources, addSource, updateSource, deleteSource,
      leads, addLead, updateLead, deleteLead,
      tasks, addTask, updateTask, updateTaskStep, deleteTask, refreshTasks,
      notifications, unreadCount, markAsRead, markAllAsRead,
      activities,
      notes, addNote, updateNote, deleteNote,
      fetchInitialData
    }}>
      <>
        {children}
        
        {/* Toast Notification */}
        {toast && (
          <div className="toast-container animate-slide-in" style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem 1.25rem',
            boxShadow: 'var(--shadow)',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'center',
            maxWidth: '320px',
            borderLeft: '4px solid var(--primary)',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Bell size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{toast.title}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{toast.message}</div>
            </div>
            <button 
              onClick={() => setToast(null)}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
            >
              <X size={14} />
            </button>
          </div>
        )}
      </>
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
