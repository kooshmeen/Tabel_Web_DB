const express = require('express');
const SudokuController = require('../controllers/sudokuController');
const sudokuAuthMiddleware = require('../middleware/sudokuAuthMiddleware');

const router = express.Router();

// Public routes (no authentication required)
router.post('/register', SudokuController.register);
router.post('/login', SudokuController.login);
router.get('/groups', SudokuController.getAllGroups);
router.get('/groups/search', SudokuController.searchGroups);
router.get('/leaderboard/global', SudokuController.getGlobalLeaderboard);

// Specific leaderboard routes
router.get('/leaderboard/global/all-time', SudokuController.getTop100GlobalAllTime);
router.get('/leaderboard/global/monthly', SudokuController.getTop100GlobalMonth);
router.get('/leaderboard/global/weekly', SudokuController.getTop100GlobalWeek);
router.get('/leaderboard/global/daily', SudokuController.getTop100GlobalDay);

// Protected routes (authentication required)
router.use(sudokuAuthMiddleware); // All routes below this will require authentication

// User profile routes
router.put('/profile', SudokuController.updateProfile);
router.put('/password', SudokuController.changePassword);

// Game submission
router.post('/submit-game', SudokuController.submitGame);

// Player statistics and medals
router.get('/stats', SudokuController.getPlayerStats);
router.get('/medals', SudokuController.getPlayerMedals);

// Group management routes
router.post('/groups', SudokuController.createGroup);
router.get('/my-groups', SudokuController.getMyGroups);
router.get('/groups/:groupId', SudokuController.getGroupDetails);
router.post('/groups/:groupId/join', SudokuController.joinGroup);
router.delete('/groups/:groupId/leave', SudokuController.leaveGroup);
router.delete('/groups/:groupId', SudokuController.deleteGroup);

// Group leaderboard
router.get('/groups/:groupId/leaderboard', SudokuController.getGroupLeaderboard);

// Group member management (leaders only)
router.put('/groups/:groupId/members/:memberId/role', SudokuController.setMemberRole);

// Admin routes (for awarding medals - could be restricted further with admin middleware)
router.post('/players/:playerId/medals', SudokuController.awardMedal);

module.exports = router;
