import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { MenuItem } from '../menu/entities/menu-item.entity';
import { Order } from '../orders/entities/order.entity';
import { User } from '../users/entities/user.entity';

const logger = new Logger('DatabaseModule');

function isEnabled(value?: string) {
  return ['1', 'true', 'yes', 'on'].includes((value || '').toLowerCase());
}

function requireConfig(config: ConfigService, key: string) {
  const value = config.get<string>(key);
  if (!value) {
    throw new Error(`${key} is required when DB_TYPE=postgres`);
  }
  return value;
}

@Module({
  imports: [
    ConfigModule, // ensures ConfigService provider exists in case module is used standalone
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const dbType = (config.get<string>('DB_TYPE') || 'postgres').toLowerCase() === 'sqlite' ? 'sqlite' : 'postgres';
        const isPostgres = dbType === 'postgres';

        const nodeEnv = config.get<string>('NODE_ENV') || 'development';
        const common = {
          entities: [MenuItem, Order, User],
          synchronize: nodeEnv !== 'production',
          logging: nodeEnv === 'development',
          migrations: ['dist/database/migrations/*{.js,.ts}'],
          migrationsRun: isEnabled(config.get<string>('DB_MIGRATIONS_RUN')),
        };

        if (!isPostgres) {
          const dbPath = config.get<string>('DB_PATH') || './coffee.db';
          logger.log(`[DB] type=sqlite database=${dbPath} nodeEnv=${nodeEnv}`);
          return {
            ...common,
            type: 'sqlite',
            database: dbPath,
          } satisfies TypeOrmModuleOptions;
        }

        const databaseUrl = config.get<string>('DATABASE_URL') || config.get<string>('DB_URL');
        const sslEnabled = config.get<string>('DB_SSL') !== 'false';

        if (databaseUrl) {
          logger.log(`[DB] type=postgres url=provided ssl=${sslEnabled} nodeEnv=${nodeEnv}`);
          return {
            ...common,
            type: 'postgres',
            url: databaseUrl,
            ssl: sslEnabled ? { rejectUnauthorized: false } : false,
            extra: sslEnabled ? { ssl: { rejectUnauthorized: false } } : undefined,
          } satisfies TypeOrmModuleOptions;
        }

        const host = requireConfig(config, 'DB_HOST').replace(/^https?:\/\//, '').replace(/\/$/, '');
        const database = requireConfig(config, 'DB_NAME');
        const username = requireConfig(config, 'DB_USER');
        const password = requireConfig(config, 'DB_PASSWORD');
        const port = Number(config.get<string>('DB_PORT') || 5432);

        logger.log(`[DB] type=postgres host=${host} port=${port} database=${database} ssl=${sslEnabled} nodeEnv=${nodeEnv}`);

        return {
          ...common,
          type: 'postgres',
          host,
          port,
          database,
          username,
          password,
          ssl: sslEnabled ? { rejectUnauthorized: false } : false,
          extra: sslEnabled ? { ssl: { rejectUnauthorized: false } } : undefined,
        } satisfies TypeOrmModuleOptions;
      },
    }),
  ],
})
export class DatabaseModule {}
