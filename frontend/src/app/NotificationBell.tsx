'use client';

import { useState, useEffect, useRef } from 'react';

type Notification = {
  id: string;
  createdAt: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [toastNotification, setToastNotification] = useState<Notification | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/dashboard/notifications');
      if (res.ok) {
        const data = await res.json();
        
        // Detect new notifications for toast popup
        setNotifications(prevNotifications => {
          if (prevNotifications.length > 0 && data.notifications.length > 0) {
            const newestIncoming = data.notifications[0];
            const isNew = !prevNotifications.some(n => n.id === newestIncoming.id);
            if (isNew) {
              setToastNotification(newestIncoming);
              setTimeout(() => setToastNotification(null), 5000);
            }
          }
          return data.notifications;
        });
        
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 10 seconds
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Click outside to close
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpen = async () => {
    setIsOpen(!isOpen);
    if (!isOpen && unreadCount > 0) {
      // Mark as read
      try {
        await fetch('http://localhost:5000/api/dashboard/notifications/mark-read', { method: 'POST' });
        setUnreadCount(0);
        setNotifications(notifications.map(n => ({ ...n, read: true })));
      } catch (error) {
        console.error('Failed to mark read', error);
      }
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button 
        onClick={handleOpen}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          position: 'relative',
          padding: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'color 0.2s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>

        {unreadCount > 0 && (
          <div style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            width: '10px',
            height: '10px',
            background: 'var(--danger)',
            borderRadius: '50%',
            border: '2px solid var(--bg-primary)',
            boxShadow: '0 0 8px var(--danger)'
          }} />
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: '0',
          marginTop: '8px',
          width: '350px',
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--glass-border)',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          zIndex: 100,
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: 'white', fontWeight: 'bold' }}>Notifications</h3>
          </div>
          
          <div style={{ padding: '8px' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                You have no notifications yet.
              </div>
            ) : (
              notifications.map((notif) => (
                <div key={notif.id} style={{ 
                  padding: '12px', 
                  borderRadius: '8px', 
                  background: notif.read ? 'transparent' : 'rgba(255,255,255,0.03)',
                  marginBottom: '4px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ 
                      fontSize: '0.85rem', 
                      fontWeight: 'bold', 
                      color: notif.type === 'SUCCESS' ? 'var(--accent)' : 
                             notif.type === 'ERROR' ? 'var(--danger)' : 
                             notif.type === 'WARNING' ? '#f59e0b' : 'white'
                    }}>
                      {notif.title}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {new Date(notif.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                    {notif.message}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TOAST POPUP */}
      {toastNotification && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 9999,
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--accent)',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          width: '350px',
          animation: 'slideIn 0.3s ease-out'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--accent)' }}>{toastNotification.title}</span>
            <button onClick={() => setToastNotification(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <div style={{ fontSize: '0.9rem', color: 'white', lineHeight: '1.4' }}>
            {toastNotification.message}
          </div>
        </div>
      )}
    </div>
  );
}
