# Sudoku API Documentation

## Base URL
All sudoku endpoints are prefixed with `/api/sudoku`

## Authentication
Most endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Public Endpoints (No Authentication Required)

### POST /register
Register a new sudoku player
```json
{
  "username": "player1",
  "email": "player1@example.com", 
  "password": "password123"
}
```

### POST /login
Login with email and password
```json
{
  "email": "player1@example.com",
  "password": "password123"
}
```
Returns: JWT token and user info

### GET /groups
Get all available groups

### GET /groups/search?searchTerm=name
Search groups by name or description

### GET /leaderboard/global?periodType=all&limit=10
Get global leaderboard
- periodType: all, day, week, month
- limit: number of results (default 10)

## Protected Endpoints (Authentication Required)

### User Profile
- **PUT /profile** - Update username
- **PUT /password** - Change password

### Game Submission
- **POST /submit-game** - Submit completed game
```json
{
  "timeSeconds": 245,
  "difficulty": "medium",
  "numberOfMistakes": 2
}
```

### Player Statistics
- **GET /stats** - Get player statistics
- **GET /medals** - Get player medals

### Group Management
- **POST /groups** - Create new group
```json
{
  "group_name": "My Group",
  "group_description": "A fun group",
  "group_password": "optional"
}
```

- **GET /my-groups** - Get groups where user is a member
- **GET /groups/:groupId** - Get group details with members and stats
- **POST /groups/:groupId/join** - Join a group
```json
{
  "group_password": "password if required"
}
```

- **DELETE /groups/:groupId/leave** - Leave a group
- **DELETE /groups/:groupId** - Delete group (leaders only)

### Group Leaderboard
- **GET /groups/:groupId/leaderboard?periodType=all&limit=10** - Get group leaderboard

### Group Member Management (Leaders Only)
- **PUT /groups/:groupId/members/:memberId/role** - Set member role
```json
{
  "role": "leader" // or "member"
}
```

### Admin Endpoints
- **POST /players/:playerId/medals** - Award medal to player
```json
{
  "medalType": "fastest_time",
  "description": "Fastest time in hard difficulty",
  "numberOfMedals": 1
}
```

## Database Tables Used

### sudoku_players
- Player accounts with username, email, password

### sudoku_score  
- Player statistics including best times, total completed games, scores

### sudoku_groups & sudoku_group_members
- Group management with roles (leader/member)

### sudoku_leaderboard & sudoku_group_leaderboard
- Global and group leaderboards for different time periods

### sudoku_player_medals
- Player achievements and medals

## Key Features Implemented

1. **Complete Authentication System** - Registration, login, profile management
2. **Game Submission with Smart Scoring** - Calculates scores based on difficulty, time, and mistakes
3. **Best Time Tracking** - Only updates if new time is better
4. **Group System** - Create, join, manage groups with roles
5. **Leaderboards** - Global and group leaderboards for multiple time periods
6. **Statistics Tracking** - Comprehensive player and group statistics
7. **Medal System** - Award and track player achievements

## Fixed Issues in Model

1. ✅ Fixed method name mismatch (`setRoleForMember` → `setRole`)
2. ✅ Fixed column name mismatch (`user_id` → `player_id`) 
3. ✅ Added missing database constraints for ON CONFLICT clauses
4. ✅ Enhanced error handling throughout
5. ✅ Added proper score calculation and period management
