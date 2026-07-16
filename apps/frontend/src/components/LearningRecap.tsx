import React, { useEffect, useState } from 'react';
import { getPlayerRecap } from '../api';

export function LearningRecap({ matchId, currentUser, fallbackRecap }: { matchId: string; currentUser?: any; fallbackRecap?: any }) {
  const [recap, setRecap] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!matchId || !currentUser?.id) {
      setLoading(false);
      return;
    }
    getPlayerRecap(matchId, currentUser.id)
      .then(setRecap)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [matchId, currentUser]);

  if (loading) {
    return <div style={{ padding: '48px', textAlign: 'center' }}>Analyzing match performance...</div>;
  }

  const data = recap || fallbackRecap?.aiRecap || {
    overallNarrative: fallbackRecap?.learningRecap || 'No recap available.',
    performanceScore: 0,
    conceptsLearned: [],
    conceptsToReview: [],
    hardestFault: { title: 'N/A', explanation: 'N/A', codeBeforeAndAfter: '' },
    detailedTaskBreakdown: [],
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div className="surface" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p className="kicker">Match #1249 · 12M 41S · JS/TS Bugs Vol. 3</p>
          <h1 style={{ margin: '8px 0 0 0' }}>Learning Recap</h1>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="button ghost">Save to Learn</button>
          <button className="button ghost">Share</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', overflowX: 'auto', paddingBottom: '8px' }}>
        <button className="button dark">You</button>
        <button className="button ghost">@octoplayer</button>
        <button className="button ghost">@debugbird</button>
        <button className="button ghost">@mergequeen</button>
        <button className="button ghost">@null_ninja</button>
        <button className="button ghost">@hex_wizard</button>
        <button className="button ghost">@semver_sam</button>
      </div>

      <div className="recap-grid">
        {/* Left Sidebar - Performance */}
        <div>
          <div className="surface">
            <p className="kicker" style={{ marginBottom: '24px' }}>Performance</p>
            <div className="score-box">
              <h2>{data.performanceScore ?? 0}</h2>
              <div style={{ marginTop: '16px', fontWeight: 600 }}>Performance Score</div>
            </div>

            <div style={{ marginTop: '24px', fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-muted)' }}>
              {data.overallNarrative}
            </div>
          </div>
        </div>

        {/* Right Content Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div className="surface">
              <p className="kicker">Tasks Overview</p>
              <div className="task-list">
                {data.detailedTaskBreakdown?.map((t: any, i: number) => (
                  <div key={i} className={`task-item ${t.playerAction === 'completed' ? 'correct' : t.playerAction === 'failed' ? 'incorrect' : ''}`}>
                    <span>{t.playerAction === 'completed' ? '✓' : t.playerAction === 'failed' ? '✕' : '−'}</span>
                    <div>
                      <div style={{ color: 'var(--text-primary)' }}>{t.taskTitle}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{t.feedback}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="surface">
              <p className="kicker" style={{ marginBottom: '16px' }}>Concepts Learned</p>
              <div style={{ marginBottom: '24px' }}>
                {data.conceptsLearned?.map((c: string, i: number) => (
                  <span key={i} className="concept-tag" style={{ borderColor: 'var(--success-color)' }}>#{c}</span>
                ))}
                {(!data.conceptsLearned || data.conceptsLearned.length === 0) && <div className="muted">None this match.</div>}
              </div>

              <p className="kicker" style={{ marginBottom: '16px', color: 'var(--danger-color)' }}>Concepts to Review</p>
              <div>
                {data.conceptsToReview?.map((c: string, i: number) => (
                  <span key={i} className="concept-tag" style={{ borderColor: 'var(--danger-color)' }}>#{c}</span>
                ))}
                {(!data.conceptsToReview || data.conceptsToReview.length === 0) && <div className="muted">None! Great job.</div>}
              </div>
            </div>
          </div>

          <div className="surface">
            <p className="kicker" style={{ marginBottom: '16px' }}>Hardest Fault: {data.hardestFault?.title}</p>
            <p style={{ marginBottom: '16px', color: 'var(--text-muted)' }}>
              {data.hardestFault?.explanation}
            </p>
            {data.hardestFault?.codeBeforeAndAfter && (
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '6px', border: '1px solid var(--border-color)', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                {data.hardestFault.codeBeforeAndAfter}
              </div>
            )}
          </div>

        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
        <button className="button ghost" onClick={() => window.location.assign('/dashboard')}>← Return to dashboard</button>
        <div className="muted" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--border-color)', display: 'grid', placeItems: 'center' }}>P1</div>
          RECAP GENERATED FOR @OCTOPLAYER
        </div>
      </div>
    </div>
  );
}
