# Coffee Shop Starter Monorepo

Starter monorepo containing a Next.js PWA frontend and a NestJS backend using TypeORM with Supabase/Postgres.

## Quick Setup

### 1. Database Setup

The backend is configured for Supabase Postgres by default. Create a Supabase project, then use the direct database connection settings from Project Settings > Database.

Create `.env` in `apps/backend`:

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
```

TypeORM will auto-sync the schema while `NODE_ENV` is not `production`. For production, set `NODE_ENV=production`, keep `synchronize` disabled, and run migrations intentionally.

Optional frontend env:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=http://localhost:4000
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Services

Terminal 1 - Frontend (port 3000):

```bash
cd apps/frontend
npm run dev
```

Terminal 2 - Backend (port 4000):

```bash
cd apps/backend
npm run start:dev
```

The backend also serves Socket.io for real-time order updates on the same port as the API.

## Features

- Customer Ordering - PWA from table QR (http://localhost:3000)
- Kitchen Display System - order status screen (http://localhost:3000/kds)
- Admin Dashboard - menu CRUD + reports (http://localhost:3000/admin)
- Cashier Dashboard - process payments and print receipts (http://localhost:3000/cashier)
- Account Settings - staff can change their own password (http://localhost:3000/account)
- Menu availability - mark menu items as available or sold out
- Notifications - toast + sound alerts on new orders
- Real-time updates - Socket.io broadcasts order, status, and payment changes
- Supabase/Postgres - shared database through TypeORM
- Default menu seed - starter coffee menu is created when the menu table is empty

## API Endpoints

- `GET /menu`, `POST /menu`, `PATCH /menu/:id`, `DELETE /menu/:id`
- `POST /orders`, `GET /orders`, `GET /orders/:id`
- `PATCH /orders/:id/status`, `PATCH /orders/:id/payment`
- `PATCH /orders/:id/cancel`, `PATCH /orders/:id/refund`
- `POST /auth/login`, `GET /auth/profile`, `POST /auth/change-password`

## Architecture

- Frontend: Next.js 14 + React 18 + TypeScript
- Backend: NestJS 10 + TypeORM + Postgres
- Realtime: Socket.io
- Database: Supabase Postgres, auto-sync in development, migrations for production

See [DATABASE.md](DATABASE.md) for database notes and seeding.

## Staff Accounts

Development fallback accounts are `admin/admin123`, `kitchen/kitchen123`, and `cashier/cashier123`.
For real use, set the `DEFAULT_*_PASSWORD` values before the first backend start, then change staff passwords from `/account`.
In production, the backend refuses to start if the default fallback passwords are still used.

## Table QR Links

The ordering page can prefill the table number from a query parameter:

```text
http://localhost:3000/?table=T1
```

After deployment, generate each table QR from the production URL, for example `https://your-domain.com/?table=T1`.
