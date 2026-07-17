import jwt from 'jsonwebtoken';

import { authLobbyEnv } from '../config/env';
import { UsersRepository } from '../repositories/users.repository';
import type { AuthSession, GitHubProfile, GoogleProfile, JwtClaims } from '../contracts';

export class AuthService {
  private readonly usersRepository = new UsersRepository();

  buildGithubAuthorizeUrl(state: string): string {
    const url = new URL('https://github.com/login/oauth/authorize');
    url.searchParams.set('client_id', authLobbyEnv.githubClientId);
    url.searchParams.set('redirect_uri', authLobbyEnv.githubCallbackUrl);
    url.searchParams.set('scope', 'read:user user:email');
    url.searchParams.set('state', state);
    return url.toString();
  }

  async authenticateGitHubUser(profile: GitHubProfile): Promise<AuthSession> {
    const user = await this.usersRepository.upsertGitHubUser(profile);
    const token = this.issueToken({ userId: user.id, username: user.username });

    return {
      userId: user.id,
      token,
    };
  }

  issueToken(claims: JwtClaims): string {
    return jwt.sign(claims, authLobbyEnv.jwtSecret, { expiresIn: '12h' });
  }

  verifyToken(token: string): JwtClaims {
    return jwt.verify(token, authLobbyEnv.jwtSecret) as JwtClaims;
  }

  async exchangeGithubCode(code: string): Promise<AuthSession> {
    console.log('[OAuth] Exchanging code for access token...');
    const accessToken = await this.fetchGithubAccessToken(code);
    console.log('[OAuth] Access token obtained, fetching profile...');
    const profile = await this.fetchGithubProfile(accessToken);
    console.log('[OAuth] Profile fetched:', profile.username, '- authenticating...');
    return this.authenticateGitHubUser(profile);
  }

  private async fetchGithubAccessToken(code: string): Promise<string> {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: authLobbyEnv.githubClientId,
        client_secret: authLobbyEnv.githubClientSecret,
        code,
        redirect_uri: authLobbyEnv.githubCallbackUrl,
      }),
    });

    const payload = (await response.json()) as { access_token?: string; error?: string; error_description?: string };

    if (payload.error || !payload.access_token) {
      const errorMessage = payload.error_description ?? payload.error ?? 'GitHub token exchange failed.';
      console.error('[OAuth] Token exchange error:', errorMessage);
      throw new Error(errorMessage);
    }

    return payload.access_token;
  }

  private async fetchGithubProfile(accessToken: string): Promise<GitHubProfile> {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${accessToken}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!response.ok) {
      throw new Error('GitHub profile lookup failed.');
    }

    const payload = (await response.json()) as { id: number; login: string; avatar_url: string; name: string | null };

    return {
      githubId: String(payload.id),
      username: payload.login,
      avatarUrl: payload.avatar_url,
      displayName: payload.name ?? payload.login,
    };
  }

  buildGoogleAuthorizeUrl(state: string): string {
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', authLobbyEnv.googleClientId);
    url.searchParams.set('redirect_uri', authLobbyEnv.googleCallbackUrl);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('state', state);
    url.searchParams.set('access_type', 'offline');
    return url.toString();
  }

  async exchangeGoogleCode(code: string): Promise<AuthSession> {
    console.log('[OAuth] Exchanging code for Google access token...');
    const accessToken = await this.fetchGoogleAccessToken(code);
    console.log('[OAuth] Google access token obtained, fetching profile...');
    const profile = await this.fetchGoogleProfile(accessToken);
    console.log('[OAuth] Google profile fetched:', profile.username, '- authenticating...');
    return this.authenticateGoogleUser(profile);
  }

  async authenticateGoogleUser(profile: GoogleProfile): Promise<AuthSession> {
    const user = await this.usersRepository.upsertGoogleUser(profile);
    const token = this.issueToken({ userId: user.id, username: user.username });

    return {
      userId: user.id,
      token,
    };
  }

  private async fetchGoogleAccessToken(code: string): Promise<string> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: authLobbyEnv.googleClientId,
        client_secret: authLobbyEnv.googleClientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: authLobbyEnv.googleCallbackUrl,
      }),
    });

    const payload = (await response.json()) as { access_token?: string; error?: string; error_description?: string };

    if (payload.error || !payload.access_token) {
      const errorMessage = payload.error_description ?? payload.error ?? 'Google token exchange failed.';
      console.error('[OAuth] Google token exchange error:', errorMessage);
      throw new Error(errorMessage);
    }

    return payload.access_token;
  }

  private async fetchGoogleProfile(accessToken: string): Promise<GoogleProfile> {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Google profile lookup failed.');
    }

    const payload = (await response.json()) as { sub: string; email: string; name: string; picture: string; given_name: string };

    return {
      googleId: payload.sub,
      email: payload.email,
      username: payload.email.split('@')[0] ?? `user-${payload.sub.slice(0, 5)}`,
      avatarUrl: payload.picture,
      displayName: payload.name,
    };
  }
}

export const authService = new AuthService();
