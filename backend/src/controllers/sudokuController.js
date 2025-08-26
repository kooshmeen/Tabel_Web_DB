const SudokuModel = require('../models/sudokuModel');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

class SudokuController {
    /**
    * Register a new sudoku player
    */
    static async register(req, res) {
        try {
            const { username, email, password } = req.body;
            
            if (!username || !email || !password) {
                return res.status(400).json({ 
                    error: 'Username, email, and password are required' 
                });
            }
            
            // Check if user already exists
            const existingUser = await SudokuModel.getUserByEmail(email);
            if (existingUser) {
                return res.status(409).json({ 
                    error: 'User with this email already exists' 
                });
            }
            
            const user = await SudokuModel.createUser({ username, email, password });
            
            // Remove password from response
            const { password: _, ...userResponse } = user;
            
            res.status(201).json({
                message: 'User registered successfully',
                user: userResponse
            });
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ error: 'Error registering user' });
        }
    }
    
    /**
    * Login a sudoku player
    */
    static async login(req, res) {
        try {
            const { email, password } = req.body;
            
            if (!email || !password) {
                return res.status(400).json({ 
                    error: 'Email and password are required' 
                });
            }
            
            const user = await SudokuModel.authenticateUser(email, password);
            if (!user) {
                return res.status(401).json({ 
                    error: 'Invalid email or password' 
                });
            }
            
            // Generate JWT token
            const token = jwt.sign(
                { userId: user.id, email: user.email },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '24h' }
            );
            
            res.json({
                message: 'Login successful',
                token,
                user
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Error logging in' });
        }
    }
    
    /**
    * Update user profile
    */
    static async updateProfile(req, res) {
        try {
            const userId = req.user.userId;
            const { username } = req.body;
            
            if (!username) {
                return res.status(400).json({ 
                    error: 'Username is required' 
                });
            }
            
            const updatedUser = await SudokuModel.updateUser(userId, { username });
            
            // Remove password from response
            const { password: _, ...userResponse } = updatedUser;
            
            res.json({
                message: 'Profile updated successfully',
                user: userResponse
            });
        } catch (error) {
            console.error('Update profile error:', error);
            res.status(500).json({ error: 'Error updating profile' });
        }
    }
    
    /**
    * Change user password
    */
    static async changePassword(req, res) {
        try {
            const userId = req.user.userId;
            const { newPassword } = req.body;
            
            if (!newPassword) {
                return res.status(400).json({ 
                    error: 'New password is required' 
                });
            }
            
            await SudokuModel.changePassword(userId, newPassword);
            
            res.json({
                message: 'Password changed successfully'
            });
        } catch (error) {
            console.error('Change password error:', error);
            res.status(500).json({ error: 'Error changing password' });
        }
    }
    
    /**
    * Submit a completed game
    */
    static async submitGame(req, res) {
        try {
            const userId = req.user.userId;
            const { timeSeconds, difficulty, numberOfMistakes } = req.body;
            
            if (!timeSeconds || !difficulty || numberOfMistakes === undefined) {
                return res.status(400).json({ 
                    error: 'Time, difficulty, and numberOfMistakes are required' 
                });
            }
            
            if (!['easy', 'medium', 'hard'].includes(difficulty)) {
                return res.status(400).json({ 
                    error: 'Difficulty must be easy, medium, or hard' 
                });
            }
            
            await SudokuModel.recordCompletedGame(userId, timeSeconds, difficulty, numberOfMistakes);
            
            res.json({
                message: 'Game submitted successfully'
            });
        } catch (error) {
            console.error('Submit game error:', error);
            res.status(500).json({ error: 'Error submitting game' });
        }
    }
    
    /**
    * Get player statistics
    */
    static async getPlayerStats(req, res) {
        try {
            const userId = req.user.userId;
            
            const stats = await SudokuModel.getPlayerStatistics(userId);
            
            res.json({
                stats
            });
        } catch (error) {
            console.error('Get player stats error:', error);
            res.status(500).json({ error: 'Error retrieving player statistics' });
        }
    }
    
    /**
    * Get player medals
    */
    static async getPlayerMedals(req, res) {
        try {
            const userId = req.user.userId;
            
            const medals = await SudokuModel.getMedalsForPlayer(userId);
            
            res.json({
                medals
            });
        } catch (error) {
            console.error('Get player medals error:', error);
            res.status(500).json({ error: 'Error retrieving player medals' });
        }
    }
    
    /**
    * Get global leaderboard
    */
    static async getGlobalLeaderboard(req, res) {
        try {
            const { periodType = 'all', limit = 10 } = req.query;
            
            let periodStart = null;
            if (periodType !== 'all') {
                const now = new Date();
                if (periodType === 'day') {
                    periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                } else if (periodType === 'week') {
                    periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    periodStart.setDate(periodStart.getDate() - periodStart.getDay());
                } else if (periodType === 'month') {
                    periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
                }
            }
            
            const leaderboard = await SudokuModel.getTopGlobalLeaderboard(
                periodType, 
                periodStart, 
                parseInt(limit)
            );
            
            res.json({
                leaderboard,
                periodType,
                limit: parseInt(limit)
            });
        } catch (error) {
            console.error('Get global leaderboard error:', error);
            res.status(500).json({ error: 'Error retrieving global leaderboard' });
        }
    }
    
    /**
    * Get top 100 global all-time leaderboard
    */
    static async getTop100GlobalAllTime(req, res) {
        try {
            const leaderboard = await SudokuModel.getTop100GlobalAllTime();
            
            res.json({
                leaderboard,
                periodType: 'all',
                limit: 100
            });
        } catch (error) {
            console.error('Get top 100 global all-time error:', error);
            res.status(500).json({ error: 'Error retrieving top 100 global all-time leaderboard' });
        }
    }
    
    /**
    * Get top 100 global monthly leaderboard
    */
    static async getTop100GlobalMonth(req, res) {
        try {
            const leaderboard = await SudokuModel.getTop100GlobalMonth();
            
            res.json({
                leaderboard,
                periodType: 'month',
                limit: 100
            });
        } catch (error) {
            console.error('Get top 100 global monthly error:', error);
            res.status(500).json({ error: 'Error retrieving top 100 global monthly leaderboard' });
        }
    }
    
    /**
    * Get top 100 global weekly leaderboard
    */
    static async getTop100GlobalWeek(req, res) {
        try {
            const leaderboard = await SudokuModel.getTop100GlobalWeek();
            
            res.json({
                leaderboard,
                periodType: 'week',
                limit: 100
            });
        } catch (error) {
            console.error('Get top 100 global weekly error:', error);
            res.status(500).json({ error: 'Error retrieving top 100 global weekly leaderboard' });
        }
    }
    
    /**
    * Get top 100 global daily leaderboard
    */
    static async getTop100GlobalDay(req, res) {
        try {
            const leaderboard = await SudokuModel.getTop100GlobalDay();
            
            res.json({
                leaderboard,
                periodType: 'day',
                limit: 100
            });
        } catch (error) {
            console.error('Get top 100 global daily error:', error);
            res.status(500).json({ error: 'Error retrieving top 100 global daily leaderboard' });
        }
    }
    
    /**
    * Create a new group
    */
    static async createGroup(req, res) {
        try {
            const userId = req.user.userId;
            const { group_name, group_description, group_password } = req.body;
            
            if (!group_name) {
                return res.status(400).json({ 
                    error: 'Group name is required' 
                });
            }
            
            const group = await SudokuModel.createGroup(
                { group_name, group_description, group_password },
                userId
            );
            
            res.status(201).json({
                message: 'Group created successfully',
                group
            });
        } catch (error) {
            console.error('Create group error:', error);
            res.status(500).json({ error: 'Error creating group' });
        }
    }
    
    /**
    * Get all groups
    */
    static async getAllGroups(req, res) {
        try {
            // Get current user ID if authenticated, otherwise null for public view
            const currentUserId = req.user ? req.user.userId : null;
            const groups = await SudokuModel.getAllGroups(currentUserId);
            
            res.json({
                groups
            });
        } catch (error) {
            console.error('Get all groups error:', error);
            res.status(500).json({ error: 'Error retrieving groups' });
        }
    }
    
    /**
    * Search groups
    */
    static async searchGroups(req, res) {
        try {
            const { searchTerm } = req.query;
            
            if (!searchTerm) {
                return res.status(400).json({ 
                    error: 'Search term is required' 
                });
            }
            
            // Get current user ID if authenticated, otherwise null for public view
            const currentUserId = req.user ? req.user.userId : null;
            const groups = await SudokuModel.searchGroups(searchTerm, currentUserId);
            
            res.json({
                groups,
                searchTerm
            });
        } catch (error) {
            console.error('Search groups error:', error);
            res.status(500).json({ error: 'Error searching groups' });
        }
    }
    
    /**
    * Get groups for current player
    */
    static async getMyGroups(req, res) {
        try {
            const userId = req.user.userId;
            
            const groups = await SudokuModel.getGroupsForPlayer(userId);
            
            res.json({
                groups
            });
        } catch (error) {
            console.error('Get my groups error:', error);
            res.status(500).json({ error: 'Error retrieving user groups' });
        }
    }
    
    /**
    * Get group details including members
    */
    static async getGroupDetails(req, res) {
        try {
            const { groupId } = req.params;
            const currentUserId = req.user ? req.user.userId : null;
            
            const group = await SudokuModel.getGroupById(parseInt(groupId), currentUserId);
            if (!group) {
                return res.status(404).json({ 
                    error: 'Group not found' 
                });
            }
            
            const members = await SudokuModel.getGroupMembers(parseInt(groupId));
            const stats = await SudokuModel.getGroupStatistics(parseInt(groupId));
            
            res.json({
                group,
                members,
                stats
            });
        } catch (error) {
            console.error('Get group details error:', error);
            res.status(500).json({ error: 'Error retrieving group details' });
        }
    }
    
    /**
    * Join a group
    */
    static async joinGroup(req, res) {
        try {
            const userId = req.user.userId;
            const { groupId } = req.params;
            
            // Safely extract group_password from req.body, defaulting to undefined if req.body is undefined
            const group_password = req.body ? req.body.group_password : undefined;
            
            const group = await SudokuModel.getGroupById(parseInt(groupId), userId);
            if (!group) {
                return res.status(404).json({ 
                    error: 'Group not found' 
                });
            }
            
            // Check if group has password and verify it
            if (group.group_password && group.group_password !== group_password) {
                return res.status(403).json({ 
                    error: 'Invalid group password' 
                });
            }
            
            await SudokuModel.addMemberToGroup(parseInt(groupId), userId);
            
            res.json({
                message: 'Successfully joined group'
            });
        } catch (error) {
            console.error('Join group error:', error);
            if (error.message.includes('duplicate')) {
                res.status(409).json({ error: 'Already a member of this group' });
            } else {
                res.status(500).json({ error: 'Error joining group' });
            }
        }
    }
    
    /**
    * Join a group with password (alternative endpoint for frontend compatibility)
    */
    static async joinGroupWithPassword(req, res) {
        try {
            const userId = req.user.userId;
            const { groupId } = req.params;
            
            // Extract password from req.body (frontend sends "password" not "group_password")
            const password = req.body ? req.body.password : undefined;
            
            const group = await SudokuModel.getGroupById(parseInt(groupId), userId);
            if (!group) {
                return res.status(404).json({ 
                    error: 'Group not found' 
                });
            }
            
            // Check if group has password and verify it
            if (group.group_password && group.group_password !== password) {
                return res.status(403).json({ 
                    error: 'Invalid group password' 
                });
            }
            
            await SudokuModel.addMemberToGroup(parseInt(groupId), userId);
            
            res.json({
                message: 'Successfully joined group'
            });
        } catch (error) {
            console.error('Join group with password error:', error);
            if (error.message.includes('duplicate')) {
                res.status(409).json({ error: 'Already a member of this group' });
            } else {
                res.status(500).json({ error: 'Error joining group' });
            }
        }
    }
    
    /**
    * Leave a group
    */
    static async leaveGroup(req, res) {
        try {
            const userId = req.user.userId;
            const { groupId } = req.params;
            
            await SudokuModel.removeMemberFromGroup(parseInt(groupId), userId);
            
            res.json({
                message: 'Successfully left group'
            });
        } catch (error) {
            console.error('Leave group error:', error);
            res.status(500).json({ error: 'Error leaving group' });
        }
    }
    
    /**
    * Get group leaderboard
    */
    static async getGroupLeaderboard(req, res) {
        try {
            const { groupId } = req.params;
            const { periodType = 'all', limit = 10 } = req.query;
            
            let periodStart = null;
            if (periodType !== 'all') {
                const now = new Date();
                if (periodType === 'day') {
                    periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                } else if (periodType === 'week') {
                    periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    periodStart.setDate(periodStart.getDate() - periodStart.getDay());
                } else if (periodType === 'month') {
                    periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
                }
            }
            
            const leaderboard = await SudokuModel.getTopGroupLeaderboard(
                parseInt(groupId),
                periodType, 
                periodStart, 
                parseInt(limit)
            );
            
            res.json({
                leaderboard,
                groupId: parseInt(groupId),
                periodType,
                limit: parseInt(limit)
            });
        } catch (error) {
            console.error('Get group leaderboard error:', error);
            res.status(500).json({ error: 'Error retrieving group leaderboard' });
        }
    }
    
    /**
    * Delete a group (leaders only)
    */
    static async deleteGroup(req, res) {
        try {
            const userId = req.user.userId;
            const { groupId } = req.params;
            
            await SudokuModel.deleteGroup(parseInt(groupId), userId);
            
            res.json({
                message: 'Group deleted successfully'
            });
        } catch (error) {
            console.error('Delete group error:', error);
            if (error.message.includes('Only leaders')) {
                res.status(403).json({ error: 'Only group leaders can delete the group' });
            } else {
                res.status(500).json({ error: 'Error deleting group' });
            }
        }
    }
    
    /**
    * Set member role (leaders only)
    */
    static async setMemberRole(req, res) {
        try {
            const currentUserId = req.user.userId;
            const { groupId, memberId } = req.params;
            const { role } = req.body;
            
            if (!['member', 'leader'].includes(role)) {
                return res.status(400).json({ 
                    error: 'Role must be either member or leader' 
                });
            }
            
            // Check if current user is a leader of the group
            const queryCheck = `
                SELECT role FROM sudoku_group_members
                WHERE group_id = $1 AND player_id = $2;
            `;
            const result = await pool.query(queryCheck, [parseInt(groupId), currentUserId]);
            
            if (result.rows.length === 0 || result.rows[0].role !== 'leader') {
                return res.status(403).json({ 
                    error: 'Only group leaders can change member roles' 
                });
            }
            
            await SudokuModel.setRole(parseInt(groupId), parseInt(memberId), role);
            
            res.json({
                message: 'Member role updated successfully'
            });
        } catch (error) {
            console.error('Set member role error:', error);
            res.status(500).json({ error: 'Error updating member role' });
        }
    }
    
    /**
    * Award medal to player (admin functionality)
    */
    static async awardMedal(req, res) {
        try {
            const { playerId } = req.params;
            const { medalType, description, numberOfMedals = 1 } = req.body;
            
            if (!medalType || !description) {
                return res.status(400).json({ 
                    error: 'Medal type and description are required' 
                });
            }
            
            await SudokuModel.awardMedal(
                parseInt(playerId), 
                medalType, 
                description, 
                numberOfMedals
            );
            
            res.json({
                message: 'Medal awarded successfully'
            });
        } catch (error) {
            console.error('Award medal error:', error);
            res.status(500).json({ error: 'Error awarding medal' });
        }
    }
    
    //region challenge
    /**
    * Create a challenge invitation (with type selection)
    * POST /api/sudoku/groups/:groupId/challenge
    */
    static async createChallenge(req, res) {
        try {
            const challengerId = req.user.userId;
            const { groupId } = req.params;
            const { challengedId, difficulty, challengeType } = req.body; // Add challengeType
            
            // Validate inputs
            if (!challengedId || !difficulty || !challengeType) {
                return res.status(400).json({ 
                    error: 'challengedId, difficulty, and challengeType are required' 
                });
            }
            
            if (!['easy', 'medium', 'hard'].includes(difficulty)) {
                return res.status(400).json({ error: 'Invalid difficulty' });
            }
            
            if (!['online', 'offline'].includes(challengeType)) {
                return res.status(400).json({ error: 'Challenge type must be online or offline' });
            }
            
            // Check if both players are in the group
            const areInGroup = await SudokuModel.checkPlayersInGroup(challengerId, challengedId, groupId);
            if (!areInGroup) {
                return res.status(403).json({ error: 'Both players must be in the group' });
            }
            
            // Generate puzzle data
            const puzzleData = await SudokuModel.generatePuzzle(difficulty);
            
            if (challengeType === 'offline') {
                // For offline challenges, create invitation and return puzzle for challenger to play
                const challengeId = await SudokuModel.createChallenge({
                    challengerId,
                    challengedId, 
                    groupId,
                    difficulty,
                    challengeType,
                    puzzleData: JSON.stringify(puzzleData)
                });
                
                res.json({ 
                    message: 'Offline challenge created',
                    challengeId,
                    puzzleData, // Return puzzle for challenger to play immediately
                    requiresChallengerCompletion: true
                });
            } else {
                // For online challenges, create live match
                const matchId = await SudokuModel.createLiveMatch({
                    challengerId,
                    challengedId,
                    groupId,
                    difficulty,
                    puzzleData: JSON.stringify(puzzleData)
                });
                
                res.json({ 
                    message: 'Online challenge created',
                    matchId,
                    status: 'waiting_for_acceptance'
                });
            }
        } catch (error) {
            console.error('Create challenge error:', error);
            res.status(500).json({ error: 'Error creating challenge' });
        }
    }
    
    /**
    * Get pending challenges for current user
    * GET /api/sudoku/challenges/pending
    */
    static async getPendingChallenges(req, res) {
        try {
            const userId = req.user.userId;
            const challenges = await SudokuModel.getPendingChallenges(userId);
            res.json({ challenges });
        } catch (error) {
            console.error('Get pending challenges error:', error);
            res.status(500).json({ error: 'Error fetching challenges' });
        }
    }
    
    /**
    * Accept a challenge and start the game
    * POST /api/sudoku/challenges/:challengeId/accept
    */
    static async acceptChallenge(req, res) {
        try {
            const userId = req.user.userId;
            const { challengeId } = req.params;
            
            const challenge = await SudokuModel.getChallengeById(challengeId);
            if (!challenge) {
                return res.status(404).json({ error: 'Challenge not found' });
            }
            
            if (challenge.challenged_id !== userId) {
                return res.status(403).json({ error: 'Not authorized to accept this challenge' });
            }
            
            if (challenge.status !== 'pending') {
                return res.status(400).json({ error: 'Challenge is no longer pending' });
            }
            
            await SudokuModel.acceptChallenge(challengeId);
            
            res.json({ 
                message: 'Challenge accepted',
                puzzleData: JSON.parse(challenge.puzzle_data),
                challengerTime: challenge.challenger_time,
                difficulty: challenge.difficulty
            });
        } catch (error) {
            console.error('Accept challenge error:', error);
            res.status(500).json({ error: 'Error accepting challenge' });
        }
    }
    
    /**
    * Complete a challenge (submit challenger's game or challenged player's response)
    * POST /api/sudoku/challenges/:challengeId/complete
    */
    static async completeChallenge(req, res) {
        try {
            const userId = req.user.userId;
            const { challengeId } = req.params;
            const { timeSeconds, numberOfMistakes } = req.body;
            
            const result = await SudokuModel.completeChallenge(challengeId, userId, {
                timeSeconds,
                numberOfMistakes
            });
            
            res.json(result);
        } catch (error) {
            console.error('Complete challenge error:', error);
            res.status(500).json({ error: 'Error completing challenge' });
        }
    }
    
    /**
    * Reject a challenge
    * POST /api/sudoku/challenges/:challengeId/reject
    */
    static async rejectChallenge(req, res) {
        try {
            const userId = req.user.userId;
            const { challengeId } = req.params;
            
            const challenge = await SudokuModel.getChallengeById(challengeId);
            if (!challenge) {
                return res.status(404).json({ error: 'Challenge not found' });
            }
            
            if (challenge.challenged_id !== userId) {
                return res.status(403).json({ error: 'Not authorized to reject this challenge' });
            }
            
            if (challenge.status !== 'pending') {
                return res.status(400).json({ error: 'Challenge is no longer pending' });
            }
            
            await SudokuModel.rejectChallenge(challengeId);
            
            res.json({ message: 'Challenge rejected successfully' });
        } catch (error) {
            console.error('Reject challenge error:', error);
            res.status(500).json({ error: 'Error rejecting challenge' });
        }
    }
    
    /**
    * Complete challenger's game and update puzzle data
    * POST /api/sudoku/challenges/:challengeId/complete-challenger
    */
    static async completeChallengerGame(req, res) {
        try {
            const userId = req.user.userId;
            const { challengeId } = req.params;
            const { timeSeconds, numberOfMistakes, puzzleData } = req.body;
            
            const challenge = await SudokuModel.getChallengeById(challengeId);
            if (!challenge) {
                return res.status(404).json({ error: 'Challenge not found' });
            }
            
            if (challenge.challenger_id !== userId) {
                return res.status(403).json({ error: 'Not authorized to complete this challenge' });
            }
            
            // Calculate score and update challenge with puzzle data
            const result = await SudokuModel.completeChallengerGameWithPuzzle(challengeId, {
                timeSeconds,
                numberOfMistakes,
                puzzleData
            });
            
            res.json(result);
        } catch (error) {
            console.error('Complete challenger game error:', error);
            res.status(500).json({ error: 'Error completing challenger game' });
        }
    }
    
    /**
    * Get pending live matches for current user
    * GET /api/sudoku/matches/pending
    */
    static async getPendingLiveMatches(req, res) {
        try {
            const userId = req.user.userId;
            const matches = await SudokuModel.getPendingLiveMatches(userId);
            res.json({ matches });
        } catch (error) {
            console.error('Get pending live matches error:', error);
            res.status(500).json({ error: 'Error fetching live matches' });
        }
    }
    
    /**
    * Accept a live match
    * POST /api/sudoku/matches/:matchId/accept
    */
    static async acceptLiveMatch(req, res) {
        try {
            const userId = req.user.userId;
            const { matchId } = req.params;
            
            const match = await SudokuModel.getLiveMatchById(matchId);
            if (!match) {
                return res.status(404).json({ error: 'Match not found' });
            }
            
            if (match.challenged_id !== userId) {
                return res.status(403).json({ error: 'Not authorized to accept this match' });
            }
            
            const updatedMatch = await SudokuModel.acceptLiveMatch(matchId);
            
            res.json({ 
                message: 'Live match accepted',
                puzzleData: JSON.parse(updatedMatch.puzzle_data),
                matchId: updatedMatch.id
            });
        } catch (error) {
            console.error('Accept live match error:', error);
            res.status(500).json({ error: 'Error accepting live match' });
        }
    }
    
    /**
    * Get challenge data without accepting it
    * GET /api/sudoku/challenges/:challengeId/data
    */
    static async getChallengeData(req, res) {
        try {
            const userId = req.user.userId;
            const { challengeId } = req.params;
            
            const challenge = await SudokuModel.getChallengeById(challengeId);
            if (!challenge) {
                return res.status(404).json({ error: 'Challenge not found' });
            }
            
            // Only challenger or challenged can view challenge data
            if (challenge.challenger_id !== userId && challenge.challenged_id !== userId) {
                return res.status(403).json({ error: 'Not authorized to view this challenge' });
            }
            
            res.json({
                challengeId: challenge.id,
                puzzleData: JSON.parse(challenge.puzzle_data),
                challengerTime: challenge.challenger_time,
                challengerScore: challenge.challenger_score,
                challengerMistakes: challenge.challenger_mistakes,
                difficulty: challenge.difficulty,
                status: challenge.status
            });
        } catch (error) {
            console.error('Get challenge data error:', error);
            res.status(500).json({ error: 'Error getting challenge data' });
        }
    }
    
    /**
    * Get live match details
    * GET /api/sudoku/matches/:matchId
    */
    static async getLiveMatchDetails(req, res) {
        try {
            const userId = req.user.userId;
            const { matchId } = req.params;
            
            const match = await SudokuModel.getLiveMatchById(parseInt(matchId));
            if (!match) {
                return res.status(404).json({ error: 'Live match not found' });
            }
            
            // Only challenger or challenged can view match details
            if (match.challenger_id !== userId && match.challenged_id !== userId) {
                return res.status(403).json({ error: 'Not authorized to view this match' });
            }
            
            res.json({
                match
            });
        } catch (error) {
            console.error('Get live match details error:', error);
            res.status(500).json({ error: 'Error retrieving live match details' });
        }
    }
    
    /**
    * Cancel a live match
    * POST /api/sudoku/matches/:matchId/cancel
    */
    static async cancelLiveMatch(req, res) {
        try {
            const userId = req.user.userId;
            const { matchId } = req.params;
            
            // First, check if the match exists and user has permission
            const match = await SudokuModel.getLiveMatchById(parseInt(matchId));
            if (!match) {
                return res.status(404).json({ error: 'Live match not found' });
            }
            
            // Only challenger or challenged can cancel the match
            if (match.challenger_id !== userId && match.challenged_id !== userId) {
                return res.status(403).json({ error: 'Not authorized to cancel this match' });
            }
            
            // Only allow cancellation if match is still pending or active
            if (match.status === 'completed') {
                return res.status(400).json({ error: 'Cannot cancel a completed match' });
            }
            
            await SudokuModel.cancelLiveMatch(parseInt(matchId));
            
            res.json({
                message: 'Live match cancelled successfully'
            });
        } catch (error) {
            console.error('Cancel live match error:', error);
            res.status(500).json({ error: 'Error cancelling live match' });
        }
    }
    
    /**
    * Complete a live match
    * POST /api/sudoku/matches/:matchId/complete
    */
    static async completeLiveMatch(req, res) {
        try {
            const userId = req.user.userId;
            const { matchId } = req.params;
            const { timeSeconds, mistakes } = req.body;
            
            const match = await SudokuModel.getLiveMatchById(parseInt(matchId));
            if (!match) {
                return res.status(404).json({ error: 'Match not found' });
            }
            
            // Verify user is part of this match
            if (match.challenger_id !== userId && match.challenged_id !== userId) {
                return res.status(403).json({ error: 'Not authorized to complete this match' });
            }
            
            const result = await SudokuModel.completeLiveMatch(
                parseInt(matchId), 
                userId, 
                timeSeconds, 
                mistakes
            );
            console.log('-------result-------', result);
            res.json(result);
        } catch (error) {
            console.error('Complete live match error:', error);
            res.status(500).json({ error: 'Error completing live match' });
        }
    }

    /**
    * Start a live match
    * POST /api/sudoku/matches/:matchId/start
    */
    /**
     * Start a live match
     * POST /api/sudoku/matches/:matchId/start
     */
    static async startLiveMatch(req, res) {
        try {
            const userId = req.user.userId;
            const { matchId } = req.params;
            const { puzzle, solution, difficulty } = req.body; // Extract puzzle data

            const match = await SudokuModel.getLiveMatchById(parseInt(matchId));
            if (!match) {
                return res.status(404).json({ error: 'Live match not found' });
            }

            // Only challenger or challenged can start the match
            if (match.challenger_id !== userId && match.challenged_id !== userId) {
                return res.status(403).json({ error: 'Not authorized to start this match' });
            }

            // Create puzzle data object
            const puzzleData = {
                puzzle,
                solution,
                difficulty
            };

            // Pass puzzle data to the model
            await SudokuModel.startLiveMatch(parseInt(matchId), puzzleData);

            res.json({
                message: 'Live match started successfully'
            });
        } catch (error) {
            console.error('Start live match error:', error);
            res.status(500).json({ error: 'Error starting live match' });
        }
    }
}
module.exports = SudokuController;
