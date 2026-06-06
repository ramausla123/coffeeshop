# Coffee Shop Starter Monorepo

Starter monorepo containing a Next.js PWA frontend and a NestJS backend with SQLite.

## Quick Setup

### 1. Database Setup

The backend uses SQLite by default. No separate database server is required.

Create `.env` in `apps/backend`:

```env
DB_TYPE=sqlite
DB_PATH=./coffee.db
JWT_SECRET=change-this-secret
NODE_ENV=development
```

TypeORM will create/update the local `coffee.db` file automatically in development.

Optional frontend env:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=http://localhost:4002
```

### 2. Install Dependencies

```bash
npm install  # Root
cd apps/frontend && npm install
cd ../backend && npm install
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

The backend also starts a Socket.io server for real-time order updates. By default it listens on port `4002`.

## Features

- Customer Ordering - PWA from table QR (http://localhost:3000)
- Kitchen Display System - order status screen (http://localhost:3000/kds)
- Admin Dashboard - menu CRUD + reports (http://localhost:3000/admin)
- Cashier Dashboard - process payments and print receipts (http://localhost:3000/cashier)
- Notifications - toast + sound alerts on new orders
- Real-time updates - Socket.io broadcasts order, status, and payment changes
- SQLite - local development database via `coffee.db`
- Default menu seed - starter coffee menu is created when the menu table is empty

## API Endpoints

- `GET /menu`, `POST /menu`, `PATCH /menu/:id`, `DELETE /menu/:id`
- `POST /orders`, `GET /orders`, `GET /orders/:id`, `PATCH /orders/:id/status`
- `PATCH /orders/:id/payment`
- `POST /auth/login`, `GET /auth/profile`

## Architecture

- Frontend: Next.js 14 + React 18 + TypeScript
- Backend: NestJS 10 + TypeORM + SQLite
- Realtime: Socket.io
- Database: auto-sync in development

See [DATABASE.md](DATABASE.md) for database notes and seeding.

## Table QR Links

The ordering page can prefill the table number from a query parameter:

```text
http://localhost:3000/?table=T1
```

After deployment, generate each table QR from the production URL, for example `https://your-domain.com/?table=T1`.
