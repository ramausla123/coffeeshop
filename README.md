# Coffee Shop Monorepo

A full-stack coffee shop application with a Next.js frontend and a NestJS backend. It supports ordering, kitchen display, admin management, cashier workflow, and real-time updates.

## What this app does

This application is designed for a coffee shop workflow:

- Customers can browse the menu and place orders
- Kitchen staff can see incoming orders in real time
- Admin can manage menu items and categories
- Cashier can process payments and update order status
- Staff can change their own password from the account page

## Project structure

- Frontend: Next.js app in [apps/frontend](apps/frontend)
- Backend: NestJS API in [apps/backend](apps/backend)
- Database migrations: [apps/backend/src/database/migrations](apps/backend/src/database/migrations)
- Docs: [docs](docs)
- CI/CD workflows: [.github/workflows](.github/workflows)

## Quick start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create a file at [apps/backend/.env](apps/backend) with the values from [apps/backend/.env.example](apps/backend/.env.example).

Example backend environment:

```env
NODE_ENV=development
DB_TYPE=postgres
DATABASE_URL=postgresql://postgres:your-password@host:5432/postgres
DB_SSL=true
DB_MIGRATIONS_RUN=false
JWT_SECRET=change-this-secret-to-a-long-random-string
DEFAULT_ADMIN_PASSWORD=change-admin-password
DEFAULT_KITCHEN_PASSWORD=change-kitchen-password
DEFAULT_CASHIER_PASSWORD=change-cashier-password
```

Optional frontend environment:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=http://localhost:4000
```

### 3. Run locally

Start the backend:

```bash
npm --workspace=coffee-backend run start:dev
```

Start the frontend:

```bash
npm --workspace=coffee-frontend run dev
```

The backend also serves Socket.IO for real-time updates on the same port as the API.

## Main user flows

- Customer ordering: open the home page and place an order
- Kitchen display: open /kds to monitor orders
- Admin panel: open /admin to manage menu items
- Cashier panel: open /cashier to process orders
- Account page: open /account to change password

## API overview

Common backend endpoints:

- `GET /health`
- `GET /menu`, `POST /menu`, `PATCH /menu/:id`, `DELETE /menu/:id`
- `POST /orders`, `GET /orders`, `GET /orders/:id`
- `PATCH /orders/:id/status`, `PATCH /orders/:id/payment`
- `PATCH /orders/:id/cancel`, `PATCH /orders/:id/refund`
- `POST /auth/login`, `GET /auth/profile`, `POST /auth/change-password`

## Development notes

- The backend uses NestJS, TypeORM, and PostgreSQL/Supabase.
- The frontend uses Next.js and React.
- In development, schema sync may happen automatically.
- In production, use migrations intentionally and keep `NODE_ENV=production`.

## Production readiness

The project includes several production-oriented improvements:

- Health endpoint at `/health`
- CORS and WebSocket origin configuration
- Basic rate limiting
- Error logging hook for monitoring tools such as Sentry
- Automated test workflow in GitHub Actions
- Backup and restore guide in [docs/backup-restore.md](docs/backup-restore.md)

## Deployment

The project is designed to work with:

- Frontend: Vercel
- Backend: Render

For production, configure the following environment variables in your hosting platform:

```env
NODE_ENV=production
JWT_SECRET=your-long-random-secret
DEFAULT_ADMIN_PASSWORD=your-admin-password
DEFAULT_KITCHEN_PASSWORD=your-kitchen-password
DEFAULT_CASHIER_PASSWORD=your-cashier-password
CORS_ORIGINS=https://your-frontend-domain
NEXT_PUBLIC_API_URL=https://your-backend-domain
NEXT_PUBLIC_WS_URL=https://your-backend-domain
```

## Backup and restore

See [docs/backup-restore.md](docs/backup-restore.md) for backup instructions and restore examples.

## Testing

The repository includes a basic automated workflow that builds the project and checks the backend health endpoint.

## Staff accounts

Development fallback accounts are:

- `admin / admin123`
- `kitchen / kitchen123`
- `cashier / cashier123`

In production, the backend will refuse to start if these fallback passwords are still being used.

## Table QR links

The ordering page can prefill the table number from a query parameter:

```text
http://localhost:3000/?table=T1
```

After deployment, generate each table QR from the production URL, for example `https://your-domain.com/?table=T1`.
