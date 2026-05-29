# PostgreSQL Setup untuk Windows (Tanpa Docker)

## Download & Install

1. **Download PostgreSQL 15** dari: https://www.postgresql.org/download/windows/
2. **Run installer** dan ikuti wizard:
   - Default port: 5432
   - Username: postgres
   - Password: **postgres** (sesuai .env.example)
   - Install pgAdmin (optional)

3. **Verify instalasi:**
```bash
psql --version
psql -U postgres -h localhost -d postgres
```

4. **Create database:**
```bash
psql -U postgres -h localhost
CREATE DATABASE coffee_app;
\q
```

## Alternatif: PostgreSQL Portable (No Install)

Jika tidak ingin install:
- Download PostgreSQL portable dari https://www.enterprisedb.com/download-postgresql-binaries
- Extract dan run: `bin/initdb.exe -D data -U postgres -W`

## Test Koneksi dari Backend

Setup `.env` di `apps/backend`:
```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=coffee_app
NODE_ENV=development
```

Lalu run backend:
```bash
cd apps/backend
npm run start:dev
```

Jika berhasil, akan muncul:
```
[Nest] localhost:5432 database connected
Backend running on http://localhost:4000
```
