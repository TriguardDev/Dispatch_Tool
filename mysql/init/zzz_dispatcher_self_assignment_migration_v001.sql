-- Dispatcher Self-Assignment Migration v001
-- Description: Adds support for dispatchers to assign themselves to appointments
-- Date: 2025-09-30
-- Rollback: DROP FOREIGN KEY fk_bookings_dispatcher; ALTER TABLE bookings DROP COLUMN dispatcherId;

-- Add dispatcherId column to bookings table to support dispatcher self-assignment
-- Check if column exists before adding it
SET @column_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE table_schema = DATABASE() 
    AND table_name = 'bookings' 
    AND column_name = 'dispatcherId');

SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE bookings ADD COLUMN dispatcherId INT NULL COMMENT ''Reference to dispatchers table when dispatcher assigns themselves''',
    'SELECT "Column dispatcherId already exists" as status'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key constraint to ensure data integrity
-- Note: Using a separate statement to handle cases where constraint might already exist
SET @constraint_exists = (
    SELECT COUNT(*) 
    FROM information_schema.TABLE_CONSTRAINTS 
    WHERE CONSTRAINT_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'bookings' 
    AND CONSTRAINT_NAME = 'fk_bookings_dispatcher'
);

SET @sql = IF(@constraint_exists = 0, 
    'ALTER TABLE bookings ADD CONSTRAINT fk_bookings_dispatcher FOREIGN KEY (dispatcherId) REFERENCES dispatchers(dispatcherId) ON DELETE SET NULL',
    'SELECT "Foreign key constraint already exists" as status'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index for better query performance when filtering by dispatcher
SET @index_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS 
    WHERE table_schema = DATABASE() 
    AND table_name = 'bookings' 
    AND index_name = 'idx_bookings_dispatcher');

SET @index_sql = IF(@index_exists = 0, 
    'CREATE INDEX idx_bookings_dispatcher ON bookings(dispatcherId)',
    'SELECT "Index idx_bookings_dispatcher already exists" as status'
);

PREPARE index_stmt FROM @index_sql;
EXECUTE index_stmt;
DEALLOCATE PREPARE index_stmt;

-- Note: Check constraint cannot be added because agentId is part of a foreign key constraint
-- The business rule (only one of agentId or dispatcherId can be set) will be enforced in the application layer
-- This ensures a booking can be assigned to either an agent OR a dispatcher, but not both
SELECT "Business rule enforcement: Only one of agentId or dispatcherId should be set - enforced in application logic" as migration_note;