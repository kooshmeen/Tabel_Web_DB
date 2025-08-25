-- For real-time 1v1 matches
CREATE TABLE sudoku_live_matches (
    id SERIAL PRIMARY KEY,
    challenger_id INT REFERENCES sudoku_players(id),
    challenged_id INT REFERENCES sudoku_players(id),
    group_id INT REFERENCES sudoku_groups(id),
    difficulty VARCHAR(10) NOT NULL,
    puzzle_data TEXT NOT NULL, -- JSON string of the puzzle
    status VARCHAR(20) DEFAULT 'pending', -- pending, active, completed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours')
);

-- For offline 1v1 challenges  
CREATE TABLE sudoku_challenge_invitations (
    id SERIAL PRIMARY KEY,
    challenger_id INT REFERENCES sudoku_players(id),
    challenged_id INT REFERENCES sudoku_players(id), 
    group_id INT REFERENCES sudoku_groups(id),
    difficulty VARCHAR(10) NOT NULL,
    puzzle_data TEXT NOT NULL,
    challenger_time INT NOT NULL DEFAULT 0,
    challenger_score INT NOT NULL DEFAULT 0,
    challenger_mistakes INT NOT NULL DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, completed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- For group member W/L records
ALTER TABLE sudoku_group_members 
ADD COLUMN wins INT DEFAULT 0,
ADD COLUMN losses INT DEFAULT 0,
ADD COLUMN draws INT DEFAULT 0;

-- Add challenge_type column to existing table
ALTER TABLE sudoku_challenge_invitations 
ADD COLUMN IF NOT EXISTS challenge_type VARCHAR(10) DEFAULT 'offline';

-- Update status enum to include new states
-- The status can now be: pending, accepted, completed, rejected, challenger_completed

-- Add missing columns for challenged player's data
ALTER TABLE sudoku_challenge_invitations 
ADD COLUMN IF NOT EXISTS challenged_time INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS challenged_score INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS challenged_mistakes INT DEFAULT 0;

ALTER TABLE sudoku_live_matches 
ADD COLUMN IF NOT EXISTS challenger_finished BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS challenged_finished BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS challenger_time INT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS challenged_time INT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS challenger_mistakes INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS challenged_mistakes INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP DEFAULT NULL,
ADD COLUMN IF NOT EXISTS challenger_finished_at TIMESTAMP DEFAULT NULL,
ADD COLUMN IF NOT EXISTS challenged_finished_at TIMESTAMP DEFAULT NULL;

-- select last row from sudoku_live_matches
SELECT * FROM sudoku_live_matches
ORDER BY created_at DESC
LIMIT 1;



-- delete 'winner' column from sudoku live matches
ALTER TABLE sudoku_live_matches
DROP COLUMN IF EXISTS winner;

DELETE FROM sudoku_live_matches;
DELETE FROM sudoku_challenge_invitations;
