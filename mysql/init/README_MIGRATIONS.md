# Database Migration Guide

This folder contains SQL migration files that are executed in alphabetical order when the database is initialized.

## Naming Convention

Use the following naming pattern for migration files:

```
zzz_<feature_name>_migration_v<XXX>.sql
```

Where:
- `zzz_` prefix ensures migrations run after the base setup.sql
- `<feature_name>` describes what the migration adds (e.g., timesheet, notifications, billing)
- `v<XXX>` is a 3-digit version number (001, 002, 003, etc.)

## Examples

- `zzz_timesheet_migration_v001.sql` - Initial timesheet system
- `zzz_timesheet_migration_v002.sql` - Timesheet enhancements  
- `zzz_notifications_migration_v001.sql` - Email notification system
- `zzz_billing_migration_v001.sql` - Billing and invoicing

## Current Files (execution order)

1. `setup.sql` - Base database schema
2. `z_region_migration.sql` - Region system
3. `zz_call_center_migration.sql` - Call center features
4. `zzz_timesheet_migration_v001.sql` - Timesheet system

## Migration Best Practices

1. **Always use `IF NOT EXISTS`** for CREATE statements
2. **Use `ADD COLUMN IF NOT EXISTS`** for ALTER statements (MySQL 8.0+)
3. **Add descriptive comments** explaining what each migration does
4. **Include rollback instructions** in comments if needed
5. **Test migrations on a copy** of production data first
6. **Keep migrations atomic** - one logical change per file

## Example Migration Template

```sql
-- [Feature Name] Migration v[XXX]
-- Description: What this migration adds/changes
-- Date: YYYY-MM-DD
-- Rollback: Instructions for manual rollback if needed

-- Create new table
CREATE TABLE IF NOT EXISTS new_table (
    id INT PRIMARY KEY AUTO_INCREMENT,
    -- columns here
    created_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Modify existing table (if needed)
-- ALTER TABLE existing_table ADD COLUMN new_column VARCHAR(100);

-- Add indexes
CREATE INDEX idx_new_table_column ON new_table(column_name);

-- Insert default data (if needed)
-- INSERT IGNORE INTO new_table (name) VALUES ('Default Value');
```

## Future Migration Numbers

Next available version numbers:
- Timesheet: v002
- Notifications: v001  
- Billing: v001
- Reports: v001
- Integrations: v001