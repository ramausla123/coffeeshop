# Backup and Restore

## Backup

Use the provided script to create a PostgreSQL dump:

```bash
bash scripts/backup-database.sh
```

Required environment variables:

- DATABASE_URL
- BACKUP_DIR (optional, defaults to ./backups)

Backups are stored in the backups directory with a timestamped filename.

## Restore

Example restore command:

```bash
psql "$DATABASE_URL" < backups/coffee_backup_YYYYMMDD_HHMMSS.sql
```

## Recommended operational practices

- Store backups in a remote storage location.
- Keep multiple backup generations.
- Test restore at least once per month.
- Keep a copy of the latest backup before major schema changes.
