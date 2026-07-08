#!/usr/bin/env bash
set -euo pipefail

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DB_URL="${DATABASE_URL:-}"

mkdir -p "$BACKUP_DIR"

if [ -z "$DB_URL" ]; then
  echo "DATABASE_URL is not set"
  exit 1
fi

FILE="$BACKUP_DIR/coffee_backup_$DATE.sql"

if command -v pg_dump >/dev/null 2>&1; then
  pg_dump "$DB_URL" > "$FILE"
  echo "Database backup created at $FILE"
else
  echo "pg_dump not available"
  exit 1
fi
