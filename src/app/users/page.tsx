'use client';
import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useApp, User } from '@/context/AppContext';
import { Modal, AddUserForm, EditUserForm } from '@/components/Modals';
import styles from '../page.module.css';
import { UserPlus, Edit2, Trash2 } from 'lucide-react';

export default function UsersPage() {
  const { currentUser, users, tasks, fetchInitialData, addUser, approveUser, rejectUser, deleteUser, updateUser, showToast } = useApp();
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const filters = ['All', 'ADMIN', 'TEAM_LEADER', 'EMPLOYEE'];
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'PENDING'>('ACTIVE');

  const filtered = users.filter(u => {
    const roleValue = u.role === 'MANAGER' ? 'TEAM_LEADER' : u.role;
    const matchesRole = roleFilter === 'All' || roleValue === roleFilter;
    const matchesStatus = (activeTab === 'PENDING') ? u.status === 'PENDING' : u.status === 'ACTIVE';
    return matchesRole && matchesStatus;
  });

  const pendingCount = users.filter(u => u.status === 'PENDING').length;
  const activeCount = users.filter(u => u.status === 'ACTIVE').length;

  const handleApprove = (id: string) => {
    showToast(
      'Approve User?',
      'Are you sure you want to approve this user account?',
      'confirm',
      async () => {
        try {
          await approveUser(id);
          showToast('Approved', 'User account has been approved.', 'success');
        } catch (e: any) {
          showToast('Approval Failed', e.response?.data?.message || e.message, 'error');
        }
      }
    );
  };

  const handleReject = (id: string) => {
    showToast(
      'Reject Request?',
      'Are you sure you want to reject and delete this user request?',
      'confirm',
      async () => {
        try {
          await rejectUser(id);
          showToast('Rejected', 'User request has been rejected.', 'success');
        } catch (e: any) {
          showToast('Rejection Failed', e.response?.data?.message || e.message, 'error');
        }
      }
    );
  };

  const handleCreateUser = async (data: any) => {
    try {
      await addUser(data);
      setIsModalOpen(false);
      fetchInitialData();
      showToast('Member Added', 'The new team member has been successfully created.', 'success');
    } catch (e: any) {
      showToast('Action Failed', e.response?.data?.message || e.message || 'Failed to create account. Please check all fields.', 'error');
    }
  };

  const handleUpdateUser = async (data: any) => {
    if (!editingUser) return;
    try {
      await updateUser(editingUser.id, data);
      setEditingUser(null);
      fetchInitialData();
      showToast('User Updated', 'The user account has been successfully updated.', 'success');
    } catch (e: any) {
      showToast('Update Failed', e.response?.data?.message || e.message || 'Failed to update account', 'error');
    }
  };

  const handleDeleteUser = (id: string) => {
    console.log(`[UsersPage] Opening delete confirmation for: ${id}`);
    showToast(
      'Delete Member?',
      'Are you sure you want to permanently remove this team member? This action cannot be undone.',
      'confirm',
      async () => {
        try {
          console.log(`[UsersPage] Confirmation confirmed for: ${id}`);
          await deleteUser(id);
          showToast('User Deleted', 'The user account has been removed.', 'success');
        } catch (e: any) {
          console.error('[UsersPage] Deletion handler error:', e);
          const errorMsg = e.message || 'An unexpected error occurred';
          
          showToast('Action Blocked', errorMsg, 'error');
        }
      }
    );
  };

  const roleBadge = (role: string) => {
    if (role === 'MANAGER') return 'role-team_leader';
    return `role-${role.toLowerCase()}`;
  };

  if (currentUser?.role !== 'SUPER_ADMIN' && currentUser?.role !== 'ADMIN' && currentUser?.role !== 'MANAGER') {
    return (
      <div className={styles.wrapper}>
        <Sidebar />
        <main className={styles.main}>
          <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', marginTop: '2rem' }}>
            <h2 style={{ color: 'var(--accent-red)' }}>Access Denied</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Only administrators and Team Leaders can access Team Configuration.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <main className={styles.main}>
        <Header title="Users" subtitle="Manage your team members and their roles" />

        <div className={styles.pageTitleRow}>
          <div>
            <h2>All Members ({users.length})</h2>
            <p>View and manage administrative and staff personnel</p>
          </div>
          <button className={styles.primaryBtn} onClick={() => setIsModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserPlus size={18} /> Add Member
          </button>
        </div>

        {/* Tabs & Filters */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div className={styles.filterRow} style={{ marginBottom: 0 }}>
            <button 
              className={`${styles.filterBtn} ${activeTab === 'ACTIVE' ? styles.active : ''}`} 
              onClick={() => setActiveTab('ACTIVE')}
            >
              Active Members ({activeCount})
            </button>
            {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN') && (
              <button 
                className={`${styles.filterBtn} ${activeTab === 'PENDING' ? styles.active : ''}`} 
                onClick={() => setActiveTab('PENDING')}
                style={{ position: 'relative' }}
              >
                Approval Requests ({pendingCount})
                {pendingCount > 0 && <span className="pulse-dot" style={{ position: 'absolute', top: -4, right: -4 }}></span>}
              </button>
            )}
          </div>

          <div className={styles.filterRow} style={{ marginBottom: 0 }}>
            {filters.map(f => (
              <button key={f} className={`${styles.filterBtn} ${roleFilter === f ? styles.active : ''}`} onClick={() => setRoleFilter(f)}>
                {f === 'TEAM_LEADER' ? 'Team Leader' : f.charAt(0).toUpperCase() + f.slice(1).toLowerCase().replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Employee Cards - Sophisticated Grid */}
        <div className={styles.grid3Col}>
          {filtered.map(user => {
            const userTasks = tasks.filter(t => t.assignedToId === user.id);
            const completedTasks = userTasks.filter(t => t.status === 'COMPLETED').length;
            const activeTasks = userTasks.filter(t => t.status !== 'COMPLETED').length;

            return (
              <div key={user.id} className="glass-card" style={{ 
                padding: '2rem 1.5rem', 
                position: 'relative', 
                textAlign: 'center',
                overflow: 'hidden'
              }}>
                {/* Decorative background element */}
                <div style={{
                  position: 'absolute',
                  top: '-40px',
                  right: '-40px',
                  width: '120px',
                  height: '120px',
                  background: 'var(--primary-glow)',
                  borderRadius: '50%',
                  filter: 'blur(40px)',
                  opacity: 0.4,
                  zIndex: -1
                }}></div>

                {/* Avatar Section - Premium Focus */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{
                    width: 72, height: 72, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontSize: '1.4rem', fontWeight: 800,
                    boxShadow: '0 10px 20px var(--primary-glow)',
                    margin: '0 auto 1.25rem',
                    border: '4px solid var(--surface)',
                  }}>{user.name.slice(0,2).toUpperCase()}</div>
                  
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>{user.name}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4, fontWeight: 500 }}>{user.email}</p>
                  
                  <div style={{ marginTop: '0.875rem' }}>
                    <span className={`${styles.badge} ${roleBadge(user.role)}`}>
                      {user.role === 'MANAGER' ? 'Team Leader' : user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase().replace('_', ' ')}
                    </span>
                  </div>

                  {/* Actions - Subtle & Clean */}
                  {((currentUser?.role === 'SUPER_ADMIN') || 
                    (currentUser?.role === 'ADMIN' && (user.role === 'MANAGER' || user.role === 'EMPLOYEE'))) && (
                    <div style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', display: 'flex', gap: '0.4rem' }}>
                      <button 
                        className={styles.iconBtn} 
                        onClick={(e) => { e.stopPropagation(); setEditingUser(user); }}
                        style={{ width: 28, height: 28, opacity: 0.6 }}
                      >
                        <Edit2 size={12} />
                      </button>
                      {user.role !== 'SUPER_ADMIN' && (
                        <button 
                          className={styles.iconBtn} 
                          style={{ color: 'var(--accent-red)', width: 28, height: 28, opacity: 0.6 }}
                          onClick={(e) => { e.stopPropagation(); handleDeleteUser(user.id); }}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Statistics Box - Clean Aesthetic */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(3, 1fr)', 
                  gap: '1px', 
                  background: 'var(--border)', 
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  margin: '1.5rem 0'
                }}>
                  <div style={{ padding: '0.875rem 0.5rem', background: 'var(--surface)' }}>
                    <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>{activeTasks}</p>
                    <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active</p>
                  </div>
                  <div style={{ padding: '0.875rem 0.5rem', background: 'var(--surface)' }}>
                    <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-green)' }}>{completedTasks}</p>
                    <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Done</p>
                  </div>
                  <div style={{ padding: '0.875rem 0.5rem', background: 'var(--surface)' }}>
                    <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>{userTasks.length}</p>
                    <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total</p>
                  </div>
                </div>

                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {user.status === 'PENDING' ? 'Requested' : 'Joined'}
                  </span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                    {new Date(user.createdAt).toLocaleDateString('en-GB')}
                  </span>
                </div>

                {user.status === 'PENDING' && (
                  <div style={{ marginTop: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <button 
                      className={styles.primaryBtn} 
                      onClick={() => handleApprove(user.id)}
                      style={{ padding: '0.5rem', fontSize: '0.75rem' }}
                    >
                      Approve
                    </button>
                    <button 
                      className={styles.secondaryBtn} 
                      onClick={() => handleReject(user.id)}
                      style={{ padding: '0.5rem', fontSize: '0.75rem', color: 'var(--accent-red)' }}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="glass-card" style={{ padding: '4rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-secondary)' }}>No {activeTab === 'PENDING' ? 'pending requests' : 'members'} found.</p>
          </div>
        )}
      </main>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Team Member">
        <AddUserForm onSubmit={handleCreateUser} />
      </Modal>

      <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} title="Edit User">
        {editingUser && <EditUserForm user={editingUser} onSubmit={handleUpdateUser} />}
      </Modal>
    </div>
  );
}
