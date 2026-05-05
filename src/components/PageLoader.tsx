'use client';
import { useApp } from '@/context/AppContext';
import styles from './PageLoader.module.css';

export default function PageLoader() {
  const { isPageLoading } = useApp();

  if (!isPageLoading) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.loaderContainer}>
        <div className={styles.spinner}>
          <div className={styles.innerSpinner}></div>
        </div>
        <div className={styles.text}>Preparing Workspace...</div>
        <div className={styles.progressLine}>
          <div className={styles.progressFill}></div>
        </div>
      </div>
    </div>
  );
}
