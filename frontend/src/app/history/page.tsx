'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import '../globals.css';

export default function HistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    fetch('http://localhost:5000/api/history')
      .then(res => res.json())
      .then(data => {
        setHistory(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ padding: '48px', color: 'white' }}>Loading History...</div>;

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const monthName = currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  
  const todayDate = new Date();
  const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;

  const btnStyle = { padding: '8px 16px', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', transition: 'background 0.2s' };

  return (
    <main style={{ padding: '48px', maxWidth: '1000px', margin: '0 auto' }}>
      <button onClick={() => router.push('/')} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '32px' }}>
        ← Back to Dashboard
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <h2 style={{ fontSize: '2.5rem', margin: 0 }}>Monthly Calendar</h2>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <button onClick={prevMonth} style={btnStyle} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'} onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>← Previous</button>
          <span style={{ fontSize: '1.2rem', fontWeight: 'bold', minWidth: '160px', textAlign: 'center' }}>{monthName}</span>
          <button onClick={nextMonth} style={btnStyle} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'} onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>Next →</button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '8px' }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--text-secondary)', padding: '8px' }}>{day}</div>
          ))}
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
          {days.map((day, i) => {
            if (day === null) return <div key={`empty-${i}`} style={{ minHeight: '110px' }} />;
            
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const data = history[dateStr] || { new: 0, followUp: 0 };
            const total = data.new + data.followUp;
            const isToday = dateStr === todayStr;

            return (
              <div key={day} style={{ 
                minHeight: '110px', 
                background: isToday ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)', 
                border: isToday ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.2s',
              }}>
                <div style={{ fontWeight: 'bold', color: isToday ? '#60a5fa' : 'var(--text-secondary)', marginBottom: '8px' }}>
                  {day}
                </div>
                
                {total > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: 'auto' }}>
                    <div style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>New:</span>
                      <span style={{ color: '#60a5fa', fontWeight: 'bold' }}>{data.new}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>FU:</span>
                      <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>{data.followUp}</span>
                    </div>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '4px 0' }} />
                    <div style={{ fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Total:</span>
                      <span style={{ color: 'white' }}>{total}</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: 'auto', textAlign: 'center', color: 'rgba(255,255,255,0.1)', fontSize: '0.8rem' }}>
                    0 Sent
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
