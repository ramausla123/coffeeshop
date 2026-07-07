# Deployment

## Backend

Deploy `apps/backend` as a Node.js web service.

Build command:

```bash
npm install
npm --workspace=coffee-backend run build
```

Start command:

```bash
npm --workspace=coffee-backend run start
```

Environment variables:

```env
NODE_ENV=production
PORT=4000
FRONTEND_URL=https://your-frontend-domain
DB_TYPE=postgres
DATABASE_URL=postgresql://postgres.your-project-ref:your-password@your-pooler-host.supabase.com:5432/postgres
DB_SSL=true
DB_MIGRATIONS_RUN=false
JWT_SECRET=your-long-random-secret
MIDTRANS_IS_PRODUCTION=false
MIDTRANS_SERVER_KEY=your-midtrans-server-key
MIDTRANS_CLIENT_KEY=your-midtrans-client-key
DEFAULT_ADMIN_PASSWORD=your-admin-password
DEFAULT_KITCHEN_PASSWORD=your-kitchen-password
DEFAULT_CASHIER_PASSWORD=your-cashier-password
```

Most platforms provide `PORT` automatically. If they do, do not override it.

The backend serves HTTP and Socket.io on the same port. Use the backend base URL for both API and WebSocket clients.

Set the Midtrans payment notification URL to:

```text
https://your-backend-domain/payments/midtrans/notification
```

For a quick browser check, open:

```text
https://your-backend-domain/payments/midtrans/health
```

## Frontend

Deploy `apps/frontend` as a Next.js app.

Build command:

```bash
npm install
npm --workspace=coffee-frontend run build
```

Start command:

```bash
npm --workspace=coffee-frontend run start
```

Environment variables:

```env
NEXT_PUBLIC_API_URL=https://your-backend-domain
NEXT_PUBLIC_WS_URL=https://your-backend-domain
```

Do not add a trailing slash to these URLs.

## Smoke Test

After deploying:

1. Open the frontend URL.
2. Login at `/login`.
3. Create or edit a menu item in `/admin`.
4. Submit a customer order from `/`.
5. Confirm it appears in `/kds`.
6. Process payment in `/cashier`.
