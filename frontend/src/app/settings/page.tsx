'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import '../globals.css';

export default function SettingsPage() {
  const router = useRouter();
  const [data, setData] = useState({ dailyQuota: 40, minNewEmails: 20 });
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('http://localhost:5000/api/settings').then(res => res.json()),
      fetch('http://localhost:5000/api/accounts').then(res => res.json())
    ]).then(([settingsData, accountsData]) => {
      if (settingsData && settingsData.dailyQuota) setData(settingsData);
      if (Array.isArray(accountsData)) setAccounts(accountsData);
      setLoading(false);
    });
  }, []);

  const handleSave = async (e: any) => {
    e.preventDefault();
    if (data.minNewEmails > data.dailyQuota) {
      alert("Validation Error: Minimum New Emails cannot exceed the Daily Total Sending Quota.");
      return;
    }
    setSaving(true);
    await fetch('http://localhost:5000/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    setSaving(false);
    setConfirmModal({
      isOpen: true,
      title: "Settings Saved",
      message: "Your Global Settings have been updated successfully.",
      onConfirm: () => setConfirmModal(null)
    });
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm("Are you sure you want to disconnect this account?")) return;
    await fetch(`http://localhost:5000/api/accounts/${id}`, { method: 'DELETE' });
    setAccounts(accounts.filter(a => a.id !== id));
  };

  if (loading) return <div style={{ padding: '48px', color: 'white' }}>Loading Settings...</div>;

  return (
    <main style={{ padding: '48px', maxWidth: '800px', margin: '0 auto' }}>
      <button onClick={() => router.push('/')} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '32px' }}>
        ← Back to Dashboard
      </button>

      <h2 style={{ fontSize: '2.5rem', marginBottom: '40px' }}>Global Settings</h2>

      <div className="glass-panel" style={{ marginBottom: '32px' }}>
        <h3 style={{ margin: '0 0 16px 0' }}>Connected Email Accounts</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>These Google accounts can be assigned to different strategies for sending.</p>
        
        {accounts.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontStyle: 'italic' }}>No email accounts connected yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {accounts.map(acc => (
              <div key={acc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <div style={{ fontWeight: 'bold' }}>{acc.emailAddress}</div>
                  <div style={{ fontSize: '0.8rem', color: '#10b981' }}>✓ Authenticated</div>
                </div>
                <button onClick={() => handleDeleteAccount(acc.id)} style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>Remove</button>
              </div>
            ))}
          </div>
        )}
        
        <button onClick={() => window.location.href = 'http://localhost:5000/api/auth/google'} className="btn-primary" style={{ background: 'white', color: 'black' }}>
          + Connect Google Account
        </button>
      </div>

      <form onSubmit={handleSave} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <h3 style={{ margin: 0 }}>Sending Quotas</h3>
        <p style={{ color: 'var(--text-secondary)', margin: '-12px 0 12px 0', fontSize: '0.9rem' }}>
          Adjusting these settings will affect how the engine schedules the Live Queue for tomorrow.
        </p>
        
        <div>
          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Daily Total Sending Quota</label>
          <input 
            type="number" 
            value={data.dailyQuota} 
            onChange={(e) => setData({...data, dailyQuota: parseInt(e.target.value)})} 
            style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', color: 'white' }} 
          />
          <p style={{ margin: '8px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Maximum number of emails (New + Followups) to send per day to protect deliverability.</p>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Minimum New Leads Per Day</label>
          <input 
            type="number" 
            value={data.minNewEmails} 
            onChange={(e) => setData({...data, minNewEmails: parseInt(e.target.value)})} 
            style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', color: 'white' }} 
          />
          <p style={{ margin: '8px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>The engine will always try to inject at least this many brand new leads into the queue each day.</p>
        </div>

        <button type="submit" disabled={saving} className="btn-primary" style={{ padding: '16px', fontSize: '1.1rem', marginTop: '16px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>

      {/* CUSTOM ALERT MODAL */}
      {confirmModal && confirmModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '24px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', background: 'rgba(30, 41, 59, 0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '32px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto', fontSize: '2rem' }}>
              ℹ️
            </div>
            <h3 style={{ fontSize: '1.75rem', margin: '0 0 16px 0', color: 'white' }}>{confirmModal.title}</h3>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 32px 0', fontSize: '1.1rem', lineHeight: '1.6' }}>{confirmModal.message}</p>
            
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <button 
                onClick={confirmModal.onConfirm} 
                className="btn-primary" 
                style={{ flex: 1, background: '#3b82f6', border: '1px solid #2563eb', color: 'white', padding: '14px', fontWeight: 'bold' }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
