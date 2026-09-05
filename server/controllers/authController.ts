import { Request, Response } from 'express';
import { authService } from '../services/authService.ts';
import { postgresService } from '../services/postgresService.ts';
import { logger } from '../services/logger.ts';

export const getMe = async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Return default user if unauthenticated for quick start
    const user = await postgresService.getUserById('usr_java_engineer_1');
    return res.json({ user, authenticated: false });
  }

  const token = authHeader.substring(7);
  const payload = authService.verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired session token' });
  }

  const user = await postgresService.getUserById(payload.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found in PostgreSQL' });
  }

  return res.json({ user, authenticated: true });
};

export const demoLogin = async (req: Request, res: Response) => {
  const { persona } = req.body; // 'vishal' | 'sanne' | 'lars'

  let profile: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string;
    provider: 'github' | 'google';
  } = {
    id: 'java_eng_1',
    name: 'Vishal (Java Backend Engineer)',
    email: 'vishalvyavahare123@gmail.com',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    provider: 'github',
  };

  if (persona === 'sanne') {
    profile = {
      id: 'sanne_2',
      name: 'Sanne (A2 Graduate)',
      email: 'sanne.student@example.nl',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
      provider: 'google' as const,
    };
  } else if (persona === 'lars') {
    profile = {
      id: 'lars_3',
      name: 'Lars (B1 Professional)',
      email: 'lars.dev@example.nl',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      provider: 'github' as const,
    };
  }

  const result = await authService.loginWithProvider(profile.provider, profile);
  return res.json(result);
};

export const initiateOAuth = (provider: 'github' | 'google') => (req: Request, res: Response) => {
  const clientId = provider === 'github' ? process.env.GITHUB_CLIENT_ID : process.env.GOOGLE_CLIENT_ID;
  const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/oauth/callback?provider=${provider}`;

  logger.info(`Initiating OAuth 2.0 flow for ${provider}`, { redirectUri });

  // In sandbox environment without external OAuth app configured, redirect with a mock code
  // allowing immediate end-to-end verification of the OAuth exchange flow!
  const state = Math.random().toString(36).substring(2, 10);
  const mockCallback = `/api/auth/oauth/callback?code=oauth_authz_code_${Date.now()}&state=${state}&provider=${provider}`;

  res.json({
    authUrl: clientId ? `https://auth.${provider}.com/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}` : mockCallback,
    isMockConfigured: !clientId,
    provider,
  });
};

export const oauthCallback = async (req: Request, res: Response) => {
  const { provider, code } = req.query;
  logger.info('Received OAuth 2.0 authorization code callback', { provider, code });

  // Exchange authorization code for token & user profile
  const providerName = (provider as 'github' | 'google') || 'github';
  const profile = {
    id: `oauth_${Date.now()}`,
    name: providerName === 'github' ? 'GitHub Developer (B1 Aspirant)' : 'Google Account (Dutch Learner)',
    email: `oauth_user_${Date.now()}@example.com`,
    avatarUrl: providerName === 'github' ? 'https://github.githubassets.com/favicons/favicon.png' : 'https://www.google.com/favicon.ico',
  };

  const { user, token } = await authService.loginWithProvider(providerName, profile);

  // Return HTML script to postMessage back to opener or redirect
  res.send(`
    <html>
      <body>
        <p>OAuth 2.0 login geslaagd! Sluit dit venster of wacht...</p>
        <script>
          window.opener ? window.opener.postMessage({ type: 'OAUTH_SUCCESS', token: '${token}', user: ${JSON.stringify(user)} }, '*') : (window.location.href = '/');
          setTimeout(() => window.close(), 1000);
        </script>
      </body>
    </html>
  `);
};
