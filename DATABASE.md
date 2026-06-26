# Database Setup

## Supabase/Postgres

The backend uses TypeORM with Supabase Postgres by default. Use the direct database connection settings from Supabase Project Settings > Database.

Create `apps/backend/.env` from `apps/backend/.env.example`:

```env
NODE_ENV=development
DB_TYPE=postgres

# Option A: Supabase connection string
# DATABASE_URL=postgresql://postgres:your-database-password@db.your-project-ref.supabase.co:5432/postgres

# Option B: connection parts
DB_HOST=db.your-project-ref.supabase.co
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your-database-password
DB_NAME=postgres
DB_SSL=true
DB_MIGRATIONS_RUN=false
JWT_SECRET=change-this-secret-to-a-long-random-string
DEFAULT_ADMIN_PASSWORD=change-admin-password
DEFAULT_KITCHEN_PASSWORD=change-kitchen-password
DEFAULT_CASHIER_PASSWORD=change-cashier-password
WS_PORT=4002
```

`DB_HOST` should be the database hostname, not the Supabase REST/API URL. The backend strips `https://` defensively, but the clean value should look like `db.your-project-ref.supabase.co`. If DNS cannot resolve the direct host, use the connection string or pooler host shown in Supabase Project Settings > Database.

## Development Schema

When `NODE_ENV` is not `production`, TypeORM auto-syncs the schema on startup. This is convenient for local development and early Supabase setup.

```bash
cd apps/backend
npm run start:dev
```

The backend also seeds starter menu items and default staff users when the related tables are empty.

## Production Schema

When `NODE_ENV=production`, TypeORM does not auto-sync the schema. Use migrations instead.

An initial migration exists at:

```text
apps/backend/src/database/migrations/1718000000000-InitialCoffeeSchema.ts
```

To let the compiled app run migrations on startup, set:

```env
DB_MIGRATIONS_RUN=true
```

Use this intentionally, especially if the database already has tables from an earlier development sync. If the Supabase database already contains the app tables, keep `DB_MIGRATIONS_RUN=false` unless you have reconciled the migration history.

## Initial Data

Default users are seeded automatically on backend startup:

```text
admin / admin123
kitchen / kitchen123
cashier / cashier123
```

For real use, set `DEFAULT_ADMIN_PASSWORD`, `DEFAULT_KITCHEN_PASSWORD`, and `DEFAULT_CASHIER_PASSWORD` before the first backend start. In production, the backend refuses to start if the unsafe fallback passwords are still used.

Login and use the returned token:

```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

Then create a menu item:

```bash
curl -X POST http://localhost:4000/menu \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name":"Espresso","price":20000,"description":"Single shot"}'
```

## SQLite Fallback

SQLite is still available for quick local testing:

```env
DB_TYPE=sqlite
DB_PATH=./coffee.db
NODE_ENV=development
```

This fallback is not the target deployment database for this project.
