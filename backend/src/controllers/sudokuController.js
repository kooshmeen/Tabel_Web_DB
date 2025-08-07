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
}

module.exports = SudokuController;
