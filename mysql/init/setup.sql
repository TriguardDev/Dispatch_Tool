-- Location Table
CREATE TABLE IF NOT EXISTS locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    latitude DECIMAL(9,6) NOT NULL,
    longitude DECIMAL(9,6) NOT NULL,
    postal_code VARCHAR(12) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state_province VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    street_name VARCHAR(150) NOT NULL,
    street_number VARCHAR(20) NOT NULL,
    created_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_location (
        street_name,
        street_number,
        postal_code, 
        city, 
        state_province 
    )
);

-- Teams Table
CREATE TABLE IF NOT EXISTS teams (
    teamId INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Dispatcher Table
CREATE TABLE IF NOT EXISTS dispatchers (
    dispatcherId INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(15),
    location_id INT,
    team_id INT,
    created_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL,
    FOREIGN KEY (team_id) REFERENCES teams(teamId) ON DELETE SET NULL
);

-- Field Agent Table
CREATE TABLE IF NOT EXISTS field_agents (
    agentId INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(15),
    `status` ENUM('available', 'unavailable', 'accepted', 'declined', 'enroute') DEFAULT 'available',
    location_id INT,
    team_id INT,
    created_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL,
    FOREIGN KEY (team_id) REFERENCES teams(teamId) ON DELETE SET NULL
);

-- Admin Table
CREATE TABLE IF NOT EXISTS admins (
    adminId INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Customer Table
CREATE TABLE IF NOT EXISTS customers (
    customerId INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(15),
    location_id INT UNIQUE,
    created_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
);

-- Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    bookingId INT AUTO_INCREMENT PRIMARY KEY,
    customerId INT NOT NULL,
    agentId INT,
    dispositionId INT,
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    `status` ENUM('scheduled', 'enroute', 'on-site', 'completed') DEFAULT 'scheduled',
    created_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customerId) REFERENCES customers(customerId) ON DELETE CASCADE,
    FOREIGN KEY (agentId) REFERENCES field_agents(agentId) ON DELETE SET NULL
);

-- Time Off Requests Table
CREATE TABLE IF NOT EXISTS time_off_requests (
    requestId INT AUTO_INCREMENT PRIMARY KEY,
    agentId INT NOT NULL,
    request_date DATE NOT NULL,
    start_time TIME NULL, -- NULL for full day, specific time for 2-hour periods
    end_time TIME NULL,   -- NULL for full day, specific time for 2-hour periods
    is_full_day BOOLEAN DEFAULT FALSE,
    reason TEXT,
    status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
    requested_by INT NOT NULL, -- agentId who requested
    reviewed_by INT NULL,      -- dispatcherId or adminId who approved/rejected
    reviewer_type ENUM('dispatcher', 'admin') NULL,
    created_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (agentId) REFERENCES field_agents(agentId) ON DELETE CASCADE,
    FOREIGN KEY (requested_by) REFERENCES field_agents(agentId) ON DELETE CASCADE,
    -- Add constraint to prevent overlapping time-off for same agent
    UNIQUE KEY unique_agent_timeoff (agentId, request_date, start_time, end_time)
);

-- Lookup table of possible dispositions
CREATE TABLE IF NOT EXISTS disposition_types (
    typeCode VARCHAR(50) PRIMARY KEY,        -- e.g., "SOLD_CASH_PIF"
    description VARCHAR(255) NOT NULL,       -- e.g., "Sold â€" Cash Deal (Paid in Full)"
    created_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Main dispositions table
CREATE TABLE IF NOT EXISTS dispositions (
    dispositionId INT AUTO_INCREMENT PRIMARY KEY,
    typeCode VARCHAR(50) NOT NULL,
    note TEXT,
    created_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (typeCode) REFERENCES disposition_types(typeCode)
);

-- Admin User (required for initial system access)
INSERT INTO admins (`name`, email, password)
VALUES
('Admin User', 'admin@triguardroofing.com', '$2b$12$fnsSM5iFB2ClCSgcc1wGMe9g4rNfNuM7ncWv7XP1fL7nNvdEmQ0NG');

-- Populate your disposition types
INSERT INTO disposition_types (typeCode, description) VALUES
('SOLD_CASH_PIF', 'Sold - Cash Deal (Paid in Full)'),
('SOLD_CHECK_COLLECTED', 'Sold - Check Collected'),
('SOLD_CARD_ACH_SUBMITTED', 'Sold - Card/ACH Payment Submitted'),
('SOLD_DEPOSIT_COLLECTED', 'Sold - Deposit Collected (Balance Due)'),
('SOLD_LENDER_SUBMITTED', 'Sold - Lender Financing Submitted'),
('SOLD_LENDER_APPROVED_DOCS', 'Sold - Lender Approved (Docs Signed)'),
('SOLD_FUNDED', 'Sold - Funded (Lender Disbursed)'),
('SOLD_LENDER_DECLINED', 'Sold - Lender Declined'),
('SOLD_IN_HOUSE_PLAN', 'Sold - Payment Plan (In-House)'),
('SOLD_FINAL_PAYMENT', 'Sold - Balance Paid (Final Payment)'),
('SOLD_RESCINDED_REVERSED', 'Sale Rescinded / Payment Reversed');