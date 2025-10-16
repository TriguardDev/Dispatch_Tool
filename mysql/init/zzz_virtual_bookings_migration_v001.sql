-- Virtual Bookings Migration v001
-- Description: Adds support for virtual bookings that don't require physical addresses
-- Date: 2025-10-16
-- Rollback: ALTER TABLE bookings DROP COLUMN booking_type;

-- Add booking_type column to bookings table to distinguish between physical and virtual bookings
-- Check if column exists before adding it
SET @column_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE table_schema = DATABASE() 
    AND table_name = 'bookings' 
    AND column_name = 'booking_type');

SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE bookings ADD COLUMN booking_type ENUM(''physical'', ''virtual'') DEFAULT ''physical'' COMMENT ''Type of booking: physical (requires address) or virtual (contact info only)''',
    'SELECT "Column booking_type already exists" as status'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index for better query performance when filtering by booking type
SET @index_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS 
    WHERE table_schema = DATABASE() 
    AND table_name = 'bookings' 
    AND index_name = 'idx_bookings_type');

SET @index_sql = IF(@index_exists = 0, 
    'CREATE INDEX idx_bookings_type ON bookings(booking_type)',
    'SELECT "Index idx_bookings_type already exists" as status'
);

PREPARE index_stmt FROM @index_sql;
EXECUTE index_stmt;
DEALLOCATE PREPARE index_stmt;

-- Make location_id nullable in customers table if not already nullable
-- This allows virtual bookings to have customers without addresses
SET @column_info = (SELECT IS_NULLABLE FROM information_schema.COLUMNS 
    WHERE table_schema = DATABASE() 
    AND table_name = 'customers' 
    AND column_name = 'location_id');

SET @modify_sql = IF(@column_info = 'NO', 
    'ALTER TABLE customers MODIFY COLUMN location_id INT NULL COMMENT ''Location ID - nullable for virtual bookings''',
    'SELECT "Column location_id is already nullable" as status'
);

PREPARE modify_stmt FROM @modify_sql;
EXECUTE modify_stmt;
DEALLOCATE PREPARE modify_stmt;

SELECT "Virtual bookings migration completed successfully" as migration_status;