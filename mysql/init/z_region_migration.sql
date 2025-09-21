-- Region-based Queue System Migration
-- This migration adds regions support to the existing dispatch system

-- Create regions table
CREATE TABLE IF NOT EXISTS regions (
    regionId INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_global BOOLEAN DEFAULT FALSE,
    created_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert the default Global region
INSERT INTO regions (name, description, is_global) VALUES
('Global', 'Global region accessible by all teams', TRUE);

-- Add region_id column to teams table
ALTER TABLE teams 
ADD COLUMN region_id INT DEFAULT 1,
ADD FOREIGN KEY (region_id) REFERENCES regions(regionId) ON DELETE SET NULL;

-- Update all existing teams to be assigned to Global region
UPDATE teams SET region_id = 1 WHERE region_id IS NULL;

-- Add region_id column to bookings table
ALTER TABLE bookings 
ADD COLUMN region_id INT DEFAULT 1,
ADD FOREIGN KEY (region_id) REFERENCES regions(regionId) ON DELETE SET NULL;

-- Update all existing bookings to be assigned to Global region
UPDATE bookings SET region_id = 1 WHERE region_id IS NULL;

-- Add some sample regions for demonstration
INSERT INTO regions (name, description, is_global) VALUES
('North Texas', 'Northern Texas region including McKinney area', FALSE),
('South Texas', 'Southern Texas region including McAllen and Edinburg areas', FALSE),
('East Texas', 'Eastern Texas region', FALSE),
('West Texas', 'Western Texas region', FALSE);

-- Update sample teams to use specific regions instead of Global
-- Team Alpha (McAllen area) -> South Texas
UPDATE teams SET region_id = 3 WHERE name = 'Team Alpha';
-- Team Beta (Edinburg region) -> South Texas  
UPDATE teams SET region_id = 3 WHERE name = 'Team Beta';
-- Team Gamma (McKinney area) -> North Texas
UPDATE teams SET region_id = 2 WHERE name = 'Team Gamma';

-- Create index for better performance on region-based queries
CREATE INDEX idx_teams_region ON teams(region_id);
CREATE INDEX idx_bookings_region ON bookings(region_id);