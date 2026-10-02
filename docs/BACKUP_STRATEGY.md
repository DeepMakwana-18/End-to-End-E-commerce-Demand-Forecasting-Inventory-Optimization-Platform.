# Production Backup Strategy

The Titan Supply Chain AI platform utilizes an automated backup sidecar container (`postgres-backup`) to ensure database durability and disaster recovery.

## Automated Backup Configuration
- **Mechanism**: The `df-postgres-backup` container runs a daily cron job (`SCHEDULE=@daily`) that executes `pg_dump`.
- **Location**: Backups are written to the `/backups` directory inside the container, which is mounted to `./backups` on the host machine.
- **Retention Policy**: Backups are retained for 7 days (`BACKUP_KEEP_DAYS=7`). Older backups are automatically purged.

## Manual Backup Creation
To manually trigger a backup at any time, run the following command on the Docker host:

```bash
docker exec -it df-postgres-backup backup.sh
```

## Restore Procedure
To restore a backup, follow these steps:

1. Locate the backup file you want to restore in the `./backups` directory (e.g., `demandforecaster-20260719-123456.sql.gz`).
2. Stop the application services to prevent data corruption during restore:
   ```bash
   docker compose stop backend celery_worker celery_beat flower
   ```
3. Drop and recreate the database, or restore directly (assuming a clean slate). To run a clean restore:
   ```bash
   # Enter the postgres container
   docker exec -it df-postgres psql -U postgres
   
   # Inside psql, drop and recreate:
   DROP DATABASE demandforecaster;
   CREATE DATABASE demandforecaster;
   \q
   ```
4. Restore the `.sql.gz` dump:
   ```bash
   docker exec -i df-postgres sh -c 'zcat /var/lib/postgresql/data/../backups/demandforecaster-20260719-123456.sql.gz | psql -U postgres -d demandforecaster'
   # Note: you may need to map the backup directory to the postgres container if not already mapped, or use `docker cp` to copy the backup file to the postgres container first.
   
   # Recommended Restore Method (using docker cp):
   docker cp ./backups/demandforecaster-20260719-123456.sql.gz df-postgres:/tmp/backup.sql.gz
   docker exec -it df-postgres sh -c 'zcat /tmp/backup.sql.gz | psql -U postgres -d demandforecaster'
   ```
5. Restart the application services:
   ```bash
   docker compose start
   ```

## Backup Verification
Backups must be tested periodically. To verify a backup:
1. Spin up a separate PostgreSQL container on a different port.
2. Restore the backup file into the test container.
3. Verify that the table row counts match expected values from the backup timestamp.
