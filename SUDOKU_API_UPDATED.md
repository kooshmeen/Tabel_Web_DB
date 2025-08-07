# Sudoku API - Updated Game Submission System

## Overview

The Sudoku API has been updated with a new daily-based scoring system that eliminates complex period resets and provides more efficient leaderboard calculations.

## Key Changes

### Game Submission

**Endpoint:** `POST /api/sudoku/submit-game`

**Request Body:**
```json
{
    "timeSeconds": 245,
    "difficulty": "medium",
    "numberOfMistakes": 2
}
```

**Response:**
```json
{
    "message": "Game submitted successfully"
}
```

**How it works:**
- Each game submission updates the player's daily record
- If it's the first game of the day, a new record is created
- Subsequent games update best times, increment counters, and add to daily score
- Best times are only updated if the new time is better
- No-mistake games are tracked separately

### Scoring Algorithm

Games are scored based on:
- **Base score by difficulty**: Easy (10), Medium (20), Hard (30)
- **No-mistake bonus**: 1.5x multiplier
- **Time bonus**: Logarithmic scale favoring faster completion
- **Final formula**: `base × no_mistake_bonus × time_bonus`

### Leaderboard Endpoints

All leaderboard endpoints now calculate results dynamically:

#### Global Leaderboards

- `GET /api/sudoku/leaderboard/global/all-time` - Top 100 all-time
- `GET /api/sudoku/leaderboard/global/monthly` - Top 100 this month  
- `GET /api/sudoku/leaderboard/global/weekly` - Top 100 this week
- `GET /api/sudoku/leaderboard/global/daily` - Top 100 today

#### Group Leaderboards

- `GET /api/sudoku/groups/:groupId/leaderboard?period=all` - Group all-time
- `GET /api/sudoku/groups/:groupId/leaderboard?period=month` - Group monthly
- `GET /api/sudoku/groups/:groupId/leaderboard?period=week` - Group weekly  
- `GET /api/sudoku/groups/:groupId/leaderboard?period=day` - Group daily

#### Response Format

```json
{
    "leaderboard": [
        {
            "id": 1,
            "username": "player1",
            "total_score": 1250,
            "total_games": 15,
            "best_overall_time": 145,
            "rank": 1
        }
    ],
    "periodType": "day",
    "limit": 100
}
```

### Player Statistics

**Endpoint:** `GET /api/sudoku/stats`

**Response:**
```json
{
    "stats": {
        "days_played": 5,
        "total_games_completed": 23,
        "total_easy_completed": 8,
        "total_medium_completed": 10,
        "total_hard_completed": 5,
        "total_no_mistake_games": 7,
        "total_score": 2450,
        "best_overall_time": 89,
        "best_time_easy": 89,
        "best_time_medium": 156,
        "best_time_hard": 245,
        "avg_time_easy": 95.5,
        "avg_time_medium": 178.2,
        "avg_time_hard": 289.4
    }
}
```

## Database Schema Changes

### New Table: `sudoku_daily_scores`

This table stores one record per player per day with aggregated statistics:

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

## Migration

To migrate to the new system:

1. Run the database migration:
   ```bash
   ./migrate_to_daily_scores.sh
   ```

2. Update your client code to use `numberOfMistakes` instead of `noMistakes`:
   ```javascript
   // Old format
   { timeSeconds: 245, difficulty: "medium", noMistakes: false }
   
   // New format  
   { timeSeconds: 245, difficulty: "medium", numberOfMistakes: 2 }
   ```

3. Test the new system with the provided test script:
   ```bash
   cd backend && node test_daily_scoring.js
   ```

## Benefits

1. **No Reset Logic**: Eliminates complex period reset scheduling
2. **Better Performance**: Dynamic queries are more efficient than maintaining separate leaderboard tables
3. **Data Integrity**: No risk of data loss during period transitions
4. **Flexibility**: Easy to add new time periods or modify scoring
5. **Debugging**: Clear audit trail of daily performance
