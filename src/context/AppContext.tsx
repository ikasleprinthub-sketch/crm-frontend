'use client';
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api from '@/lib/api';
import { Bell, X, CheckCircle, AlertCircle, Info, HelpCircle } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import PageLoader from '@/components/PageLoader';

// ─── MODULE-LEVEL HELPERS ─────────────────────────────────────────────────────

function getArr(payload: any, key: string): any[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload[key])) return payload[key];
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

const STATIC_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function readStaticCache<T>(key: string): T[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts > STATIC_CACHE_TTL) { sessionStorage.removeItem(key); return null; }
    return parsed.data as T[];
  } catch { return null; }
}

function writeStaticCache(key: string, data: any[]): void {
  if (typeof window === 'undefined') return;
  try { sessionStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })); } catch { }
}

function clearStaticCaches(): void {
  if (typeof window === 'undefined') return;
  ['cache_departments', 'cache_taskTypes', 'cache_sources'].forEach(k => {
    try { sessionStorage.removeItem(k); } catch { }
  });
}

// ─── ENUMS / TYPES ──────────────────────────────────────────────────────────── //hi

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
  assignedRole: Role;
  deadlineHours: number;
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
  departmentId?: string;
  managerId?: string;
  manager?: { id: string; name: string; email: string; role: string };
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
  clientId?: string;
  source?: SourceOfLead;
}

export interface TaskSOPStep {
  id: string;
  taskId: string;
  title: string;
  order: number;
  isCompleted: boolean;
  assignedRole: Role;
  deadlineHours: number;
  dueAt?: string;
  completedAt?: string;
  completedById?: string;
  completedBy?: { id: string; name: string };
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
  isAutomated?: boolean;
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
  departmentId?: string;
  managerId?: string;
  manager?: { id: string; name: string; email: string; role: string };
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
  addLead: (leadData: any) => Promise<any>;
  updateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  convertLeadToTask: (leadId: string, data: any) => Promise<any>;

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
  updateProfile: (data: any) => Promise<void>;

  // Activity Logs
  activities: any[];

  // Notes
  notes: any[];
  addNote: (data: any) => Promise<void>;
  updateNote: (id: string, data: any) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;

  refreshTasks: () => Promise<void>;
  fetchInitialData: () => Promise<void>;
  showToast: (title: string, message: string, type?: 'success' | 'error' | 'info' | 'confirm', onConfirm?: () => void, onCancel?: () => void) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Page Loading (for transitions)
  isPageLoading: boolean;
  setIsPageLoading: (val: boolean) => void;
}


