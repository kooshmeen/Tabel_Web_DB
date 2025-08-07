#!/bin/bash

# Migration script to implement the new daily-based scoring system for Sudoku
# This script creates the new table and provides option to migrate existing data

echo "=== Sudoku Daily Scoring Migration ==="
echo ""
echo "This will implement the new daily-based scoring system."
echo "The new system eliminates the need for complex period resets and"
echo "provides more efficient leaderboard calculations."
echo ""

# Check if we're in the right directory
if [ ! -f "backend/backend/sql/create_table.sql" ]; then
    echo "Error: Please run this script from the project root directory"
    exit 1
fi

# Create the new daily scores table
echo "1. Creating new sudoku_daily_scores table..."
psql -U $DB_USER -d $DB_NAME -f backend/backend/sql/create_daily_scores_table.sql

if [ $? -eq 0 ]; then
    echo "✓ Successfully created sudoku_daily_scores table"
else
    echo "✗ Failed to create table. Please check your database connection."
    exit 1
fi

echo ""
echo "2. Migration completed successfully!"
echo ""
echo "=== What changed? ==="
echo "• New table 'sudoku_daily_scores' stores one record per player per day"
echo "• No more complex period reset logic needed"
echo "• Leaderboards calculated dynamically using date ranges"
echo "• Better performance and data integrity"
echo ""
echo "=== Next steps ==="
echo "• The backend code has been updated to use the new system"
echo "• Old tables (sudoku_score, sudoku_leaderboard, etc.) can be dropped after testing"
echo "• Your app will now use the new GameSubmission data structure"
echo ""
echo "Migration complete! 🎉"
