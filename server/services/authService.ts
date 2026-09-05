import { User } from '../types/index.ts';
import { postgresService } from './postgresService.ts';
import { logger } from './logger.ts';

export interface AuthTokenPayload {
  userId: string;
  email: string;
  level: string;
  issuedAt: number;
  expiresAt: number;
}

class AuthService {
  // Simple HMAC-like token signer for sandbox environments without external secret dependencies
  private secret = process.env.JWT_SECRET || 'nederlands-tutor-jwt-secret-b1b2';

  public generateToken(user: User): string {
    const payload: AuthTokenPayload = {
      userId: user.id,
      email: user.email,
      level: user.level,
      issuedAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = Buffer.from(`${encodedPayload}.${this.secret}`).toString('base64url');
    return `${encodedPayload}.${signature}`;
  }

  public verifyToken(token: string): AuthTokenPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 2) return null;
      const [encodedPayload, signature] = parts;
      const expectedSig = Buffer.from(`${encodedPayload}.${this.secret}`).toString('base64url');
      if (signature !== expectedSig) return null;

      const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as AuthTokenPayload;
      if (Date.now() > payload.expiresAt) {
        return null; // Expired
      }
      return payload;
    } catch {
      return null;
    }
  }

  public async loginWithProvider(provider: 'github' | 'google', profile: { id: string; email: string; name: string; avatarUrl?: string }): Promise<{ user: User; token: string }> {
    const user = await postgresService.upsertUser({
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
      provider,
      providerId: `${provider}_${profile.id}`,
    });

    const token = this.generateToken(user);
    logger.info('User successfully authenticated via OAuth 2.0', {
      userId: user.id,
      provider,
      email: user.email,
    });

    return { user, token };
  }
}

export const authService = new AuthService();
