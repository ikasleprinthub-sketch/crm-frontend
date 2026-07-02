'use client';
import React from 'react';
import styles from './StatCard.module.css';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  change?: string;
  changeType?: 'up' | 'down';
  color?: string;
  isMain?: boolean;
}

export default function StatCard({ label, value, icon, change, changeType = 'up', color, isMain }: StatCardProps) {
  return (
    <div className={`${styles.card} ${isMain ? styles.main : ''}`} style={color ? { '--card-accent': color } as React.CSSProperties : undefined}>
      <div className={styles.row}>
        <div>
          <p className={styles.label}>{label}</p>
          <p className={styles.value}>{value}</p>
        </div>
        <div className={`${styles.iconBox} ${isMain ? styles.iconMain : ''}`}>
          {icon}
        </div>
      </div>

    </div>
  );
}
