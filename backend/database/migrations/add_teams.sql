-- Teams Table
CREATE TABLE IF NOT EXISTS teams (
    teamId INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Add team_id column to dispatchers table
ALTER TABLE dispatchers 
ADD COLUMN team_id INT,
ADD FOREIGN KEY (team_id) REFERENCES teams(teamId) ON DELETE SET NULL;

-- Add team_id column to field_agents table  
ALTER TABLE field_agents 
ADD COLUMN team_id INT,
ADD FOREIGN KEY (team_id) REFERENCES teams(teamId) ON DELETE SET NULL;

-- Sample teams data
INSERT INTO teams (name, description) VALUES
('Team Alpha', 'Primary response team for McAllen area'),
('Team Beta', 'Specialized team for Edinburg region'),
('Team Gamma', 'McKinney area coverage team');

-- Assign existing dispatchers and agents to teams
UPDATE dispatchers SET team_id = 1 WHERE dispatcherId = 1;
UPDATE field_agents SET team_id = 1 WHERE agentId IN (1, 2);
UPDATE field_agents SET team_id = 2 WHERE agentId = 3;
UPDATE field_agents SET team_id = 3 WHERE agentId IN (4, 5);