import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

import { authLobbyEnv } from '../config/env';
import { authService } from '../services/auth.service';
import { UsersRepository } from '../repositories/users.repository';
import type { CurrentUserResponse } from '../contracts';

const usersRepository = new UsersRepository();

export class AuthController {
  githubStart(_request: Request, response: Response) {
    const state = randomUUID();
    return response.redirect(authService.buildGithubAuthorizeUrl(state));
  }

  async githubCallback(request: Request, response: Response) {
    const code = typeof request.query.code === 'string' ? request.query.code : null;

    if (!code) {
      return response.status(400).send('Missing GitHub OAuth code.');
    }

    const session = await authService.exchangeGithubCode(code);
    const redirectUrl = new URL('/auth/callback', authLobbyEnv.frontendUrl);
    redirectUrl.searchParams.set('token', session.token);
    redirectUrl.searchParams.set('userId', session.userId);

    return response.redirect(redirectUrl.toString());
  }

  async me(request: Request, response: Response) {
    try {
      const claims = request.auth;
      if (!claims) {
        return response.status(401).json({ message: 'Unauthorized' });
      }

      const user = await usersRepository.findById(claims.userId);

      if (!user) {
        return response.status(404).json({ message: 'User not found.' });
      }

      const payload: CurrentUserResponse = { user, claims };
      return response.status(200).json(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unauthorized';
      return response.status(401).json({ message });
    }
  }
  async myMatches(request: Request, response: Response) {
    try {
      const claims = request.auth;
      if (!claims) {
        return response.status(401).json({ message: 'Unauthorized' });
      }

      const matches = await usersRepository.listRecentMatches(claims.userId);
      return response.status(200).json(matches);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list matches.';
      return response.status(400).json({ message });
    }
  }
}

export const authController = new AuthController();
