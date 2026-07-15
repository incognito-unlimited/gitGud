import React from 'react';
import { Link } from 'react-router-dom';
import type { CurrentUser } from '../App'; // We will export this type from App.tsx or types.ts later, for now we will just use the one from types or any

interface DashboardPageProps {
  user: any; // We'll refine this when we refactor App.tsx
}

export function DashboardPage({ user }: DashboardPageProps) {
  return (
    <div className="dashboard-grid">
      {/* Left Sidebar - Navigation */}
      <nav className="dashboard-nav surface">
        <Link to="/dashboard" className="nav-item active">Home</Link>
        <Link to="#" className="nav-item">Play</Link>
        <Link to="#" className="nav-item">Learn</Link>
        <Link to="#" className="nav-item">Leaderboard</Link>
        <Link to="#" className="nav-item">Settings</Link>
      </nav>

      {/* Main Content Area */}
      <div className="dashboard-main" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Top Bar: Search & Profile */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px 24px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, maxWidth: '400px' }}>
            <span style={{ color: 'var(--accent-color)' }}>🔍</span>
            <input type="text" placeholder="Search rooms, players, tasks..." style={{ margin: 0, border: 'none', background: 'transparent', flex: 1, padding: '4px', outline: 'none', boxShadow: 'none' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '32px', height: '32px', border: '1px solid var(--border-color)', borderRadius: '4px' }}></div>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'grid', placeItems: 'center', fontSize: '0.9rem', border: '1px solid var(--border-color)' }}>
              {user?.displayName?.[0] ?? 'P0'}
            </div>
          </div>
        </div>

        {/* Top Row: Profile & Quick Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px' }}>
          
          <div className="surface" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'grid', placeItems: 'center', fontSize: '1.2rem' }}>
                {user?.displayName?.[0] ?? 'P0'}
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{user?.displayName ?? '@octoplayer'}</h2>
                <div className="kicker" style={{ marginTop: '4px' }}>RANK: RUBBER DUCK · LV 4</div>
              </div>
            </div>
            
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                <span className="muted">XP</span>
                <span>1,240 / 2,000</span>
              </div>
              <div className="tally-bar-bg" style={{ height: '8px' }}>
                <div className="tally-bar-fill" style={{ width: '62%' }} />
              </div>
            </div>
          </div>

          <div className="surface" style={{ display: 'flex', flexDirection: 'column' }}>
            <p className="kicker" style={{ marginBottom: '16px' }}>Quick Actions</p>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <Link to="/lobbies/new" className="button dark">+ Create Lobby</Link>
              <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                <input type="text" placeholder="ROOM CODE" style={{ margin: 0, flex: 1 }} />
                <button className="button ghost">Join</button>
              </div>
              <button className="button ghost">Quick match</button>
            </div>
            
            {/* Added debug links here for convenience */}
            <p className="kicker" style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>Debug Previews</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
              <Link to="/test/diff" className="text-button">Diff</Link>
              <Link to="/test/meeting" className="text-button">Meeting</Link>
              <Link to="/test/voting" className="text-button">Voting</Link>
              <Link to="/test/gameover" className="text-button">GameOver</Link>
              <Link to="/test/recap" className="text-button">Recap</Link>
            </div>
          </div>

        </div>

        {/* Stats Row */}
        <div className="mini-grid compact">
          <div className="surface stat" style={{ alignItems: 'flex-start', padding: '16px 24px' }}>
            <span className="kicker">Win Rate</span>
            <span className="stat-value" style={{ marginTop: '8px' }}>62%</span>
          </div>
          <div className="surface stat" style={{ alignItems: 'flex-start', padding: '16px 24px' }}>
            <span className="kicker">Bugs Found</span>
            <span className="stat-value" style={{ marginTop: '8px' }}>48</span>
          </div>
          <div className="surface stat" style={{ alignItems: 'flex-start', padding: '16px 24px' }}>
            <span className="kicker">Bugs Shipped (As Imposter)</span>
            <span className="stat-value" style={{ marginTop: '8px' }}>12</span>
          </div>
          <div className="surface stat" style={{ alignItems: 'flex-start', padding: '16px 24px' }}>
            <span className="kicker">Avg Score</span>
            <span className="stat-value" style={{ marginTop: '8px' }}>820</span>
          </div>
        </div>

        {/* Bottom Row: Matches & Rooms */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
          
          <div className="surface">
            <p className="kicker" style={{ marginBottom: '16px' }}>Recent Matches</p>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Match</th>
                  <th>Role</th>
                  <th>Result</th>
                  <th>Score</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>#1249</td>
                  <td>Crewmate</td>
                  <td>Win</td>
                  <td>930</td>
                  <td><Link to="/test/recap" className="text-button">View recap →</Link></td>
                </tr>
                <tr>
                  <td>#1248</td>
                  <td>Imposter</td>
                  <td>Loss</td>
                  <td>610</td>
                  <td><Link to="/test/recap" className="text-button">View recap →</Link></td>
                </tr>
                <tr>
                  <td>#1247</td>
                  <td>Crewmate</td>
                  <td>Win</td>
                  <td>780</td>
                  <td><Link to="/test/recap" className="text-button">View recap →</Link></td>
                </tr>
                <tr>
                  <td>#1246</td>
                  <td>Crewmate</td>
                  <td>Loss</td>
                  <td>420</td>
                  <td><Link to="/test/recap" className="text-button">View recap →</Link></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="surface">
            <p className="kicker" style={{ marginBottom: '16px' }}>Public Rooms</p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input type="text" placeholder="Filter..." style={{ margin: 0, flex: 1 }} />
              <button className="button ghost">New</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="room-card">
                <div>
                  <strong>react-refactor-#A2F</strong>
                  <div className="muted" style={{ fontSize: '0.8rem', marginTop: '4px' }}>EASY · 6/8 PLAYERS</div>
                </div>
                <button className="button ghost">Join</button>
              </div>
              <div className="room-card">
                <div>
                  <strong>ts-bugs-#K91</strong>
                  <div className="muted" style={{ fontSize: '0.8rem', marginTop: '4px' }}>MEDIUM · 4/9 PLAYERS</div>
                </div>
                <button className="button ghost">Join</button>
              </div>
              <div className="room-card">
                <div>
                  <strong>api-integration-#Q4Z</strong>
                  <div className="muted" style={{ fontSize: '0.8rem', marginTop: '4px' }}>HARD · 7/8 PLAYERS</div>
                </div>
                <button className="button ghost">Join</button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
