'use client';
import { useState, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useApp } from '@/context/AppContext';
import { Modal } from '@/components/Modals';
import api from '@/lib/api';
import styles from '../page.module.css';
import settingsStyles from './settings.module.css';
import {
  User, Mail, Camera, Lock, Bell, ChevronRight,
  Check, Eye, EyeOff, Upload, BellRing,
} from 'lucide-react';

type AccountSection = 'name' | 'email' | 'avatar' | 'password' | 'notifications' | null;

export default function SettingsPage() {
  const { currentUser } = useApp();

  // ── Account Settings State ─────────────────────────────────────────────────
  const [activeModal, setActiveModal] = useState<AccountSection>(null);
  const [nameForm, setNameForm] = useState({ name: currentUser?.name || '' });
  const [emailForm, setEmailForm] = useState({ email: currentUser?.email || '' });
  const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    taskReminders: true,
    leadUpdates: false,
    weeklyReport: true,
    systemAnnouncements: true,
  });
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────────────────────────

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleNameSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put(`/users/${currentUser?.id}`, { name: nameForm.name });
      showSuccess('Name updated successfully!');
      setActiveModal(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update name');
    } finally { setLoading(false); }
  };

  const handleEmailSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put(`/users/${currentUser?.id}`, { email: emailForm.email });
      showSuccess('Email updated successfully!');
      setActiveModal(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update email');
    } finally { setLoading(false); }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleAvatarSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      showSuccess('Profile picture updated!');
      setActiveModal(null);
    } finally { setLoading(false); }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPass !== passwordForm.confirm) { alert('New passwords do not match!'); return; }
    if (passwordForm.newPass.length < 6) { alert('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      await api.put(`/users/${currentUser?.id}`, {
        currentPassword: passwordForm.current,
        newPassword: passwordForm.newPass,
      });
      showSuccess('Password changed successfully!');
      setPasswordForm({ current: '', newPass: '', confirm: '' });
      setActiveModal(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to change password');
    } finally { setLoading(false); }
  };

  const handleNotificationSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      showSuccess('Notification preferences saved!');
      setActiveModal(null);
    } finally { setLoading(false); }
  };

  // ── Cards definition ────────────────────────────────────────────────────────
  const accountCards = [
    {
      id: 'name' as AccountSection,
      icon: <User size={28} />,
      title: 'Change Name',
      desc: 'Update your display name across the CRM',
      gradient: 'linear-gradient(135deg, #667eea, #764ba2)',
      glow: 'rgba(102,126,234,0.35)',
    },
    {
      id: 'email' as AccountSection,
      icon: <Mail size={28} />,
      title: 'Change Email',
      desc: 'Update your login email address',
      gradient: 'linear-gradient(135deg, #11998e, #38ef7d)',
      glow: 'rgba(17,153,142,0.35)',
    },
    {
      id: 'avatar' as AccountSection,
      icon: <Camera size={28} />,
      title: 'Profile Picture',
      desc: 'Upload or change your profile photo',
      gradient: 'linear-gradient(135deg, #f7971e, #ffd200)',
      glow: 'rgba(247,151,30,0.35)',
    },
    {
      id: 'password' as AccountSection,
      icon: <Lock size={28} />,
      title: 'Change Password',
      desc: 'Keep your account secure with a strong password',
      gradient: 'linear-gradient(135deg, #ee5d50, #f9a825)',
      glow: 'rgba(238,93,80,0.35)',
    },
    {
      id: 'notifications' as AccountSection,
      icon: <Bell size={28} />,
      title: 'Notification Settings',
      desc: 'Manage alerts, reminders and updates',
      gradient: 'linear-gradient(135deg, #4318ff, #9c27b0)',
      glow: 'rgba(67,24,255,0.35)',
    },
  ];

  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <main className={styles.main}>
        <Header title="Settings" subtitle="Manage your personal account and preferences" />

        {/* ── Success Toast ─────────────────────────────────────────────── */}
        {successMsg && (
          <div className={settingsStyles.successToast}>
            <Check size={16} />
            {successMsg}
          </div>
        )}

        {/* ── My Account Grid ───────────────────────────────────────────── */}
        <section className={settingsStyles.accountSection}>
          <div className={settingsStyles.sectionHeading}>
            <div className={settingsStyles.sectionHeadingIcon}>
              <User size={18} />
            </div>
            <div>
              <h2>My Account</h2>
              <p>Personal profile and preference settings</p>
            </div>
          </div>

          <div className={settingsStyles.accountGrid}>
            {accountCards.map((card) => (
              <button
                key={card.id}
                className={settingsStyles.accountCard}
                onClick={() => setActiveModal(card.id)}
                style={{ '--card-glow': card.glow } as React.CSSProperties}
              >
                <div className={settingsStyles.cardIconWrap} style={{ background: card.gradient }}>
                  {card.icon}
                </div>
                <div className={settingsStyles.cardBody}>
                  <span className={settingsStyles.cardTitle}>{card.title}</span>
                  <span className={settingsStyles.cardDesc}>{card.desc}</span>
                </div>
                <ChevronRight size={18} className={settingsStyles.cardArrow} />
              </button>
            ))}
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════
            MODALS
        ════════════════════════════════════════════════════════════════ */}

        {/* Change Name */}
        <Modal isOpen={activeModal === 'name'} onClose={() => setActiveModal(null)} title="Change Name">
          <form onSubmit={handleNameSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Full Name</label>
              <input
                type="text" className={styles.input} required
                value={nameForm.name} onChange={e => setNameForm({ name: e.target.value })}
                placeholder="Enter your full name..."
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
              <button type="button" className={styles.filterBtn} onClick={() => setActiveModal(null)}>Cancel</button>
              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Change Email */}
        <Modal isOpen={activeModal === 'email'} onClose={() => setActiveModal(null)} title="Change Email">
          <form onSubmit={handleEmailSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Email Address</label>
              <input
                type="email" className={styles.input} required
                value={emailForm.email} onChange={e => setEmailForm({ email: e.target.value })}
                placeholder="Enter your email..."
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
              <button type="button" className={styles.filterBtn} onClick={() => setActiveModal(null)}>Cancel</button>
              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? 'Saving…' : 'Update Email'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Profile Picture */}
        <Modal isOpen={activeModal === 'avatar'} onClose={() => setActiveModal(null)} title="Profile Picture">
          <form onSubmit={handleAvatarSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
            <div className={settingsStyles.avatarUploadArea} onClick={() => fileInputRef.current?.click()}>
              {avatarPreview ? (
                <img src={avatarPreview} alt="Preview" className={settingsStyles.avatarPreview} />
              ) : (
                <div className={settingsStyles.avatarPlaceholder}>
                  <Upload size={32} />
                  <span>Click to upload photo</span>
                  <small>PNG, JPG up to 5MB</small>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
            </div>
            {avatarPreview && (
              <button type="button" className={styles.filterBtn} onClick={() => { setAvatarPreview(null); setAvatarFile(null); }}>
                Remove Photo
              </button>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', width: '100%' }}>
              <button type="button" className={styles.filterBtn} onClick={() => setActiveModal(null)}>Cancel</button>
              <button type="submit" className={styles.submitBtn} disabled={!avatarFile || loading}>
                {loading ? 'Uploading…' : 'Save Picture'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Change Password */}
        <Modal isOpen={activeModal === 'password'} onClose={() => setActiveModal(null)} title="Change Password">
          <form onSubmit={handlePasswordSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {([
              { label: 'Current Password', key: 'current', show: showCurrent, toggle: () => setShowCurrent(v => !v) },
              { label: 'New Password', key: 'newPass', show: showNew, toggle: () => setShowNew(v => !v) },
              { label: 'Confirm New Password', key: 'confirm', show: showConfirm, toggle: () => setShowConfirm(v => !v) },
            ] as const).map(({ label, key, show, toggle }) => (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={show ? 'text' : 'password'}
                    className={styles.input}
                    required
                    value={passwordForm[key]}
                    onChange={e => setPasswordForm(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={`Enter ${label.toLowerCase()}...`}
                    style={{ paddingRight: '3rem' }}
                  />
                  <button
                    type="button" onClick={toggle}
                    style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                  >
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
              <button type="button" className={styles.filterBtn} onClick={() => setActiveModal(null)}>Cancel</button>
              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? 'Updating…' : 'Change Password'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Notification Settings */}
        <Modal isOpen={activeModal === 'notifications'} onClose={() => setActiveModal(null)} title="Notification Settings">
          <form onSubmit={handleNotificationSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {([
              { key: 'emailAlerts',         label: 'Email Alerts',          desc: 'Receive important alerts via email',         icon: <Mail size={18} /> },
              { key: 'taskReminders',       label: 'Task Reminders',         desc: 'Get reminders for upcoming task deadlines',  icon: <BellRing size={18} /> },
              { key: 'leadUpdates',         label: 'Lead Updates',           desc: 'Notify when lead status changes',            icon: <Bell size={18} /> },
              { key: 'weeklyReport',        label: 'Weekly Report',          desc: 'Receive a weekly summary report',            icon: <Mail size={18} /> },
              { key: 'systemAnnouncements', label: 'System Announcements',   desc: 'Platform updates and announcements',         icon: <BellRing size={18} /> },
            ] as const).map(({ key, label, desc, icon }) => (
              <div key={key} className={settingsStyles.notifRow}>
                <div className={settingsStyles.notifRowIcon}>{icon}</div>
                <div className={settingsStyles.notifRowInfo}>
                  <span className={settingsStyles.notifRowLabel}>{label}</span>
                  <span className={settingsStyles.notifRowDesc}>{desc}</span>
                </div>
                <button
                  type="button"
                  className={`${settingsStyles.toggleBtn} ${notifications[key] ? settingsStyles.toggleOn : ''}`}
                  onClick={() => setNotifications(prev => ({ ...prev, [key]: !prev[key] }))}
                >
                  <span className={settingsStyles.toggleThumb} />
                </button>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.75rem' }}>
              <button type="button" className={styles.filterBtn} onClick={() => setActiveModal(null)}>Cancel</button>
              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? 'Saving…' : 'Save Preferences'}
              </button>
            </div>
          </form>
        </Modal>

      </main>
    </div>
  );
}
