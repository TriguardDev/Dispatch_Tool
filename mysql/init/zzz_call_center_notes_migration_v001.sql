-- Call Center Notes Migration v001
-- Description: Adds notes field to bookings table for call center agent notes
-- Date: 2025-10-17
-- Rollback: ALTER TABLE bookings DROP COLUMN call_center_notes;

-- Add call_center_notes column to bookings table
-- Check if column exists before adding it
SET @column_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE table_schema = DATABASE() 
    AND table_name = 'bookings' 
    AND column_name = 'call_center_notes');

SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE bookings ADD COLUMN call_center_notes TEXT NULL COMMENT ''Notes added by call center agent during booking creation''',
    'SELECT "Column call_center_notes already exists" as status'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT "Call center notes migration completed successfully" as migration_status;