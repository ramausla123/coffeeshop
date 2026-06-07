# Database Setup

## SQLite Setup

The backend currently uses SQLite through TypeORM:

```ts
type: 'sqlite'
database: process.env.DB_PATH || './coffee.db'
```

This means local development does not require PostgreSQL, Docker, pgAdmin, or a running database service.

## Environment Setup

Create `.env` in `apps/backend`:

```env
DB_TYPE=sqlite
DB_PATH=./coffee.db
JWT_SECRET=change-this-secret
DEFAULT_ADMIN_PASSWORD=change-admin-password
DEFAULT_KITCHEN_PASSWORD=change-kitchen-password
DEFAULT_CASHIER_PASSWORD=change-cashier-password
WS_PORT=4002
NODE_ENV=development
```

`DB_PATH` is relative to the backend working directory when you run the server.

## Install Dependencies & Run

```bash
cd apps/backend
npm install
npm run start:dev
```

TypeORM will auto-sync schema on startup (`synchronize: true`) while `NODE_ENV` is not `production`.

## Initial Data

The API will auto-sync the schema, and the backend creates starter menu items automatically when the menu table is empty.
Protected menu writes require an admin token.
Default users are seeded automatically on backend startup:

```text
admin / admin123
kitchen / kitchen123
cashier / cashier123
```

For real use, set `DEFAULT_ADMIN_PASSWORD`, `DEFAULT_KITCHEN_PASSWORD`, and `DEFAULT_CASHIER_PASSWORD` before the first backend start.

Login and use the returned token:

```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

Then seed a menu item:

```bash
curl -X POST http://localhost:4000/menu \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name":"Espresso","price":20000,"description":"Single shot"}'
```

## PostgreSQL Note

Older project notes mention PostgreSQL, but the current backend code is configured for SQLite only.
If you want PostgreSQL later, update `apps/backend/src/database/database.module.ts` to use `type: 'postgres'` and read the related `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` variables.
