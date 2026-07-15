import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';

import {
  createLobby,
  getCurrentUser,
  getLobby,
  getMatch,
  joinLobby,
  leaveLobby,
  loginWithGitHub,
  logout,
  setReady,
  startLobby,
  startMatch,
  submitTask,
} from './api';
import { clearToken, getToken, setToken } from './auth';
import { getGameSocket, resetGameSocket } from './socket';
import type { MatchInitializationResponse, MatchStateDto, TaskSubmissionResponse } from './types';

// New UI Components
import { DiffReview } from './components/DiffReview';
import { EmergencyMeeting } from './components/EmergencyMeeting';
import { VotingResult } from './components/VotingResult';
import { GameOver } from './components/GameOver';
import { LearningRecap } from './components/LearningRecap';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { CreateLobbyPage } from './pages/CreateLobbyPage';
import { LobbyPage } from './pages/LobbyPage';
import { MatchPage } from './pages/MatchPage';

export type CurrentUser = Awaited<ReturnType<typeof getCurrentUser>>['user'];

function useAuthState() {
  const [token, setTokenState] = useState<string | null>(getToken());
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    let active = true;

    async function loadUser() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const current = await getCurrentUser();
        if (active) {
          setUser(current.user);
        }
      } catch {
        clearToken();
        if (active) {
          setTokenState(null);
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      active = false;
    };
  }, [token]);

  return {
    token,
    user,
    loading,
    login() {
      loginWithGitHub();
    },
    async signOut() {
      await logout().catch(() => null);
      clearToken();
      resetGameSocket();
      setTokenState(null);
      setUser(null);
    },
    setUser,
  };
}

function AppShell() {
  const auth = useAuthState();

  if (auth.loading) {
    return <div className="app-shell"><div className="frame"><div className="loading">Loading...</div></div></div>;
  }

  return (
    <div className="app-shell">
      <SiteHeader isAuthed={Boolean(auth.token)} onLogout={auth.signOut} />
      <main className="frame">
        <Routes>
          <Route path="/" element={<LandingPage isAuthed={Boolean(auth.token)} />} />
          <Route path="/login" element={<LoginPage onLogin={auth.login} isAuthed={Boolean(auth.token)} />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/dashboard" element={<RequireAuth token={auth.token} user={auth.user}><DashboardPage user={auth.user} /></RequireAuth>} />
          <Route path="/lobbies/new" element={<RequireAuth token={auth.token} user={auth.user}><CreateLobbyPage /></RequireAuth>} />
          <Route path="/lobbies/:lobbyId" element={<RequireAuth token={auth.token} user={auth.user}><LobbyPage currentUserId={auth.user?.id ?? ''} /></RequireAuth>} />
          <Route path="/matches/:matchId" element={<RequireAuth token={auth.token} user={auth.user}><MatchPage currentUserId={auth.user?.id ?? ''} /></RequireAuth>} />
          <Route path="/test/diff" element={<DiffReview />} />
          <Route path="/test/meeting" element={<EmergencyMeeting />} />
          <Route path="/test/voting" element={<VotingResult />} />
          <Route path="/test/gameover" element={<GameOver />} />
          <Route path="/test/recap" element={<LearningRecap />} />
          <Route path="*" element={<Navigate to={auth.token ? '/dashboard' : '/'} replace />} />
        </Routes>
      </main>
    </div>
  );
}

function SiteHeader({ isAuthed, onLogout }: { isAuthed: boolean; onLogout: () => Promise<void> }) {
  return (
    <header className="topbar">
      <Link to="/" className="brand">
        <span className="brand-mark" />
        <span>GitGud</span>
      </Link>
      <nav className="topnav">
        <Link to="/">Home</Link>
        <Link to="/dashboard">Dashboard</Link>
        {isAuthed ? (
          <button className="text-button" onClick={onLogout}>Logout</button>
        ) : (
          <Link to="/login" className="text-button">Login</Link>
        )}
      </nav>
    </header>
  );
}

function RequireAuth({ token, user, children }: { token: string | null; user: CurrentUser | null; children: React.ReactNode }) {
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function LandingPage({ isAuthed }: { isAuthed: boolean }) {
  return (
    <div className="landing">
      <section className="hero-panel">
        <p className="kicker">Multiplayer social deduction for devs</p>
        <h1>Minimal frontend. Real API calls. One working slice.</h1>
        <p className="muted">Login, create or join a lobby, start a match, then submit a task and read the review agent response.</p>
        <div className="actions">
          <Link to={isAuthed ? '/dashboard' : '/login'} className="button">{isAuthed ? 'Open dashboard' : 'Login with GitHub'}</Link>
          <Link to="/dashboard" className="button ghost">Dashboard</Link>
        </div>
      </section>

      <aside className="preview-panel" aria-hidden="true">
        <div className="preview-box">Landing preview</div>
      </aside>
    </div>
  );
}

function LoginPage({ onLogin, isAuthed }: { onLogin: () => void; isAuthed: boolean }) {
  const navigate = useNavigate();

  if (isAuthed) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <p className="kicker">Authentication</p>
        <h2>Sign in to GitGud</h2>
        <p className="muted">Use GitHub OAuth or the existing auth flow, then JWT is stored locally and attached automatically.</p>
        <button className="button dark" onClick={onLogin}>Continue with GitHub</button>
      </div>
      <div className="preview-panel small" aria-hidden="true">
        <div className="preview-box">OAuth consent preview</div>
      </div>
    </div>
  );
}

function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const url = new URL(window.location.href);
    const token = url.searchParams.get('token');

    if (token) {
      setToken(token);
      window.location.assign('/dashboard');
      return;
    }

    navigate('/login', { replace: true });
  }, [navigate]);

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <p className="kicker">Authentication</p>
        <h2>Completing login</h2>
        <p className="muted">Finalizing the GitHub OAuth callback.</p>
      </div>
    </div>
  );
}

// Extracted to src/pages/

export default function App() {
  return <AppShell />;
}