'use client';
import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import RichTextEditor from '../../../components/RichTextEditor';
import 'react-quill-new/dist/quill.snow.css';
import '../../globals.css';

export default function ManageStrategy({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const id = unwrappedParams.id;
  
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState('templates');
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewSubject, setPreviewSubject] = useState('');
  const [previewLabel, setPreviewLabel] = useState('');
  
  // Email Accounts state
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  
  // Template Edit state
  const [editTemplate, setEditTemplate] = useState<{ id: string; subject: string; body: string } | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  
  // Filtering state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');

  // Lead Modal state
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [leadDetail, setLeadDetail] = useState<any>(null);
  const [loadingLead, setLoadingLead] = useState(false);

  // Custom Confirmation/Alert Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isAlert?: boolean;
    onConfirm: () => void;
  } | null>(null);

  const fetchStrategy = () => {
    fetch(`http://localhost:5000/api/strategies/${id}`)
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
        if (!previewHtml && d.templateStats && d.templateStats.length > 0) {
          const initialTemplate = d.templateStats.find((t: any) => t.stage === 'INITIAL') || d.templateStats[0];
          setPreviewHtml(initialTemplate.body);
          setPreviewSubject(initialTemplate.subject);
        }
      });
  };

  useEffect(() => {
    fetchStrategy();
    
    // Auto-sync in background on mount
    setSyncing(true);
    fetch(`http://localhost:5000/api/strategies/${id}/sync`, { method: 'POST' })
      .then(res => res.json())
      .then(res => {
        setSyncing(false);
        if (res.added && res.added > 0) {
          fetchStrategy(); // Refresh the table if new leads were found
        }
      })
      .catch(() => setSyncing(false));

    // Fetch accounts
    fetch('http://localhost:5000/api/accounts')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setAccounts(data);
      });
  }, [id]);

  useEffect(() => {
    if (selectedLeadId) {
      setLoadingLead(true);
      fetch(`http://localhost:5000/api/leads/${selectedLeadId}`)
        .then(res => res.json())
        .then(d => {
          setLeadDetail(d);
          setLoadingLead(false);
        });
    }
  }, [selectedLeadId]);

  // Prevent background scrolling when a modal is open
  useEffect(() => {
    if (editTemplate || confirmModal || selectedLeadId) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [editTemplate, confirmModal, selectedLeadId]);

  if (loading) return <div style={{ padding: '48px', color: 'white' }}>Loading Strategy...</div>;
  if (!data || data.error) return <div style={{ padding: '48px', color: 'white' }}>Strategy not found.</div>;

  const { strategy, funnel, queuePreview, templateStats, leads, progress = { percent: 0, daysLeft: 0, totalSent: 0, maxEmails: 0 } } = data;

  const handleSaveTemplate = async () => {
    if (!editTemplate) return;
    setSavingTemplate(true);
    try {
      const cleanBody = editTemplate.body.replace(/&nbsp;/gi, ' ');
      await fetch(`http://localhost:5000/api/strategies/${id}/templates/${editTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: editTemplate.subject, body: cleanBody })
      });
      setPreviewSubject(editTemplate.subject);
      setPreviewHtml(cleanBody);
      setEditTemplate(null);
      fetchStrategy();
    } catch (e) {
      console.error(e);
      alert('Failed to save template');
    }
    setSavingTemplate(false);
  };

  const handleDeleteStrategy = () => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Strategy",
      message: "SAFETY PROTOCOL TRIGGERED: Are you sure you want to permanently delete this strategy and all its leads? This action cannot be undone.",
      onConfirm: async () => {
        setConfirmModal(null);
        await fetch(`http://localhost:5000/api/strategies/${id}`, { method: 'DELETE' });
        router.push('/');
      }
    });
  };

  const handleToggleStatus = async () => {
    await fetch(`http://localhost:5000/api/strategies/${id}/toggle`, { method: 'POST' });
    fetchStrategy(); // Refresh data
  };

  const handleAccountSelect = async (emailAccountId: string | null) => {
    setIsAccountDropdownOpen(false);
    await fetch(`http://localhost:5000/api/strategies/${id}/email-account`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailAccountId })
    });
    fetchStrategy();
  };

  const handleManualSync = async () => {
    setSyncing(true);
    const res = await fetch(`http://localhost:5000/api/strategies/${id}/sync`, { method: 'POST' });
    const json = await res.json();
    setSyncing(false);
    if (json.added !== undefined) {
      setConfirmModal({
        isOpen: true,
        title: "Sync Complete",
        message: `${json.added} new leads were found in your Google Sheet and imported into the engine.`,
        isAlert: true,
        onConfirm: () => setConfirmModal(null)
      });
      if (json.added > 0) fetchStrategy();
    }
  };

  const executeLeadAction = async (action: string) => {
    await fetch(`http://localhost:5000/api/leads/${selectedLeadId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });
    
    if (action === 'DELETE') {
      setSelectedLeadId(null);
    } else {
      // Refresh lead details
      const res = await fetch(`http://localhost:5000/api/leads/${selectedLeadId}`);
      setLeadDetail(await res.json());
    }
    fetchStrategy(); // Refresh background table
  };

  const handleAddVariant = async (stage: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/strategies/${id}/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage, subject: 'New Variant Subject', body: 'New Variant Body' })
      });
      if (res.ok) fetchStrategy();
    } catch (e) { console.error(e); }
  };

  const handleDeleteVariant = async (templateId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Variant",
      message: "Are you sure you want to delete this A/B testing variant?",
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const res = await fetch(`http://localhost:5000/api/strategies/${id}/templates/${templateId}`, { method: 'DELETE' });
          if (res.ok) {
            if (editTemplate?.id === templateId) setEditTemplate(null);
            fetchStrategy();
          }
        } catch (e) { console.error(e); }
      }
    });
  };

  const handleLeadAction = (action: string) => {
    if (action === 'DELETE') {
      setConfirmModal({
        isOpen: true,
        title: "Delete Lead",
        message: "SAFETY PROTOCOL: Are you sure you want to permanently delete this lead and its email history? This cannot be undone.",
        onConfirm: () => {
          setConfirmModal(null);
          executeLeadAction(action);
        }
      });
    } else {
      executeLeadAction(action);
    }
  };

  const filteredLeads = leads.filter((l: any) => {
    const matchesSearch = l.businessName.toLowerCase().includes(searchTerm.toLowerCase()) || l.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All Statuses' || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <main style={{ padding: '48px', maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
      
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
        <div>
          <button onClick={() => router.push('/')} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '16px' }}>
            ← Back to Dashboard
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h2 style={{ fontSize: '2.5rem', margin: 0 }}>{strategy.name}</h2>
            <span style={{ padding: '6px 12px', background: strategy.status === 'RUNNING' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)', color: strategy.status === 'RUNNING' ? '#10b981' : '#f59e0b', borderRadius: '16px', fontSize: '0.9rem', border: `1px solid ${strategy.status === 'RUNNING' ? '#10b981' : '#f59e0b'}` }}>
              {strategy.status}
            </span>
          </div>
          <div style={{ color: 'var(--text-secondary)', marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span>Google Sheet:</span>
            <a href={`https://docs.google.com/spreadsheets/d/${strategy.googleSheetId}/edit`} target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: '500' }} onMouseOver={e => e.currentTarget.style.textDecoration = 'underline'} onMouseOut={e => e.currentTarget.style.textDecoration = 'none'}>
              {data?.sheetName || strategy.googleSheetId}
            </a>
          </div>
          <div style={{ color: 'var(--text-secondary)', marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span>Sender Account:</span>
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                style={{ 
                  background: 'rgba(30, 41, 59, 0.7)', 
                  border: '1px solid rgba(56, 189, 248, 0.3)', 
                  color: 'white', 
                  padding: '6px 12px', 
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              >
                {strategy.emailAccountId 
                  ? accounts.find(a => a.id === strategy.emailAccountId)?.emailAddress || 'Unknown Account'
                  : 'Select an Account'}
                <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>▼</span>
              </button>
              
              {isAccountDropdownOpen && (
                <>
                  <div 
                    onClick={() => setIsAccountDropdownOpen(false)} 
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }} 
                  />
                  <div style={{ 
                    position: 'absolute', 
                    top: '100%', 
                    left: 0, 
                    marginTop: '8px',
                    background: 'rgba(15, 23, 42, 0.95)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(56, 189, 248, 0.2)',
                    borderRadius: '8px',
                    padding: '8px',
                    width: 'max-content',
                    minWidth: '220px',
                    zIndex: 50,
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                  }}>
                    {accounts.map(acc => (
                      <div 
                        key={acc.id}
                        onClick={() => handleAccountSelect(acc.id)}
                        style={{ 
                          padding: '8px 12px', 
                          borderRadius: '4px', 
                          cursor: 'pointer',
                          background: strategy.emailAccountId === acc.id ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                          color: strategy.emailAccountId === acc.id ? '#38bdf8' : 'white',
                          marginTop: '4px',
                          transition: 'background 0.2s'
                        }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseOut={e => e.currentTarget.style.background = strategy.emailAccountId === acc.id ? 'rgba(56, 189, 248, 0.1)' : 'transparent'}
                      >
                        {acc.emailAddress}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={handleManualSync} disabled={syncing} className="btn-primary" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: syncing ? 'var(--text-secondary)' : 'white' }}>
            {syncing ? 'Syncing...' : 'Sync Sheet'}
          </button>
          <button onClick={handleToggleStatus} className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--glass-border)' }}>
            {strategy.status === 'RUNNING' ? 'Pause Campaign' : 'Resume Campaign'}
          </button>
          <button onClick={handleDeleteStrategy} className="btn-primary" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
            Delete Strategy
          </button>
        </div>
      </div>

      {/* TIMELINE PROGRESS BAR (HIGHLIGHTED) */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes greenPulse {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
      `}} />
      <div className="glass-panel" style={{ 
        padding: '40px', 
        marginBottom: '48px', 
        background: 'linear-gradient(145deg, rgba(30,41,59,0.7) 0%, rgba(15,23,42,0.9) 100%)', 
        border: '1px solid rgba(16, 185, 129, 0.4)',
        boxShadow: '0 0 30px rgba(16, 185, 129, 0.15)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: '-100px', left: '-100px', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }}></div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px', position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981', animation: 'greenPulse 2s infinite' }}></div>
              <h3 style={{ margin: 0, color: 'white', fontSize: '1.4rem', fontWeight: 700, letterSpacing: '0.5px' }}>Campaign Master Timeline</h3>
            </div>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '1rem' }}>Tracking the overall progression of all leads through the outbound sequence.</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: 'white', fontSize: '2.5rem', fontWeight: 800, lineHeight: 1, marginBottom: '6px', background: 'linear-gradient(to right, #34d399, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {progress.percent}%
            </div>
            <div style={{ color: '#94a3b8', fontSize: '1rem', fontWeight: 500 }}>
              <strong style={{ color: 'white' }}>{progress.daysLeft} Days</strong> Until Completion
            </div>
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.95rem', fontWeight: 600 }}>
            <span style={{ color: '#34d399', letterSpacing: '1px' }}>START</span>
            <span style={{ color: '#34d399', letterSpacing: '1px' }}>FINISH</span>
          </div>
          <div style={{ width: '100%', height: '16px', background: 'rgba(0,0,0,0.4)', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)' }}>
            <div style={{ 
              width: `${Math.max(1, progress.percent)}%`,
              height: '100%', 
              background: 'linear-gradient(90deg, #059669, #10b981, #34d399)', 
              borderRadius: '8px', 
              transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 0 15px rgba(16, 185, 129, 0.6)'
            }}></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '0.9rem', color: '#94a3b8' }}>
            <span><strong style={{ color: 'white' }}>{progress.totalSent}</strong> Emails Sent</span>
            <span><strong style={{ color: 'white' }}>{progress.maxEmails}</strong> Total Expected</span>
          </div>
        </div>
      </div>

      {/* LEAD FUNNEL */}
      <h3 style={{ marginBottom: '16px' }}>Lead Funnel</h3>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)', marginBottom: '40px' }}>
        {[
          { label: 'Imported', value: funnel.imported, color: 'white' },
          { label: 'Sent', value: funnel.sent, color: '#3b82f6' },
          { label: 'Opened', value: funnel.opened, color: '#a855f7' },
          { label: 'Replies', value: funnel.replies, color: '#10b981' },
          { label: 'Closed', value: funnel.closed, color: '#f59e0b' },
          { label: 'Bounced', value: funnel.bounced, color: '#ef4444' }
        ].map(stat => (
          <div key={stat.label} className="glass-panel" style={{ padding: '24px 16px', textAlign: 'center' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px' }}>{stat.label}</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid var(--glass-border)', marginBottom: '32px' }}>
        {['Templates & Performance', 'Tomorrow\'s Queue Preview', 'Lead Database'].map((tab, i) => {
          const tabId = ['templates', 'queue', 'leads'][i];
          const isActive = activeTab === tabId;
          return (
            <button 
              key={tabId}
              onClick={() => setActiveTab(tabId)}
              style={{ background: 'transparent', border: 'none', color: isActive ? 'var(--accent)' : 'var(--text-secondary)', paddingBottom: '12px', borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent', fontSize: '1.1rem', cursor: 'pointer' }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: TEMPLATES */}
      {activeTab === 'templates' && (
        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
          <div style={{ width: 'calc(50% - 12px)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { id: 'INITIAL', title: 'Initial Email', day: '1' },
              { id: 'FOLLOW_UP_1', title: 'Follow-Up 1', day: '4' },
              { id: 'FOLLOW_UP_2', title: 'Follow-Up 2', day: '8' },
              { id: 'FOLLOW_UP_3', title: 'Follow-Up 3', day: '15' }
            ].map(stageInfo => {
              const templatesForStage = templateStats.filter((t: any) => t.stage === stageInfo.id).sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
              if (templatesForStage.length === 0) return null;
              return (
                <div key={stageInfo.id} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <h4 style={{ margin: 0, fontSize: '1.2rem', color: '#ffffff', fontWeight: '600', letterSpacing: '0.3px' }}>{stageInfo.title}</h4>
                      <span style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.5px' }}>DAY {stageInfo.day}</span>
                    </div>
                    {stageInfo.id === 'INITIAL' && (
                      <button onClick={() => handleAddVariant(stageInfo.id)} style={{ background: 'transparent', border: '1px dashed rgba(255,255,255,0.2)', color: '#94a3b8', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e => {e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'}} onMouseOut={e => {e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}}>
                        + Add A/B Template
                      </button>
                    )}
                  </div>
                  
                  {templatesForStage.map((t: any, index: number) => (
                    <div key={t.id} className="glass-panel hover-brighten" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'linear-gradient(145deg, rgba(30,41,59,0.5) 0%, rgba(15,23,42,0.6) 100%)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.2)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1, minWidth: 0, paddingRight: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ color: '#e2e8f0', fontWeight: '600', fontSize: '1.05rem' }}>
                              {templatesForStage.length > 1 ? `Template ${String.fromCharCode(65 + index)}` : stageInfo.title}
                            </span>
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                          {templatesForStage.length > 1 && (
                            <button onClick={() => handleDeleteVariant(t.id)} style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '6px 14px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                              Delete
                            </button>
                          )}
                          <button onClick={() => {
                            let formattedBody = t.body;
                            if (!/<[a-z][\s\S]*>/i.test(formattedBody)) {
                              formattedBody = formattedBody.replace(/\r?\n/g, '<br />');
                            }
                            setEditTemplate({ id: t.id, subject: t.subject, body: formattedBody });
                            setPreviewHtml(t.body);
                            setPreviewSubject(t.subject);
                            setPreviewLabel(templatesForStage.length > 1 ? `${stageInfo.title.toUpperCase()} - TEMPLATE ${String.fromCharCode(65 + index)}` : stageInfo.title.toUpperCase());
                          }} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', padding: '6px 14px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }} onMouseOver={e => {e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}} onMouseOut={e => {e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            Edit
                          </button>
                          <button onClick={() => { 
                            setPreviewHtml(t.body); 
                            setPreviewSubject(t.subject); 
                            setPreviewLabel(templatesForStage.length > 1 ? `${stageInfo.title.toUpperCase()} - TEMPLATE ${String.fromCharCode(65 + index)}` : stageInfo.title.toUpperCase());
                          }} style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '6px 14px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }} onMouseOver={e => {e.currentTarget.style.background = 'rgba(56, 189, 248, 0.15)'; e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.3)'}} onMouseOut={e => {e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)'; e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.2)'}}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                            Preview
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', background: 'rgba(0,0,0,0.2)', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '600', letterSpacing: '0.5px' }}>SENT</span>
                          <span style={{ fontSize: '1rem', color: '#f8fafc', fontWeight: '600' }}>{t.sent}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '600', letterSpacing: '0.5px' }}>OPEN</span>
                          <span style={{ fontSize: '1rem', color: '#38bdf8', fontWeight: '600' }}>{t.openRate}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '600', letterSpacing: '0.5px' }}>REPLY</span>
                          <span style={{ fontSize: '1rem', color: '#34d399', fontWeight: '600' }}>{t.replyRate}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '600', letterSpacing: '0.5px' }}>BOUNCE</span>
                          <span style={{ fontSize: '1rem', color: '#f87171', fontWeight: '600' }}>{t.bounceRate}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '600', letterSpacing: '0.5px' }}>CLICK</span>
                          <span style={{ fontSize: '1rem', color: '#c084fc', fontWeight: '600' }}>{t.clickRate}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          <div className="glass-panel" style={{ width: 'calc(50% - 12px)', background: '#ffffff', color: 'black', minHeight: '400px', padding: '32px' }}>
            {previewHtml ? (
              <div style={{ fontFamily: 'sans-serif', lineHeight: '1.6' }}>
                <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '24px' }}>
                  <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#64748b', fontWeight: '600', marginBottom: '4px', letterSpacing: '0.5px' }}>{previewLabel || 'SUBJECT'}</div>
                  <div style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: '500' }}>{previewSubject || 'No subject line'}</div>
                </div>
                <div className="ql-snow">
                  <div className="ql-editor" style={{ padding: 0, wordBreak: 'normal', overflowWrap: 'normal', whiteSpace: 'normal' }} dangerouslySetInnerHTML={{ __html: (function(html) {
                    if (!html) return '';
                    if (/<[a-z][\s\S]*>/i.test(html)) {
                      // Strip all accidental non-breaking spaces (often caused by copy-pasting from other apps)
                      // which force the browser to treat entire paragraphs as one giant unbreakable word.
                      let cleaned = html.replace(/&nbsp;/gi, ' ');
                      // Then re-inject &nbsp; ONLY into completely empty paragraphs so they don't visually collapse to 0px height.
                      return cleaned.replace(/<p><br\s*\/?>\s*<\/p>/gi, '<p>&nbsp;</p>').replace(/<p>\s*<\/p>/gi, '<p>&nbsp;</p>');
                    }
                    return html.replace(/\r?\n/g, '<br />').replace(/&nbsp;/gi, ' ');
                  })(previewHtml) }} />
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                Click 'Preview Email' on a template to see it here.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: QUEUE */}
      {activeTab === 'queue' && (
        <div className="glass-panel" style={{ maxWidth: '600px' }}>
          <h3 style={{ margin: '0 0 24px 0' }}>Tomorrow's Plan</h3>
          <div style={{ fontSize: '3rem', fontWeight: 'bold', color: 'white', marginBottom: '24px' }}>
            {queuePreview.total} <span style={{fontSize: '1.2rem', color: 'var(--text-secondary)', fontWeight: 'normal'}}>Emails Scheduled</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px' }}>
              <span style={{ color: 'var(--text-primary)', fontSize: '1.1rem' }}>New Leads</span>
              <span style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: '1.1rem' }}>{queuePreview.new}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px' }}>
              <span style={{ color: 'var(--text-primary)', fontSize: '1.1rem' }}>Follow-up 1</span>
              <span style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '1.1rem' }}>{queuePreview.fu1}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px' }}>
              <span style={{ color: 'var(--text-primary)', fontSize: '1.1rem' }}>Follow-up 2</span>
              <span style={{ color: '#8b5cf6', fontWeight: 'bold', fontSize: '1.1rem' }}>{queuePreview.fu2}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-primary)', fontSize: '1.1rem' }}>Follow-up 3</span>
              <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '1.1rem' }}>{queuePreview.fu3}</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: LEADS */}
      {activeTab === 'leads' && (
        <div className="glass-panel" style={{ overflowX: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
            <input 
              placeholder="Search business or email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '12px 16px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '8px', width: '300px' }} 
            />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '12px 16px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '8px' }}
            >
              <option style={{ background: '#1e293b', color: 'white' }}>All Statuses</option>
              <option style={{ background: '#1e293b', color: 'white' }}>PENDING</option>
              <option style={{ background: '#1e293b', color: 'white' }}>IN_PROGRESS</option>
              <option style={{ background: '#1e293b', color: 'white' }}>REPLIED</option>
              <option style={{ background: '#1e293b', color: 'white' }}>COMPLETED</option>
              <option style={{ background: '#1e293b', color: 'white' }}>PAUSED</option>
            </select>
          </div>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--glass-border)' }}>
                <th style={{ padding: '16px 8px' }}>Business</th>
                <th style={{ padding: '16px 8px' }}>Email</th>
                <th style={{ padding: '16px 8px' }}>Status</th>
                <th style={{ padding: '16px 8px' }}>Stage</th>
                <th style={{ padding: '16px 8px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead: any) => (
                <tr key={lead.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '16px 8px', color: 'white' }}>{lead.businessName}</td>
                  <td style={{ padding: '16px 8px', color: 'var(--text-secondary)' }}>{lead.email}</td>
                  <td style={{ padding: '16px 8px' }}>
                    <span style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', fontSize: '0.8rem' }}>{lead.status}</span>
                  </td>
                  <td style={{ padding: '16px 8px', color: 'var(--text-secondary)' }}>{lead.currentStage}</td>
                  <td style={{ padding: '16px 8px' }}>
                    <button onClick={() => setSelectedLeadId(lead.id)} className="btn-outline">Manage</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* LEAD DETAIL MODAL OVERLAY */}
      {selectedLeadId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '24px' }}>
          <div style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', background: 'rgba(30, 41, 59, 0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            
            <button onClick={() => setSelectedLeadId(null)} style={{ position: 'absolute', top: '24px', right: '24px', background: 'transparent', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            
            {loadingLead || !leadDetail ? (
              <div style={{ padding: '48px', textAlign: 'center' }}>Loading Lead...</div>
            ) : (
              <div style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '2rem', margin: '0 0 8px 0' }}>{leadDetail.businessName}</h3>
                <p style={{ color: 'var(--text-secondary)', margin: '0 0 24px 0', fontSize: '1.1rem' }}>{leadDetail.email}</p>
                
                <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
                  <span style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.1)', borderRadius: '16px' }}>Status: {leadDetail.status}</span>
                  <span style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.1)', borderRadius: '16px' }}>Stage: {leadDetail.currentStage}</span>
                  {leadDetail.nextFollowUpDate && <span style={{ padding: '6px 12px', background: 'rgba(59,130,246,0.2)', color: '#3b82f6', borderRadius: '16px' }}>Next: {new Date(leadDetail.nextFollowUpDate).toLocaleDateString()}</span>}
                </div>

                <h4 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px', marginBottom: '16px' }}>Manual Actions</h4>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '40px' }}>
                  <button onClick={() => handleLeadAction('FORCE')} className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--accent)' }}>Force Send Today</button>
                  <button onClick={() => handleLeadAction('SKIP')} className="btn-primary" style={{ background: 'transparent', border: '1px solid #f59e0b', color: '#f59e0b' }}>Skip to Next Stage</button>
                  <button onClick={() => handleLeadAction('PAUSE')} className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--glass-border)' }}>Pause Lead</button>
                  <button onClick={() => handleLeadAction('COMPLETE')} className="btn-primary" style={{ background: 'transparent', border: '1px solid #10b981', color: '#10b981' }}>Mark Completed</button>
                  <button onClick={() => handleLeadAction('DELETE')} className="btn-primary" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>Delete Lead</button>
                </div>

                <h4 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px', marginBottom: '16px' }}>Email Timeline</h4>
                {leadDetail.EmailLog && leadDetail.EmailLog.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {leadDetail.EmailLog.map((log: any) => (
                      <div key={log.id} style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', borderLeft: '4px solid var(--accent)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <strong style={{ color: 'white' }}>{log.stage}</strong>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{new Date(log.sentAt).toLocaleString()}</span>
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Template ID: {log.templateId}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-secondary)' }}>No emails sent to this lead yet.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* EDIT TEMPLATE MODAL */}
      {editTemplate && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel" style={{ width: '800px', maxWidth: '90vw', padding: '32px', position: 'relative' }}>
            <h2 style={{ marginTop: 0, marginBottom: '24px' }}>Edit Template</h2>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Subject Line</label>
              <input 
                value={editTemplate.subject} 
                onChange={e => setEditTemplate({...editTemplate, subject: e.target.value})} 
                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Email Body (Rich Text)</label>
              <RichTextEditor 
                value={editTemplate.body} 
                onChange={val => setEditTemplate({...editTemplate, body: val})} 
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
              <button onClick={() => setEditTemplate(null)} className="btn-outline" disabled={savingTemplate}>Cancel</button>
              <button onClick={handleSaveTemplate} className="btn-primary" disabled={savingTemplate}>
                {savingTemplate ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION MODAL */}
      {confirmModal && confirmModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '24px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', background: 'rgba(30, 41, 59, 0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '32px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto', fontSize: '2rem' }}>
              ⚠️
            </div>
            <h3 style={{ fontSize: '1.75rem', margin: '0 0 16px 0', color: 'white' }}>{confirmModal.title}</h3>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 32px 0', fontSize: '1.1rem', lineHeight: '1.6' }}>{confirmModal.message}</p>
            
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              {!confirmModal.isAlert && (
                <button 
                  onClick={() => setConfirmModal(null)} 
                  className="btn-primary" 
                  style={{ flex: 1, background: 'transparent', border: '1px solid var(--glass-border)', color: 'white', padding: '14px' }}
                >
                  Cancel
                </button>
              )}
              <button 
                onClick={confirmModal.onConfirm} 
                className="btn-primary" 
                style={{ flex: 1, background: confirmModal.isAlert ? '#3b82f6' : '#ef4444', border: confirmModal.isAlert ? '1px solid #2563eb' : '1px solid #dc2626', color: 'white', padding: '14px', fontWeight: 'bold' }}
              >
                {confirmModal.isAlert ? 'OK' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
