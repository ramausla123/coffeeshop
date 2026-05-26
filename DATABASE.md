# Database Setup

## PostgreSQL Installation & Setup

### Mac/Linux (Homebrew)
```bash
brew install postgresql@15
brew services start postgresql@15
createdb coffee_app
```

### Windows
1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Install and note credentials
3. Run pgAdmin or psql to create database:
```bash
psql -U postgres
CREATE DATABASE coffee_app;
```

### Docker (Recommended for dev)
```bash
docker run --name coffee-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=coffee_app -d -p 5432:5432 postgres:15-alpine
```

## Environment Setup

Create `.env` in backend root:
```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=coffee_app
NODE_ENV=development
```

## Install Dependencies & Run

```bash
cd apps/backend
npm install
npm run start:dev
```

TypeORM will auto-sync schema on startup (synchronize: true in development).

## Initial Data

API will auto-sync, but you can seed via POST:
```bash
curl -X POST http://localhost:4000/menu \
  -H "Content-Type: application/json" \
  -d '{"name":"Espresso","price":20000,"description":"Single shot"}'
```
