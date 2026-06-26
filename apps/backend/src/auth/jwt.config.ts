import { ConfigService } from '@nestjs/config';

export function getJwtSecret(config?: ConfigService) {
  const secret = config?.get<string>('JWT_SECRET') || process.env.JWT_SECRET;
  const nodeEnv = config?.get<string>('NODE_ENV') || process.env.NODE_ENV;

  if (!secret && nodeEnv === 'production') {
    throw new Error('JWT_SECRET must be set in production');
  }

  return secret || 'dev-secret-change-me';
}
