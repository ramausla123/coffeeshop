# Coffee Shop Starter Monorepo

Starter monorepo containing a Next.js PWA frontend and a NestJS backend with PostgreSQL.

## Quick Setup

### 1. Database Setup
- **Windows:** Download PostgreSQL 15 from https://www.postgresql.org/download/windows/
- **Create database:** `psql -U postgres` then `CREATE DATABASE coffee_app;`
- See [POSTGRES_WINDOWS_SETUP.md](POSTGRES_WINDOWS_SETUP.md) for detailed steps

### 2. Install Dependencies
```bash
npm install  # Root
cd apps/frontend && npm install
cd ../backend && npm install
```

### 3. Run Services

**Terminal 1 - Frontend (port 3000):**
```bash
cd apps/frontend
npm run dev
```

**Terminal 2 - Backend (port 4000):**
```bash
cd apps/backend
npm run start:dev
```

## Features
- 🛒 **Customer Ordering** — PWA from table QR (http://localhost:3000)
- 👨‍🍳 **Kitchen Display System** — Real-time order status (http://localhost:3000/kds)
- ⚙️ **Admin Dashboard** — Menu CRUD + reports (http://localhost:3000/admin)
- 📱 **Notifications** — Toast + sound alerts on new orders
- 💾 **PostgreSQL** — Production-ready database

## API Endpoints
- `GET /menu`, `POST /menu`, `PATCH /menu/:id`, `DELETE /menu/:id`
- `POST /orders`, `GET /orders`, `GET /orders/:id`, `PATCH /orders/:id/status`

## Architecture
- Frontend: Next.js 14 + React 18 + TypeScript
- Backend: NestJS 10 + TypeORM + PostgreSQL
- Database: Auto-sync in development

See [DATABASE.md](DATABASE.md) for advanced DB setup (Docker, migrations, seeding).

