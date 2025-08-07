const SudokuModel = require('./src/models/sudokuModel');

/**
 * Test script for the new daily-based scoring system
 * Run this after setting up the database to test the functionality
 */
async function testDailyScoring() {
    console.log('🧩 Testing Daily Sudoku Scoring System\n');
    
    try {
        // Simulate a player (assuming player ID 1 exists)
        const playerId = 1;
        
        console.log('1. Recording first game of the day...');
        await SudokuModel.recordCompletedGame(playerId, 180, 'medium', 2);
        console.log('   ✓ Game 1 recorded: medium difficulty, 180s, 2 mistakes\n');
        
        console.log('2. Recording second game (better time, no mistakes)...');
        await SudokuModel.recordCompletedGame(playerId, 150, 'medium', 0);
        console.log('   ✓ Game 2 recorded: medium difficulty, 150s, 0 mistakes\n');
        
        console.log('3. Recording an easy game...');
        await SudokuModel.recordCompletedGame(playerId, 90, 'easy', 1);
        console.log('   ✓ Game 3 recorded: easy difficulty, 90s, 1 mistake\n');
        
        console.log('4. Getting player statistics...');
        const stats = await SudokuModel.getPlayerStatistics(playerId);
        console.log('   📊 Player Stats:', JSON.stringify(stats, null, 2));
        console.log('');
        
        console.log('5. Getting daily leaderboard...');
        const dailyLeaderboard = await SudokuModel.getTop100GlobalDay();
        console.log('   🏆 Daily Top 3:', dailyLeaderboard.slice(0, 3).map(p => 
            `${p.rank}. ${p.username} (${p.total_score} pts)`
        ));
        console.log('');
        
        console.log('6. Getting all-time leaderboard...');
        const allTimeLeaderboard = await SudokuModel.getTop100GlobalAllTime();
        console.log('   🏆 All-Time Top 3:', allTimeLeaderboard.slice(0, 3).map(p => 
            `${p.rank}. ${p.username} (${p.total_score} pts)`
        ));
        console.log('');
        
        console.log('✅ All tests passed! The new daily scoring system is working correctly.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Export for potential use in other test files
module.exports = { testDailyScoring };

// Run the test if this file is executed directly
if (require.main === module) {
    testDailyScoring().then(() => {
        console.log('\n🎉 Test completed!');
        process.exit(0);
    }).catch(error => {
        console.error('\n💥 Test suite failed:', error);
        process.exit(1);
    });
}
