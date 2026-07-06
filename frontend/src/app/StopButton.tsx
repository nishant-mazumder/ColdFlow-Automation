'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function StopButton() {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [modalState, setModalState] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' } | null>(null);
  const router = useRouter();

  const handleStop = async () => {
    setLoading(true);
    setShowConfirm(false);
    try {
      const res = await fetch('http://localhost:5000/api/dashboard/stop', { method: 'POST' });
      if (res.ok) {
        setModalState({
          isOpen: true,
          title: "Engine Stopped",
          message: "The Live Queue has been successfully safely aborted. No further emails will be sent today.",
          type: 'success'
        });
        router.refresh();
      } else {
        setModalState({ isOpen: true, title: "Error", message: "Failed to stop queue. Please try again.", type: 'error' });
      }
    } catch (e) {
      setModalState({ isOpen: true, title: "Connection Error", message: "Error connecting to backend.", type: 'error' });
    }
    setLoading(false);
  };

  return (
    <>
      <button 
        onClick={() => setShowConfirm(true)} 
        disabled={loading} 
        className="btn-outline" 
        style={{ 
          borderColor: '#ef4444', 
          color: '#ef4444', 
          padding: '6px 12px', 
          fontSize: '0.9rem',
          marginLeft: 'auto' // pushes it to the right if in a flex container
        }}
      >
        {loading ? 'Stopping...' : "🛑 Stop Engine"}
      </button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-panel" style={{ maxWidth: '400px', width: '90%', textAlign: 'center', border: '1px solid #ef4444' }}>
            <h3 style={{ marginTop: 0, color: '#ef4444' }}>Emergency Stop</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Are you sure you want to stop the Live Queue? The engine will instantly abort and no further emails will be sent today.
            </p>
            <div style={{ display: 'flex', gap: '16px' }}>
              <button className="btn-outline" onClick={() => setShowConfirm(false)} style={{ flex: 1 }}>Cancel</button>
              <button className="btn-primary" onClick={handleStop} style={{ flex: 1, background: '#ef4444' }}>Yes, Stop</button>
            </div>
          </div>
        </div>
      )}

      {/* Success/Error Modal */}
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
              onClick={() => {
                setModalState(null);
                router.refresh();
              }}
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
