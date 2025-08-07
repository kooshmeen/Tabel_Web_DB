# Daily-Based Sudoku Scoring System

## Overview

This system replaces the complex period reset logic with a simple, efficient daily-based approach for tracking sudoku game submissions and leaderboards.

## Key Improvements

### Before (Problems with the old system)
- Complex reset logic requiring system state tracking
- Prone to data loss if resets fail
- Required server-side period management
- Performance issues with frequent updates to leaderboard tables

### After (New daily-based system)
- ✅ One record per player per day
- ✅ No reset logic needed
- ✅ Dynamic leaderboard calculation using date ranges
- ✅ Better performance and data integrity
- ✅ Easier to debug and maintain

## Database Schema

### New Table: `sudoku_daily_scores`

```sql
CREATE TABLE sudoku_daily_scores (
    id SERIAL PRIMARY KEY,
    player_id INT REFERENCES sudoku_players(id),
    play_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Best times by difficulty
    best_time_easy INT,
    best_time_medium INT, 
    best_time_hard INT,
    
    -- Best times with no mistakes
    best_time_easy_no_mistakes INT,
    best_time_medium_no_mistakes INT,
    best_time_hard_no_mistakes INT,
    
    -- Game counts by difficulty
    games_completed_easy INT DEFAULT 0,
    games_completed_medium INT DEFAULT 0,
    games_completed_hard INT DEFAULT 0,
    
    -- No-mistake game counts
    games_completed_easy_no_mistakes INT DEFAULT 0,
    games_completed_medium_no_mistakes INT DEFAULT 0,
    games_completed_hard_no_mistakes INT DEFAULT 0,
    
    -- Daily total score
    daily_score INT DEFAULT 0,
    
    UNIQUE(player_id, play_date)
);
```

## API Changes

### Game Submission
The `POST /submit-game` endpoint now accepts:

```javascript
{
    "timeSeconds": 245,
    "difficulty": "medium", 
    "numberOfMistakes": 2
}
```

When a game is submitted:
1. If it's the first game of the day for this player, a new record is created
2. If the player already has a record for today, it's updated with:
   - New best time (if better)
   - Incremented game count
   - Added score

### Leaderboard Queries

Leaderboards are now calculated dynamically:

- **All-time**: Sum scores from all dates
- **Monthly**: Sum scores from current month start
- **Weekly**: Sum scores from current week start (Sunday)
- **Daily**: Sum scores from today only

## Scoring Algorithm

```javascript
calculateGameScore(difficulty, timeSeconds, noMistakes) {
    const baseScores = { easy: 10, medium: 20, hard: 30 };
    let score = baseScores[difficulty];
    
    if (noMistakes) score *= 1.5;
    
    // Time bonus (logarithmic scale)
    const timeBonusMultiplier = Math.max(0.5, 2 - Math.log10(timeSeconds / 60));
    score *= timeBonusMultiplier;
    
    return Math.round(score);
}
```

## Benefits

1. **Simplified Architecture**: No more complex reset scheduling
2. **Better Data Integrity**: No risk of losing data during resets
3. **Flexible Querying**: Easy to add new time periods
4. **Performance**: More efficient queries using indexed date ranges
5. **Debugging**: Clear audit trail of daily performance

## Migration

Run the migration script to set up the new system:

```bash
./migrate_to_daily_scores.sh
```

This will:
- Create the new `sudoku_daily_scores` table
- Update database indexes
- Keep existing tables for reference

## Testing

To test the new system:

1. Submit a few games using the existing API
2. Check the `sudoku_daily_scores` table to see records being created/updated
3. Query leaderboards to see dynamic calculation working
4. Test across day boundaries to ensure proper date handling
