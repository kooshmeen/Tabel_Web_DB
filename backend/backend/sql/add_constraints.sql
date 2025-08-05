-- Add missing unique constraints for ON CONFLICT clauses to work

-- Add unique constraint for sudoku_leaderboard
ALTER TABLE sudoku_leaderboard 
ADD CONSTRAINT unique_leaderboard_entry 
UNIQUE (player_id, period_type, period_start);

-- Add unique constraint for sudoku_group_leaderboard  
ALTER TABLE sudoku_group_leaderboard 
ADD CONSTRAINT unique_group_leaderboard_entry 
UNIQUE (group_id, player_id, period_type, period_start);

-- Add unique constraint for sudoku_player_medals
ALTER TABLE sudoku_player_medals 
ADD CONSTRAINT unique_player_medal 
UNIQUE (player_id, medal_type);
