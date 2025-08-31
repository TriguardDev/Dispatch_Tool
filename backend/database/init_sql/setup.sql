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
    UNIQUE KEY unique_location (
        street_number, 
        street_name, 
        postal_code, 
        city, 
        state_province 
    )
);

-- Dispatcher Table
CREATE TABLE IF NOT EXISTS dispatchers (
    dispatcherId INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL
);

-- Field Agent Table
CREATE TABLE IF NOT EXISTS field_agents (
    agentId INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(15),
    `status` ENUM('available', 'unavailable', 'accepted', 'declined', 'enroute') DEFAULT 'available',
    location_id INT UNIQUE,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
);

-- Customer Table
CREATE TABLE IF NOT EXISTS customers (
    customerId INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(15),
    location_id INT UNIQUE,
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
    `status` ENUM('scheduled', 'in-progress', 'completed') DEFAULT 'scheduled',
    FOREIGN KEY (customerId) REFERENCES customers(customerId) ON DELETE CASCADE,
    FOREIGN KEY (agentId) REFERENCES field_agents(agentId) ON DELETE SET NULL
);

-- Lookup table of possible dispositions
CREATE TABLE IF NOT EXISTS disposition_types (
    typeCode VARCHAR(50) PRIMARY KEY,        -- e.g., "SOLD_CASH_PIF"
    description VARCHAR(255) NOT NULL        -- e.g., "Sold – Cash Deal (Paid in Full)"
);

-- Main dispositions table
CREATE TABLE IF NOT EXISTS dispositions (
    dispositionId INT AUTO_INCREMENT PRIMARY KEY,
    typeCode VARCHAR(50) NOT NULL,
    changedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    note TEXT,
    FOREIGN KEY (typeCode) REFERENCES disposition_types(typeCode)
);

-- Sample Locations (with country)
INSERT INTO locations (latitude, longitude, postal_code, city, state_province, country, street_name, street_number)
VALUES
(40.712776, -74.005974, '10007', 'New York', 'NY', 'USA', 'Broadway', '1'),         -- NYC, USA
(34.052235, -118.243683, '90012', 'Los Angeles', 'CA', 'USA', 'Sunset Blvd', '101'), -- LA, USA
(43.653225, -79.383186, 'M5H 2N2', 'Toronto', 'ON', 'Canada', 'Bay Street', '100'); -- Toronto, Canada

-- Sample Dispatchers
INSERT INTO dispatchers (`name`, email)
VALUES
('Grace Lee', 'lee@example.com');

-- Sample Field Agents
INSERT INTO field_agents (`name`, email, phone, `status`, location_id)
VALUES
('Alice Johnson', 'alice@example.com', '555-1111', 'available', 1),
('Bob Smith', 'bob@example.com', '555-2222', 'enroute', 2),
('Carol Davis', 'carol@example.com', '555-3333', 'accepted', 3);

-- Sample Customers
INSERT INTO customers (`name`, email, phone, location_id)
VALUES
('Dave Wilson', 'dave@example.com', '555-4444', 1),
('Eve Thompson', 'eve@example.com', '555-5555', 2),
('Frank Martin', 'frank@example.com', '555-6666', 3);

-- Sample Bookings
INSERT INTO bookings (customerId, agentId, booking_date, booking_time, `status`)
VALUES
(1, 1, '2025-08-22', '09:00:00', 'in-progress'),
(2, 2, '2025-08-22', '10:30:00', 'scheduled'),
(3, 3, '2025-08-22', '14:00:00', 'completed');

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