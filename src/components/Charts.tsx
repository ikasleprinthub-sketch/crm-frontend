'use client';

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

interface ChartProps {
  leads: any[];
  tasks: any[];
}

export default function Charts({ leads, tasks }: ChartProps) {
  const completedTasks = tasks.filter((t: any) => t.status === 'COMPLETED').length;
  const pendingTasks = tasks.filter((t: any) => t.status !== 'COMPLETED').length;
  const newLeads = leads.filter((l: any) => l.status === 'NEW').length;
  const convertedLeads = leads.filter((l: any) => l.status === 'CONVERTED').length;

  const data = [
    { name: 'New Leads', value: newLeads },
    { name: 'Converted', value: convertedLeads },
    { name: 'Pending Tasks', value: pendingTasks },
    { name: 'Completed Tasks', value: completedTasks },
  ];

  const colors = ['#7551FF', '#00C896', '#FFB547', '#3965FF'];

  return (
    <section className="glass-card" style={{ marginBottom: '1.5rem', width: '100%' }}>
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Analytics Overview</h2>
      </div>
      <div style={{ padding: '1.5rem', height: 320, minWidth: 300 }}>
        <ResponsiveContainer width="100%" height="100%" minHeight={300}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
            <Tooltip 
              cursor={{ fill: 'var(--surface-hover)' }}
              contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={60}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
