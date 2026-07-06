'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ApproveButton({ 
  disabled = false,
  totalScheduled = 0,
  newLeads = 0,
  fu1 = 0,
  fu2 = 0,
  fu3 = 0
}: { 
  disabled?: boolean,
  totalScheduled?: number,
  newLeads?: number,
  fu1?: number,
  fu2?: number,
  fu3?: number
}) {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [modalState, setModalState] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' } | null>(null);
  const router = useRouter();

  const handleApprove = async () => {
    if (disabled) return;
    setShowConfirm(false);
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/dashboard/approve', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        
        if (json.data && json.data.total === 0) {
          setModalState({
            isOpen: true,
            title: "Queue Empty",
            message: "There are no emails scheduled for today. All active leads are either waiting for their next follow-up date, or you have no active strategies.",
            type: 'error'
          });
        } else {
          setModalState({
            isOpen: true,
            title: "Engine Started!",
            message: "The engine is now quietly sending emails in the background. You can leave this tab open or do other work.",
            type: 'success'
          });
          router.refresh();
        }
      } else {
        setModalState({ isOpen: true, title: "Error", message: "Failed to send emails. Please try again.", type: 'error' });
      }
    } catch (e) {
      setModalState({ isOpen: true, title: "Connection Error", message: "Error connecting to backend.", type: 'error' });
    }
    setLoading(false);
  };

  return (
    <>
      <button 
        onClick={() => { if (!disabled) setShowConfirm(true); }} 
        disabled={loading || disabled} 
        className="btn-primary" 
        style={{ 
          padding: '16px 32px', 
          fontSize: '1.1rem', 
          background: (loading || disabled) ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
          color: (loading || disabled) ? '#94a3b8' : 'white',
          cursor: (loading || disabled) ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Starting Engine...' : "Approve Today's Queue"}
      </button>

      {/* CONFIRMATION MODAL */}
      {showConfirm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-panel" style={{ 
            maxWidth: '450px', 
            width: '90%', 
            textAlign: 'center', 
            border: '1px solid #3b82f6',
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.2)'
          }}>
            <h3 style={{ marginTop: 0, color: 'white', fontSize: '1.5rem' }}>Start Email Engine?</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '1.05rem', lineHeight: 1.5 }}>
              Are you sure you want to approve today's queue? This will instantly start deploying emails to all scheduled leads in the background.
            </p>

            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '16px', marginBottom: '24px', textAlign: 'left', border: '1px solid var(--glass-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Total Scheduled:</span>
                <span style={{ color: 'white', fontWeight: 'bold' }}>{totalScheduled} Emails</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>• New Leads:</span>
                <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>{newLeads}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>• Follow-up 1:</span>
                <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>{fu1}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>• Follow-up 2:</span>
                <span style={{ color: '#8b5cf6', fontWeight: 'bold' }}>{fu2}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>• Follow-up 3:</span>
                <span style={{ color: '#10b981', fontWeight: 'bold' }}>{fu3}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--glass-border)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Expected End Time:</span>
                <span style={{ color: '#10b981', fontWeight: 'bold' }}>
                  {totalScheduled > 0 ? new Date(Date.now() + Math.max(0, (totalScheduled - 1) * 180000)).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <button 
                className="btn-outline" 
                onClick={() => setShowConfirm(false)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={handleApprove}
                style={{ flex: 1, background: 'linear-gradient(135deg, #10b981, #059669)' }}
              >
                Confirm & Start
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS/ERROR MODAL */}
      {modalState?.isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-panel" style={{ 
            maxWidth: '400px', 
            width: '90%', 
            textAlign: 'center', 
            border: `1px solid ${modalState.type === 'success' ? '#10b981' : '#ef4444'}` 
          }}>
            <h3 style={{ marginTop: 0, color: modalState.type === 'success' ? '#10b981' : '#ef4444' }}>
              {modalState.title}
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              {modalState.message}
            </p>
            <button 
              className="btn-primary" 
              onClick={() => setModalState(null)}
              style={{ width: '100%', background: modalState.type === 'success' ? '#10b981' : '#ef4444' }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
}
