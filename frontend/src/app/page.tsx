export const dynamic = 'force-dynamic';

import './globals.css';
import ApproveButton from './ApproveButton';
import StopButton from './StopButton';
import AutoRefresher from './AutoRefresher';
import NotificationBell from './NotificationBell';

async function getStats() {
  try {
    const res = await fetch('http://localhost:5000/api/dashboard/stats', { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

async function getStrategies() {
  try {
    const res = await fetch('http://localhost:5000/api/strategies', { cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    return [];
  }
}

export default async function Home() {
  const stats = await getStats();
  const strategies = await getStrategies();

  const totalScheduled = stats ? stats.queue.total : 0;
  const newLeads = stats ? stats.queue.new : 0;
  const fu1 = stats ? stats.queue.fu1 : 0;
  const fu2 = stats ? stats.queue.fu2 : 0;
  const fu3 = stats ? stats.queue.fu3 : 0;
  const byStrategy = stats?.queue?.byStrategy || {};
  const activeCount = stats ? stats.activeStrategies : 0;
  const totalReplies = stats ? stats.totalReplies : 0;

  const liveQueue = stats?.liveQueue;
  const isQueueRunning = liveQueue && liveQueue.status === 'RUNNING';
  
  let breakdown = { new: 0, fu1: 0, fu2: 0, fu3: 0 };
  if (isQueueRunning && liveQueue.breakdown) {
    breakdown = JSON.parse(liveQueue.breakdown);
  }



  return (
    <main>
      <AutoRefresher intervalMs={10000} />
      <nav className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>
          <span style={{ color: 'var(--accent)' }}>ColdFlow</span> Automation
        </h1>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <NotificationBell />

          <a href="/history" style={{ textDecoration: 'none' }}>
            <button className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--glass-border)' }}>Calendar History</button>
          </a>
          <a href="/settings" style={{ textDecoration: 'none' }}>
            <button className="btn-primary" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>Settings</button>
          </a>
        </div>
      </nav>

      <div className="main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 'bold' }}>Dashboard</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '1.1rem' }}>Review your daily queue and manage active strategies.</p>
          </div>
          {!isQueueRunning && <ApproveButton disabled={totalScheduled === 0} totalScheduled={totalScheduled} newLeads={newLeads} fu1={fu1} fu2={fu2} fu3={fu3} />}
        </div>

        <div className="grid">
          {/* Live Queue / Preview Card */}
          <div className="glass-panel" style={{ borderLeft: isQueueRunning ? '4px solid #10b981' : '4px solid #3b82f6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div className="stat-title" style={{ marginBottom: 0 }}>{isQueueRunning ? "LIVE QUEUE" : "Daily Queue Preview"}</div>
              {isQueueRunning && <StopButton />}
            </div>
            
            {isQueueRunning ? (
              <>
                <div className="stat-value">{liveQueue.emailsTotal} <span style={{fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 'normal'}}>Emails Scheduled</span></div>
                
                <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
                    <span style={{ color: 'var(--text-primary)' }}>New</span>
                    <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>{breakdown.new}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
                    <span style={{ color: 'var(--text-primary)' }}>FU1</span>
                    <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>{breakdown.fu1}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
                    <span style={{ color: 'var(--text-primary)' }}>FU2</span>
                    <span style={{ color: '#8b5cf6', fontWeight: 'bold' }}>{breakdown.fu2}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '16px' }}>
                    <span style={{ color: 'var(--text-primary)' }}>FU3</span>
                    <span style={{ color: '#10b981', fontWeight: 'bold' }}>{breakdown.fu3}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Started</span>
                    <span style={{ color: 'white' }}>{new Date(liveQueue.startedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Ends On</span>
                    <span style={{ color: 'white' }}>{new Date(liveQueue.expectedEndTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--glass-border)' }}>
                    {liveQueue.emailsSent >= liveQueue.emailsTotal ? (
                      <span style={{ color: '#10b981', fontWeight: 'bold' }}>Completed</span>
                    ) : (
                      <>
                        <span style={{ color: '#10b981', fontWeight: 'bold' }}>Next Email ({liveQueue.emailsSent + 1} of {liveQueue.emailsTotal})</span>
                      </>
                    )}
                  </div>
                  
                  {/* Progress Bar */}
                  <div style={{ width: '100%', height: '6px', background: 'var(--glass-border)', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
                    <div style={{ width: `${(liveQueue.emailsSent / liveQueue.emailsTotal) * 100}%`, height: '100%', background: '#10b981', transition: 'width 1s ease' }}></div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="stat-value">{totalScheduled} <span style={{fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 'normal'}}>Emails Scheduled</span></div>
                <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {Object.keys(byStrategy).length > 0 ? (
                    Object.keys(byStrategy).map(sName => {
                      const s = byStrategy[sName];
                      const totalForStrategy = s.new + s.fu1 + s.fu2 + s.fu3;
                      if (totalForStrategy === 0) return null;
                      return (
                        <div key={sName} style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #38bdf8' }}>
                          <div style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{sName}</div>
                          {s.new > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '4px', marginBottom: '4px' }}>
                              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>New Leads</span>
                              <span style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: '0.9rem' }}>{s.new}</span>
                            </div>
                          )}
                          {s.fu1 > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '4px', marginBottom: '4px' }}>
                              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Follow-up 1</span>
                              <span style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '0.9rem' }}>{s.fu1}</span>
                            </div>
                          )}
                          {s.fu2 > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '4px', marginBottom: '4px' }}>
                              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Follow-up 2</span>
                              <span style={{ color: '#8b5cf6', fontWeight: 'bold', fontSize: '0.9rem' }}>{s.fu2}</span>
                            </div>
                          )}
                          {s.fu3 > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Follow-up 3</span>
                              <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '0.9rem' }}>{s.fu3}</span>
                            </div>
                          )}
                        </div>
                      )
                    })
                  ) : (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic' }}>No emails scheduled.</div>
                  )}
                </div>
              </>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="glass-panel" style={{ flex: 1 }}>
              <div className="stat-title">Active Strategies</div>
              <div className="stat-value">{activeCount}</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>Syncing Google Sheets perfectly.</p>
            </div>

            <div className="glass-panel" style={{ flex: 1, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <div className="stat-title" style={{ color: '#10b981' }}>Total Replies Detected</div>
              <div className="stat-value" style={{ background: '#10b981', WebkitBackgroundClip: 'text' }}>{totalReplies}</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>Check your Gmail Inbox to respond!</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '56px', marginBottom: '24px' }}>
          <h3 style={{ margin: 0, fontSize: '1.5rem' }}>Active Strategies</h3>
          <a href="/create" style={{ textDecoration: 'none' }}>
            <button className="btn-primary" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid var(--glass-border)' }}>+ Create Strategy</button>
          </a>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {strategies && strategies.length > 0 ? strategies.map((strategy: any) => {
            const p = strategy.progress || { percent: 0, daysLeft: 0, totalSent: 0, maxEmails: 0 };
            return (
              <div key={strategy.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', padding: '24px 32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <div style={{ height: '12px', width: '12px', borderRadius: '50%', background: strategy.status === 'RUNNING' ? '#10b981' : '#f59e0b', boxShadow: `0 0 10px ${strategy.status === 'RUNNING' ? '#10b981' : '#f59e0b'}` }}></div>
                    <div>
                      <h4 style={{ margin: '0 0 6px 0', fontSize: '1.25rem' }}>{strategy.name}</h4>
                      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                        Google Sheet Sync: {strategy.status} | <strong style={{color: 'white'}}>{strategy.activeLeadsCount ?? strategy._count?.leads ?? 0} Total Leads Imported</strong>
                        <br/>
                        <span style={{ color: '#38bdf8' }}>Sender Account: </span> <strong style={{ color: 'white' }}>{strategy.emailAccount?.emailAddress || 'Default (Global Settings)'}</strong>
                      </p>
                    </div>
                  </div>
                  <a href={`/strategy/${strategy.id}`} style={{ textDecoration: 'none' }}>
                    <button className="btn-outline">Manage Strategy</button>
                  </a>
                </div>
                
                {/* Timeline Progress Bar (HIGHLIGHTED) */}
                <div style={{ marginTop: '24px', padding: '24px', background: 'linear-gradient(145deg, rgba(30,41,59,0.5) 0%, rgba(15,23,42,0.8) 100%)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }}></div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981', animation: 'pulse 2s infinite' }}></div>
                      <span style={{ color: 'white', fontWeight: 600, fontSize: '1.1rem', letterSpacing: '0.5px' }}>Campaign Timeline</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ color: '#34d399', fontWeight: 'bold', fontSize: '1.1rem' }}>{p.daysLeft} Days</span> <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Left</span>
                    </div>
                  </div>

                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                      <span style={{ color: '#34d399', letterSpacing: '1px' }}>START</span>
                      <span style={{ color: '#34d399', letterSpacing: '1px' }}>FINISH</span>
                    </div>
                    <div style={{ width: '100%', height: '14px', background: 'rgba(0,0,0,0.6)', borderRadius: '7px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)' }}>
                      <div style={{ 
                        width: `${Math.max(1, p.percent)}%`, 
                        height: '100%', 
                        background: 'linear-gradient(90deg, #059669, #10b981, #34d399)', 
                        borderRadius: '7px', 
                        transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 0 10px rgba(16, 185, 129, 0.5)'
                      }}></div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '0.9rem' }}>
                      <span style={{ color: '#94a3b8' }}><strong style={{color: 'white'}}>{p.percent}%</strong> Completed</span>
                      <span style={{ color: '#94a3b8' }}><strong style={{color: 'white'}}>{p.totalSent}</strong> of {p.maxEmails} Emails Sent</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '48px' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>No strategies created yet. Click "+ Create Strategy" to begin.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
