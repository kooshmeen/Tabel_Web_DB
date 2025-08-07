-- New table for daily game submissions
-- This replaces the complex reset logic with a simple date-based approach
CREATE TABLE IF NOT EXISTS sudoku_daily_scores (
    id SERIAL PRIMARY KEY,
    player_id INT REFERENCES sudoku_players(id) ON DELETE CASCADE,
    play_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Best times for the day by difficulty
    best_time_easy INT DEFAULT NULL,
    best_time_medium INT DEFAULT NULL, 
    best_time_hard INT DEFAULT NULL,
    
    -- Best times with no mistakes for the day by difficulty
    best_time_easy_no_mistakes INT DEFAULT NULL,
    best_time_medium_no_mistakes INT DEFAULT NULL,
    best_time_hard_no_mistakes INT DEFAULT NULL,
    
    -- Count of completed games for the day by difficulty
    games_completed_easy INT DEFAULT 0,
    games_completed_medium INT DEFAULT 0,
    games_completed_hard INT DEFAULT 0,
    
    -- Count of completed games with no mistakes for the day by difficulty
    games_completed_easy_no_mistakes INT DEFAULT 0,
    games_completed_medium_no_mistakes INT DEFAULT 0,
    games_completed_hard_no_mistakes INT DEFAULT 0,
    
    -- Daily score (calculated based on games completed, difficulty, time, etc.)
    daily_score INT DEFAULT 0,
    
    -- Unique constraint: one record per player per day
    UNIQUE(player_id, play_date),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster queries by date ranges
CREATE INDEX IF NOT EXISTS idx_sudoku_daily_scores_date ON sudoku_daily_scores(play_date);
CREATE INDEX IF NOT EXISTS idx_sudoku_daily_scores_player_date ON sudoku_daily_scores(player_id, play_date);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sudoku_daily_scores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sudoku_daily_scores_updated_at
    BEFORE UPDATE ON sudoku_daily_scores
    FOR EACH ROW
    EXECUTE FUNCTION update_sudoku_daily_scores_updated_at();
