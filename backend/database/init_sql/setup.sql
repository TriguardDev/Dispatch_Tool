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

-- Sample Locations (with country)
INSERT INTO locations (latitude, longitude, postal_code, city, state_province, country, street_name, street_number)
VALUES
(26.1936248, -98.2118124, '78502', 'McAllen', 'Texas', 'USA', 'Broadway', '1'),
(26.3237612, -98.1369012, '78542', 'Edinburg', 'Texas', 'USA', 'Sunset Blvd', '101'),
(33.1811789, -96.6291685, '75069', 'McKinney', 'Texas', 'USA', 'Bay Street', '100');

-- Sample Teams
INSERT INTO teams (name, description) VALUES
('Team Alpha', 'Primary response team for McAllen area'),
('Team Beta', 'Specialized team for Edinburg region'),
('Team Gamma', 'McKinney area coverage team');

-- Sample Dispatchers
INSERT INTO dispatchers (`name`, email, password, phone, location_id, team_id)
VALUES
('Pete Stathopoulos', 'pete@triguardroofing.com', 'pete', '555-0001', 1, 1);

-- Sample Field Agents
INSERT INTO field_agents (`name`, email, password, phone, `status`, location_id, team_id)
VALUES
('Larey Farias', 'larey@triguardroofing.com', "larey", '555-1111', 'available', 1, 1),
('Arthur Garica', 'arthur@triguardroofing.com', 'arthur', '555-1111', 'available', 1, 1),
('Jeremy Moreno', 'jeremy@triguardroofing.com', 'jeremy', '555-2222', 'available', 2, 2),
('rebecca steward', 'rebecca@triguardroofing.com', 'rebecca', '555-2222', 'available', 3, 3),
('tester', 'test@example.com', 'tester', '555-6666', 'available', 3, 3);

-- Sample Admin
INSERT INTO admins (`name`, email, password)
VALUES
('Admin User', 'admin@triguardroofing.com', 'admin123');

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