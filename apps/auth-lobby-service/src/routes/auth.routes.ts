import { Router } from 'express';

import { authController } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';

export const authRouter = Router();

authRouter.get('/github/start', (request, response) => authController.githubStart(request, response));
authRouter.get('/github/callback', (request, response) => authController.githubCallback(request, response));
authRouter.post('/logout', (_request, response) => response.status(200).json({ ok: true }));
authRouter.get('/me', requireAuth, (request, response) => authController.me(request, response));
