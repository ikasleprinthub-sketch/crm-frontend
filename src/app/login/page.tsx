'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import styles from './page.module.css';

export default function LoginPage() {
  const router = useRouter();
  const { login, currentUser } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      router.push('/');
    }
  }, [currentUser, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const success = await login(email, password);
    if (!success) {
      setError('Invalid email or password');
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logoRow}>
          <div className={styles.logoDot}>
            <div className={styles.dotInner}></div>
          </div>
          <span className={styles.logo}>BARBARA <span className={styles.thin}>CRM</span></span>
        </div>
        <h1 className={styles.title}>Welcome Back</h1>
        <p className={styles.subtitle}>Enter your credentials to access your account.</p>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label>Email Address</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="admin@barbara.com" 
              required 
            />
          </div>
          <div className={styles.field}>
            <label>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="••••••••" 
              required 
            />
          </div>
          <button type="submit" disabled={loading} className={styles.submitBtn}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
