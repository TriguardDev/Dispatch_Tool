-- Migration to add call center agent information to bookings table
-- This runs after the main setup and region migration

-- Add call center agent fields to bookings table
ALTER TABLE bookings 
ADD COLUMN call_center_agent_name VARCHAR(255) NULL,
ADD COLUMN call_center_agent_email VARCHAR(255) NULL;

-- Add index for call center agent queries
CREATE INDEX idx_bookings_call_center_agent ON bookings(call_center_agent_email);