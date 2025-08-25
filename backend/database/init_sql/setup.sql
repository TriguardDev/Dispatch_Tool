-- Location Table
CREATE TABLE IF NOT EXISTS locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    latitude DECIMAL(9,6) NOT NULL,
    longitude DECIMAL(9,6) NOT NULL,
    postal_code VARCHAR(255) NOT NULL,
    street_name VARCHAR(255),
    street_number INT
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
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    `status` ENUM('scheduled', 'in-progress', 'completed') DEFAULT 'scheduled',
    FOREIGN KEY (customerId) REFERENCES customers(customerId) ON DELETE CASCADE,
    FOREIGN KEY (agentId) REFERENCES field_agents(agentId) ON DELETE SET NULL
);

-- Sample Locations
INSERT INTO locations (latitude, longitude, postal_code, street_name, street_number)
VALUES
(40.712776, -74.005974, '10007', 'Broadway', 1),
(34.052235, -118.243683, '90012', 'Sunset Blvd', 101),
(51.507351, -0.127758, 'SW1A', 'Downing Street', 10);

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