// ─── CONTEXT ──────────────────────────────────────────────────────────────────

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Whenever pathname changes, the navigation is complete
    setIsPageLoading(false);
    if (window.innerWidth <= 768) {
      setSidebarOpen(false); // Also close sidebar on mobile
    }
  }, [pathname]);

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
  const [toast, setToast] = useState<{ 
    message: string; 
    title: string; 
    type: 'success' | 'error' | 'info' | 'confirm'; 
    onConfirm?: () => void;
    onCancel?: () => void;
  } | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
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

  const initialFetchDone = useRef(false);
  const isFetchingRef = useRef(false);

  // Configure axios auth header
  useEffect(() => {
    if (currentUser?.token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${currentUser.token}`;
      
      // Only fetch initial data once per session/login
      if (!initialFetchDone.current) {
        fetchInitialData();
        initialFetchDone.current = true;
      }
    } else {
      delete api.defaults.headers.common['Authorization'];
      initialFetchDone.current = false;
    }
  }, [currentUser?.token]); // Only re-run if token changes

  // ─── WebSocket Real-time Notifications (Disabled for Vercel compatibility) ───
  /*
  useEffect(() => {
    if (!currentUser) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    // Initialize socket connection
    const socketUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
    const newSocket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('🔌 Connected to WebSocket server');
      // Join targeted room
      newSocket.emit('join', currentUser.id);
    });

    newSocket.on('connect_error', (err) => {
      console.error('🔌 WebSocket connection error:', err.message);
    });

    newSocket.on('notification', (notif: Notification) => {
      console.log('🔔 Real-time notification received:', notif);
      
      // Update notifications state
      setNotifications(prev => [notif, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Show toast
      setToast({ title: notif.title || 'New Alert', message: notif.message });
      setTimeout(() => setToast(null), 5000);
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Disconnected from WebSocket server');
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [currentUser]);
  */

  // Fallback polling (less frequent, every 2 mins) just to keep data synced
  useEffect(() => {
    if (!currentUser) return;

    const fetchSync = async () => {
      try {
        const [unreadRes, actRes, notesRes] = await Promise.all([
          api.get('/notifications/unread-count'),
          api.get('/activity/my'),
          api.get('/notes')
        ]);

        if (unreadRes.data?.success) setUnreadCount(unreadRes.data.data.count);
        if (actRes.data?.success) setActivities(actRes.data.data);
        if (notesRes.data?.success) setNotes(notesRes.data.data);
      } catch (e) {
        console.error('Sync failed', e);
      }
    };

    const interval = setInterval(fetchSync, 120000);
    return () => clearInterval(interval);
  }, [currentUser?.id]); // id is stable; avoids interval reset on profile object changes

  const fetchInitialData = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const isManagerOrAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';

      // Read sessionStorage cache for static data (departments, taskTypes, sources)
      const cachedDeps = readStaticCache<Department>('cache_departments');
      const cachedTypes = readStaticCache<TaskType>('cache_taskTypes');
      const cachedSources = readStaticCache<SourceOfLead>('cache_sources');

      const [profileRes, depsRes, typesRes, usersRes, leadsRes, tasksRes, sourcesRes, notificationsRes, unreadRes] = await Promise.all([
        api.get('/auth/me'),
        cachedDeps   ? Promise.resolve(null) : api.get('/departments'),
        cachedTypes  ? Promise.resolve(null) : api.get('/task-types'),
        api.get('/users'),
        isManagerOrAdmin ? api.get('/leads') : Promise.resolve({ data: { success: true, data: [] } }),
        api.get('/tasks'),
        cachedSources ? Promise.resolve(null) : api.get('/sources'),
        api.get('/notifications'),
        api.get('/notifications/unread-count'),
      ]);

      if (profileRes.data?.success) {
        const profile = profileRes.data.data;
        setCurrentUser(prev => {
          if (!prev) return null;
          const updated = { ...prev, ...profile };
          if (JSON.stringify(updated) !== JSON.stringify(prev)) {
            localStorage.setItem('crm_user', JSON.stringify(updated));
            return updated;
          }
          return prev;
        });
      }

      // Departments
      if (cachedDeps) {
        setDepartments(cachedDeps);
      } else if (depsRes?.data?.success) {
        const deps = getArr(depsRes.data.data, 'departments');
        setDepartments(deps);
        writeStaticCache('cache_departments', deps);
      }

      // Task types
      if (cachedTypes) {
        setTaskTypes(cachedTypes);
      } else if (typesRes?.data?.success) {
        const types = getArr(typesRes.data.data, 'taskTypes');
        setTaskTypes(types);
        writeStaticCache('cache_taskTypes', types);
      }

      // Sources
      if (cachedSources) {
        setSources(cachedSources);
      } else if (sourcesRes?.data?.success) {
        const srcs = getArr(sourcesRes.data.data, 'sources');
        setSources(srcs);
        writeStaticCache('cache_sources', srcs);
      }

      if (usersRes.data?.success) setUsers(getArr(usersRes.data.data, 'users'));
      if (leadsRes.data?.success) setLeads(getArr(leadsRes.data.data, 'leads'));
      if (tasksRes.data?.success) setTasks(getArr(tasksRes.data.data, 'tasks'));
      if (notificationsRes.data?.success) setNotifications(getArr(notificationsRes.data.data, 'notifications'));
      if (unreadRes.data?.success) setUnreadCount(unreadRes.data.data.count);
    } catch (error) {
      console.error('Failed to fetch initial data', error);
    } finally {
      isFetchingRef.current = false;
    }
  }, [currentUser?.role]);

  // Master Data CRUD
  const addDepartment = async (name: string) => {
    try {
      const res = await api.post('/departments', { name });
      if (res.data?.success) {
        setDepartments(prev => { const next = [res.data.data, ...prev]; writeStaticCache('cache_departments', next); return next; });
      } else {
        throw new Error(res.data?.message || 'Failed to add department');
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  };
  const updateDepartment = async (id: string, name: string) => {
    try {
      const res = await api.put(`/departments/${id}`, { name });
      if (res.data?.success) setDepartments(prev => { const next = prev.map(d => d.id === id ? res.data.data : d); writeStaticCache('cache_departments', next); return next; });
    } catch (e) { console.error(e); }
  };
  const deleteDepartment = async (id: string) => {
    try {
      await api.delete(`/departments/${id}`);
      setDepartments(prev => { const next = prev.filter(d => d.id !== id); writeStaticCache('cache_departments', next); return next; });
    } catch (e) { console.error(e); }
  };

  const addTaskType = async (data: { name: string; departmentId: string }) => {
    try {
      const res = await api.post('/task-types', data);
      if (res.data?.success) {
        setTaskTypes(prev => { const next = [res.data.data, ...prev]; writeStaticCache('cache_taskTypes', next); return next; });
      } else {
        throw new Error(res.data?.message || 'Failed to add task type');
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  };
  const updateTaskType = async (id: string, name: string) => {
    try {
      const res = await api.put(`/task-types/${id}`, { name });
      if (res.data?.success) setTaskTypes(prev => { const next = prev.map(t => t.id === id ? res.data.data : t); writeStaticCache('cache_taskTypes', next); return next; });
    } catch (e) { console.error(e); }
  };
  const deleteTaskType = async (id: string) => {
    try {
      await api.delete(`/task-types/${id}`);
      setTaskTypes(prev => { const next = prev.filter(t => t.id !== id); writeStaticCache('cache_taskTypes', next); return next; });
    } catch (e) { console.error(e); }
  };

  const addSource = async (name: string) => {
    try {
      const res = await api.post('/sources', { name });
      if (res.data?.success) {
        setSources(prev => { const next = [res.data.data, ...prev]; writeStaticCache('cache_sources', next); return next; });
      } else {
        throw new Error(res.data?.message || 'Failed to add source');
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  };
  const updateSource = async (id: string, name: string) => {
    try {
      const res = await api.put(`/sources/${id}`, { name });
      if (res.data?.success) setSources(prev => { const next = prev.map(s => s.id === id ? res.data.data : s); writeStaticCache('cache_sources', next); return next; });
    } catch (e) { console.error(e); }
  };
  const deleteSource = async (id: string) => {
    try {
      await api.delete(`/sources/${id}`);
      setSources(prev => { const next = prev.filter(s => s.id !== id); writeStaticCache('cache_sources', next); return next; });
    } catch (e) { console.error(e); }
  };

  const refreshTasks = useCallback(async () => {
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
  }, []);

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
    clearStaticCaches();
    router.push('/login');
  };

  const updateProfile = async (data: any) => {
    if (!currentUser) return;
    try {
      const res = await api.put(`/users/${currentUser.id}`, data);
      if (res.data?.success) {
        const updatedUser = { ...currentUser, ...res.data.data };
        setCurrentUser(updatedUser);
        localStorage.setItem('crm_user', JSON.stringify(updatedUser));
      }
    } catch (e) {
      throw e;
    }
  };

  // Users
  const addUser = async (userData: any) => {
    try {
      const res = await api.post('/auth/register', userData);
      if (res.data?.success) {
        // Only re-fetch users (not all 9 endpoints) to get full relations and status
        const usersRes = await api.get('/users');
        if (usersRes.data?.success) setUsers(getArr(usersRes.data.data, 'users'));
      }
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Failed to create user';
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
      const msg = e.response?.data?.message || 'Failed to update user';
      throw new Error(msg);
    }
  };

  const deleteUser = async (id: string) => {
    console.log(`🗑️ [AppContext] Deleting user: ${id}`);
    try {
      const res = await api.delete(`/users/${id}`);
      console.log('✅ [AppContext] User deleted successfully:', res.data);
      setUsers(prev => prev.filter(u => u.id !== id));
      return res.data;
    } catch (e: any) {
      console.error('❌ [AppContext] Delete user failed:', e);
      const msg = e.response?.data?.message || e.message || 'Failed to delete user';
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
      const msg = e.response?.data?.message || 'Failed to approve user';
      throw new Error(msg);
    }
  };

  const rejectUser = async (id: string) => {
    try {
      const res = await api.patch(`/users/${id}/reject`);
      if (res.data?.success) {
        setUsers(prev => prev.map(u => u.id === id ? res.data.data : u));
      }
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Failed to reject user';
      throw new Error(msg);
    }
  };

  // Leads
  const addLead = async (leadData: any) => {
    try {
      const res = await api.post('/leads', leadData);
      if (res.data?.success) {
        setLeads(prev => [res.data.data, ...prev]);
        return res.data.data;
      } else {
        throw new Error(res.data?.message || 'Failed to add lead');
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  };
  const updateLead = async (id: string, updates: Partial<Lead>) => {
    try {
      const res = await api.patch(`/leads/${id}`, updates);
      if (res.data?.success) {
        setLeads(prev => prev.map(l => l.id === id ? res.data.data : l));
      } else {
        throw new Error(res.data?.message || 'Failed to update lead');
      }
    } catch (e: any) {
      console.error('Update lead failed:', e);
      const msg = e.response?.data?.message || e.message || 'Failed to update lead';
      throw new Error(msg);
    }
  };

  const deleteLead = async (id: string) => {
    try {
      const res = await api.delete(`/leads/${id}`);
      if (res.data?.success) {
        setLeads(prev => prev.filter(l => l.id !== id));
      } else {
        throw new Error(res.data?.message || 'Failed to delete lead');
      }
    } catch (e: any) {
      console.error('Delete lead failed:', e);
      const msg = e.response?.data?.message || e.message || 'Failed to delete lead';
      // Use the actual error message as the Title for maximum visibility
      showToast(msg, 'This action is restricted to Admins and Super Admins.', 'error');
      throw new Error(msg); 
    }
  };

  const convertLeadToTask = async (id: string, data: any) => {
    try {
      const res = await api.post(`/leads/${id}/convert`, data);
      if (res.data?.success) {
        const [leadsRes, tasksRes] = await Promise.all([
          api.get('/leads'),
          api.get('/tasks')
        ]);
        if (leadsRes.data?.success) setLeads(getArr(leadsRes.data.data, 'leads'));
        if (tasksRes.data?.success) setTasks(getArr(tasksRes.data.data, 'tasks'));
        return res.data.data;
      } else {
        throw new Error(res.data?.message || 'Failed to convert lead');
      }
    } catch (e: any) {
      console.error('Convert lead failed:', e);
      const msg = e.response?.data?.message || e.message || 'Failed to convert lead';
      throw new Error(msg);
    }
  };



  // Tasks
  const addTask = async (taskData: any) => {
    try {
      const res = await api.post('/tasks', taskData);
      if (res.data?.success) {
        setTasks(prev => [res.data.data, ...prev]);
      } else {
        throw new Error(res.data?.message || 'Failed to create task');
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
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
      const res = await api.delete(`/tasks/${id}`);
      if (res.data?.success) {
        setTasks(prev => prev.filter(t => t.id !== id));
      } else {
        throw new Error(res.data?.message || 'Failed to delete task');
      }
    } catch (e: any) {
      console.error('Delete task failed:', e);
      const msg = e.response?.data?.message || e.message || 'Failed to delete task';
      // Use the actual error message as the Title for maximum visibility
      showToast(msg, 'This action is restricted to Admins and Super Admins.', 'error');
      throw new Error(msg);
    }
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

  const showToast = React.useCallback((
    title: string,
    message: string,
    type: 'success' | 'error' | 'info' | 'confirm' = 'info',
    onConfirm?: () => void,
    onCancel?: () => void
  ) => {
    setToast({ title, message, type, onConfirm, onCancel });
    if (type !== 'confirm') {
      setTimeout(() => {
        setToast(curr => {
          if (curr?.message === message) {
            return null;
          }
          return curr;
        });
      }, 5000);
    }
  }, []);

  // Show a toast when the API returns 429 (rate limited)
  useEffect(() => {
    const handler = () => showToast('Too many requests', 'Please wait a moment and try again.', 'error');
    window.addEventListener('api:rate-limited', handler);
    return () => window.removeEventListener('api:rate-limited', handler);
  }, [showToast]);

  if (!mounted) return null;
  if (!currentUser && pathname !== '/login') return null;

  return (
    <AppContext.Provider value={{
      currentUser, login, logout, updateProfile,
      sidebarOpen, toggleSidebar, closeSidebar,
      users, addUser, updateUser, deleteUser, approveUser, rejectUser,
      departments, addDepartment, updateDepartment, deleteDepartment,
      taskTypes, addTaskType, updateTaskType, deleteTaskType,
      sources, addSource, updateSource, deleteSource,
      leads, addLead, updateLead, deleteLead, convertLeadToTask,
      tasks, addTask, updateTask, updateTaskStep, deleteTask, refreshTasks,
      notifications, unreadCount, markAsRead, markAllAsRead,
      activities,
      notes, addNote, updateNote, deleteNote,
      fetchInitialData,
      showToast,
      searchQuery,
      setSearchQuery,
      isPageLoading, setIsPageLoading
    }}>
      <>
        {isPageLoading && <PageLoader />}
        {children}

        {/* Toast Notification */}
        {toast && (
          <div className="toast-container animate-slide-in" style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 9999,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            boxShadow: 'var(--shadow)',
            display: 'flex',
            gap: '1rem',
            alignItems: 'flex-start',
            maxWidth: '380px',
            minWidth: '300px',
            borderLeft: `4px solid ${toast.type === 'success' ? 'var(--accent-green)' :
              toast.type === 'error' ? 'var(--accent-red)' :
                'var(--primary)'
              }`,
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}>
            <div style={{
              background: toast.type === 'success' ? 'rgba(16, 185, 129, 0.1)' :
                toast.type === 'error' ? 'rgba(239, 68, 68, 0.1)' :
                  'var(--primary-light)',
              color: toast.type === 'success' ? 'var(--accent-green)' :
                toast.type === 'error' ? 'var(--accent-red)' :
                  'var(--primary)',
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {toast.type === 'success' && <CheckCircle size={22} />}
              {toast.type === 'error' && <AlertCircle size={22} />}
              {toast.type === 'info' && <Bell size={22} />}
              {toast.type === 'confirm' && <HelpCircle size={22} />}
            </div>
            <div style={{ flex: 1, paddingTop: '2px' }}>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>{toast.title}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.4', fontWeight: 500 }}>{toast.message}</div>
              
              {toast.type === 'confirm' && (
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                  <button 
                    onClick={async () => { 
                      console.log('🔘 [Toast] Continue clicked');
                      const action = toast.onConfirm;
                      setToast(null); // Clear the confirmation toast first
                      if (action) {
                        try {
                          await action(); 
                        } catch (err) {
                          console.error('❌ [Toast Action Error]:', err);
                        }
                      }
                    }}
                    style={{
                      padding: '0.5rem 1rem',
                      background: 'var(--primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(67, 24, 255, 0.2)'
                    }}
                  >
                    Continue
                  </button>
                  <button 
                    onClick={() => { toast.onCancel?.(); setToast(null); }}
                    style={{
                      padding: '0.5rem 1rem',
                      background: 'rgba(0,0,0,0.05)',
                      color: 'var(--text-secondary)',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={() => { toast.onCancel?.(); setToast(null); }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '4px',
                marginTop: '-4px',
                marginRight: '-4px',
                opacity: 0.6,
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
            >
              <X size={18} />
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
