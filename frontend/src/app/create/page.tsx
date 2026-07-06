'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import RichTextEditor from '../../components/RichTextEditor';
import '../globals.css';

export default function CreateStrategy() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [emailAccounts, setEmailAccounts] = useState<any[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    googleSheetId: '',
    emailAccountId: '',
    initialSubject: '',
    initialBody: '',
    fu1Subject: '',
    fu1Body: '',
    fu2Subject: '',
    fu2Body: '',
    fu3Subject: '',
    fu3Body: ''
  });

  useEffect(() => {
    fetch('http://localhost:5000/api/accounts')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setEmailAccounts(data);
      })
      .catch(console.error);
      
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('http://localhost:5000/api/strategies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          googleSheetId: formData.googleSheetId,
          emailAccountId: formData.emailAccountId || null,
          templates: [
            { stage: 'INITIAL', subject: formData.initialSubject, body: formData.initialBody },
            { stage: 'FOLLOW_UP_1', subject: formData.fu1Subject, body: formData.fu1Body },
            { stage: 'FOLLOW_UP_2', subject: formData.fu2Subject, body: formData.fu2Body },
            { stage: 'FOLLOW_UP_3', subject: formData.fu3Subject, body: formData.fu3Body }
          ]
        })
      });
      
      if (response.ok) {
        router.push('/');
      } else {
        const error = await response.json();
        alert('Error: ' + error.error);
      }
    } catch (err) {
      alert('Failed to connect to backend server');
    }
    setLoading(false);
  };

  const handleChange = (e: any) => setFormData({...formData, [e.target.name]: e.target.value});

  return (
    <main style={{ padding: '48px', maxWidth: '900px', margin: '0 auto' }}>
      <button onClick={() => router.push('/')} className="btn-outline" style={{ marginBottom: '32px', color: 'var(--text-secondary)', borderColor: 'var(--glass-border)' }}>
        ← Back to Dashboard
      </button>

      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '2.5rem', margin: '0 0 8px 0', background: 'linear-gradient(135deg, #ffffff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Design Your Strategy
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', margin: 0 }}>Configure your sequence and link your Google Sheet lead source.</p>
      </div>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* SECTION 1: CORE SETUP */}
        <div>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent)', color: 'white', fontSize: '0.9rem' }}>1</span>
            Core Setup
          </h3>
          <div className="glass-panel" style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 30%' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>Campaign Name</label>
              <input required name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Web Dev USA" style={{ width: '100%', padding: '14px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none', transition: 'border 0.2s', boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: '1 1 30%' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>Sender Account</label>
              
              <div ref={dropdownRef} style={{ position: 'relative' }}>
                <button 
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  style={{ 
                    width: '100%', 
                    padding: '14px', 
                    borderRadius: '8px', 
                    background: 'rgba(15, 23, 42, 0.6)', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    color: formData.emailAccountId ? 'white' : 'var(--text-secondary)', 
                    outline: 'none', 
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  {formData.emailAccountId 
                    ? emailAccounts.find(a => a.id === formData.emailAccountId)?.emailAddress || 'Unknown Account'
                    : 'Select Sender Account'}
                  <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>▼</span>
                </button>
                
                {isDropdownOpen && (
                  <div style={{ 
                    position: 'absolute', 
                    top: '100%', 
                    left: 0, 
                    right: 0,
                    marginTop: '8px',
                    background: 'rgba(15, 23, 42, 0.95)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(56, 189, 248, 0.2)',
                    borderRadius: '8px',
                    padding: '8px',
                    zIndex: 50,
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                  }}>
                    {emailAccounts.map(acc => (
                      <div 
                        key={acc.id}
                        onClick={() => {
                          setFormData({ ...formData, emailAccountId: acc.id });
                          setIsDropdownOpen(false);
                        }}
                        style={{ 
                          padding: '8px 12px', 
                          borderRadius: '4px', 
                          cursor: 'pointer',
                          background: formData.emailAccountId === acc.id ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                          color: formData.emailAccountId === acc.id ? '#38bdf8' : 'white',
                          transition: 'background 0.2s'
                        }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseOut={e => e.currentTarget.style.background = formData.emailAccountId === acc.id ? 'rgba(56, 189, 248, 0.1)' : 'transparent'}
                      >
                        {acc.emailAddress}
                      </div>
                    ))}
                    {emailAccounts.length === 0 && (
                      <div style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No accounts connected yet.</div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div style={{ flex: '1 1 30%' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>Google Sheet ID</label>
              <input required name="googleSheetId" value={formData.googleSheetId} onChange={handleChange} placeholder="Paste the Sheet ID here" style={{ width: '100%', padding: '14px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none', transition: 'border 0.2s', boxSizing: 'border-box' }} />
              <p style={{ margin: '8px 0 0 0', fontSize: '0.8rem', color: '#10b981' }}>Requires Column A (Business) and B (Email)</p>
            </div>
          </div>
        </div>

        {/* SECTION 2: EMAIL SEQUENCE */}
        <div>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent)', color: 'white', fontSize: '0.9rem' }}>2</span>
            Email Sequence
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative' }}>
            {/* Timeline Line */}
            <div style={{ position: 'absolute', left: '63px', top: '32px', bottom: '32px', width: '2px', background: 'var(--glass-border)', zIndex: 0 }}></div>

            {/* STAGE 1 */}
            <div className="glass-panel" style={{ display: 'flex', gap: '24px', position: 'relative', zIndex: 1, padding: '32px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'linear-gradient(rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.1)), #0f172a', border: '1px solid rgba(59, 130, 246, 0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', flexShrink: 0 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>DAY</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>1</span>
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', color: 'white' }}>Initial Pitch</h4>
                <input required name="initialSubject" value={formData.initialSubject} onChange={handleChange} placeholder="Subject Line" style={{ width: '100%', padding: '14px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', marginBottom: '12px' }} />
                <RichTextEditor value={formData.initialBody} onChange={(val) => setFormData({...formData, initialBody: val})} placeholder="Email Body (Use {{businessName}} as variable)" style={{ marginBottom: '12px' }} />
              </div>
            </div>

            {/* STAGE 2 */}
            <div className="glass-panel" style={{ display: 'flex', gap: '24px', position: 'relative', zIndex: 1, padding: '32px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'linear-gradient(rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.1)), #0f172a', border: '1px solid rgba(245, 158, 11, 0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#f59e0b', flexShrink: 0 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>DAY</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>4</span>
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', color: 'white' }}>First Follow-Up</h4>
                <input required name="fu1Subject" value={formData.fu1Subject} onChange={handleChange} placeholder="Subject Line" style={{ width: '100%', padding: '14px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', marginBottom: '12px' }} />
                <RichTextEditor value={formData.fu1Body} onChange={(val) => setFormData({...formData, fu1Body: val})} placeholder="Email Body" style={{ marginBottom: '12px' }} />
              </div>
            </div>

            {/* STAGE 3 */}
            <div className="glass-panel" style={{ display: 'flex', gap: '24px', position: 'relative', zIndex: 1, padding: '32px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'linear-gradient(rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.1)), #0f172a', border: '1px solid rgba(245, 158, 11, 0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#f59e0b', flexShrink: 0 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>DAY</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>8</span>
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', color: 'white' }}>Second Follow-Up</h4>
                <p style={{ margin: '0 0 16px 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Optional Stage</p>
                <input name="fu2Subject" value={formData.fu2Subject} onChange={handleChange} placeholder="Subject Line" style={{ width: '100%', padding: '14px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', marginBottom: '12px' }} />
                <RichTextEditor value={formData.fu2Body} onChange={(val) => setFormData({...formData, fu2Body: val})} placeholder="Email Body" style={{ marginBottom: '12px' }} />
              </div>
            </div>

            {/* STAGE 4 */}
            <div className="glass-panel" style={{ display: 'flex', gap: '24px', position: 'relative', zIndex: 1, padding: '32px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'linear-gradient(rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.1)), #0f172a', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#ef4444', flexShrink: 0 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>DAY</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>15</span>
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', color: 'white' }}>Final Attempt</h4>
                <p style={{ margin: '0 0 16px 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Optional Stage - The Breakup Email</p>
                <input name="fu3Subject" value={formData.fu3Subject} onChange={handleChange} placeholder="Subject Line" style={{ width: '100%', padding: '14px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', marginBottom: '12px' }} />
                <RichTextEditor value={formData.fu3Body} onChange={(val) => setFormData({...formData, fu3Body: val})} placeholder="Email Body" style={{ marginBottom: '12px' }} />
              </div>
            </div>
            
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={loading} style={{ padding: '20px', fontSize: '1.2rem', marginTop: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
          {loading ? 'Creating & Syncing...' : 'Launch Campaign & Sync Leads'}
        </button>
      </form>
    </main>
  );
}
