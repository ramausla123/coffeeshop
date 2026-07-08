import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger, ValidationPipe } from '@nestjs/common';
import { Server } from 'socket.io';
import { OrdersGateway } from './orders/orders.gateway';
import type { Request, Response, NextFunction } from 'express';

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

@Catch()
class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = exception instanceof HttpException ? exception.getResponse() : 'Internal server error';

    if (status >= 500) {
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(`Client error on ${request.method} ${request.url}: ${JSON.stringify(message)}`);
    }

    response.status(status).json({
      statusCode: status,
      message: typeof message === 'string' ? message : (message as { message?: string }).message || 'Internal server error',
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}

function validateProductionEnvironment() {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const missing: string[] = [];

  if (!process.env.JWT_SECRET) {
    missing.push('JWT_SECRET');
  }

  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL || process.env.DB_URL);
  const hasDatabaseConfig = Boolean(process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD && process.env.DB_NAME);
  if (!hasDatabaseUrl && !hasDatabaseConfig) {
    missing.push('DATABASE_URL or DB_HOST/DB_USER/DB_PASSWORD/DB_NAME');
  }

  if (!process.env.DEFAULT_ADMIN_PASSWORD || !process.env.DEFAULT_KITCHEN_PASSWORD || !process.env.DEFAULT_CASHIER_PASSWORD) {
    missing.push('DEFAULT_ADMIN_PASSWORD, DEFAULT_KITCHEN_PASSWORD, DEFAULT_CASHIER_PASSWORD');
  }

  if (missing.length > 0) {
    throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
  }
}

function getCorsOrigins() {
  const configuredOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (process.env.NODE_ENV !== 'production') {
    configuredOrigins.push('http://localhost:3000', 'http://127.0.0.1:3000');
  }

  return Array.from(new Set(configuredOrigins));
}

function applyRateLimiting(app: any) {
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60000);
  const maxRequests = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 120);

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/health') {
      return next();
    }

    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = rateLimitStore.get(ip);

    if (!entry || entry.resetAt <= now) {
      rateLimitStore.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (entry.count >= maxRequests) {
      return res.status(429).json({
        statusCode: 429,
        message: 'Too many requests',
        retryAfterMs: entry.resetAt - now,
      });
    }

    entry.count += 1;
    return next();
  });
}

async function bootstrap() {
  validateProductionEnvironment();

  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: getCorsOrigins(),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  applyRateLimiting(app);

  const port = Number(process.env.PORT || 4000);

  // Attach Socket.io to the same HTTP server. Most deployment platforms expose
  // one port per service, so HTTP and realtime traffic should share it.
  const ordersGateway = app.get(OrdersGateway);
  const server = new Server(app.getHttpServer(), {
    cors: {
      origin: getCorsOrigins(),
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });
  ordersGateway.setServer(server);

  await app.listen(port);
  console.log(`Backend running on http://localhost:${port}`);
  console.log(`WebSocket server attached to http://localhost:${port}`);
}

bootstrap();
