-- Timesheet System Migration v001
-- This migration adds timesheet functionality to the dispatch system
-- Allows field agents to submit weekly availability schedules for dispatcher approval

-- Main timesheet table for weekly schedules
CREATE TABLE IF NOT EXISTS timesheets (
    timesheet_id INT PRIMARY KEY AUTO_INCREMENT,
    agentId INT NOT NULL,
    week_start_date DATE NOT NULL,  -- Monday of the week being scheduled
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_by INT NULL,
    reviewer_type ENUM('dispatcher', 'admin') NULL,
    reviewed_at TIMESTAMP NULL,
    created_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (agentId) REFERENCES field_agents(agentId) ON DELETE CASCADE,
    UNIQUE KEY unique_agent_week (agentId, week_start_date),
    INDEX idx_agent_week (agentId, week_start_date),
    INDEX idx_status (status),
    INDEX idx_week_start (week_start_date)
);

-- Individual 2-hour time slots within a timesheet
CREATE TABLE IF NOT EXISTS timesheet_slots (
    slot_id INT PRIMARY KEY AUTO_INCREMENT,
    timesheet_id INT NOT NULL,
    day_of_week ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday') NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (timesheet_id) REFERENCES timesheets(timesheet_id) ON DELETE CASCADE,
    INDEX idx_timesheet_day (timesheet_id, day_of_week),
    INDEX idx_timesheet_time (timesheet_id, day_of_week, start_time, end_time),
    CONSTRAINT chk_two_hour_slot CHECK (TIME_TO_SEC(end_time) - TIME_TO_SEC(start_time) = 7200), -- Exactly 2 hours
    CONSTRAINT chk_business_hours CHECK (start_time >= '10:00:00' AND end_time <= '20:00:00') -- Business hours 10am-8pm
);

-- Add indexes for performance optimization
CREATE INDEX idx_timesheets_agent_status ON timesheets(agentId, status);
CREATE INDEX idx_timesheets_week_status ON timesheets(week_start_date, status);
CREATE INDEX idx_slots_day_time ON timesheet_slots(day_of_week, start_time, end_time);