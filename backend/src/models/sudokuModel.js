const pool = require('../config/database');
const bcrypt = require('bcrypt');
const {filterColumnsForDisplay, getRowPermissions} = require('../config/columnPermissions');

class SudokuModel {
    /**
     * Create a new sudoku user account
     * @param {Object} userData - The user data to create the account
     * @returns {Promise<Object>} - The created user object
     */
    static async createUser(userData) {
        const { username, email, password } = userData;

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        const query = `
            INSERT INTO sudoku_players (username, email, password)
            VALUES ($1, $2, $3)
            RETURNING *;
        `;
        const values = [username, email, hashedPassword];

        try {
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            throw new Error('Error creating user');
        }
    }

    /**
     * Get a user by ID
     * @param {number} userId - The ID of the user to retrieve
     * @returns {Promise<Object>} - The user object
     */
    static async getUserById(userId) {
        const query = `
            SELECT * FROM sudoku_players WHERE id = $1;
        `;
        const values = [userId];

        try {
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            throw new Error('Error retrieving user');
        }
    }

    /**
     * Get user by email
     * @param {string} email - The email of the user to retrieve
     * @returns {Promise<Object>} - The user object
     */
    static async getUserByEmail(email) {
        const query = `
            SELECT * FROM sudoku_players WHERE email = $1;
        `;
        const values = [email];

        try {
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            throw new Error('Error retrieving user by email');
        }
    }

    /**
     * Update user information - allows user to update their username
     * @param {number} userId - The ID of the user to update
     * @param {Object} updateData - The data to update
     * @returns {Promise<Object>} - The updated user object
     */
    static async updateUser(userId, updateData) {
        const { username } = updateData;

        const query = `
            UPDATE sudoku_players
            SET username = $1
            WHERE id = $2
            RETURNING *;
        `;
        const values = [username, userId];

        try {
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            throw new Error('Error updating user');
        }
    }

    /**
     * Change a user's password
     * @param {number} userId - The ID of the user whose password is to be changed
     * @param {string} newPassword - The new password to set
     * @returns {Promise<Object>} - The updated user object with the new password
     */
    static async changePassword(userId, newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const query = `
            UPDATE sudoku_players
            SET password = $1
            WHERE id = $2
            RETURNING *;
        `;
        const values = [hashedPassword, userId];

        try {
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            throw new Error('Error changing password');
        }
    }

    /**
     * Delete a user account
     * @param {number} userId - The ID of the user to delete
     * @returns {Promise<void>} - Resolves when the user is deleted
     */
    static async deleteUser(userId) {
        const query = `
            DELETE FROM sudoku_players WHERE id = $1;
        `;
        const values = [userId];

        try {
            await pool.query(query, values);
        } catch (error) {
            throw new Error('Error deleting user');
        }
    }

    /**
     * Get all users
     * @returns {Promise<Array>} - An array of user objects
     */
    static async getAllUsers() {
        const query = `
            SELECT * FROM sudoku_players;
        `;

        try {
            const result = await pool.query(query);
            return result.rows;
        } catch (error) {
            throw new Error('Error retrieving all users');
        }
    }

    /**
     * Get all users from a certain group
     * @param {string} group - The group to filter users by
     * @returns {Promise<Array>} - An array of user objects from the specified group
     */
    static async getUsersByGroup(group) {
        const query = `
            SELECT * FROM sudoku_players WHERE group = $1;
        `;
        const values = [group];

        try {
            const result = await pool.query(query, values);
            return result.rows;
        } catch (error) {
            throw new Error('Error retrieving users by group');
        }
    }

    /**
     * Verify a user's password
     * @param {string} id - The id
     * @param {string} password - The password to verify
     * @returns {Promise<boolean>} - True if the password is correct, false otherwise
     */
    static async verifyPassword(id, password) {
        const query = `
            SELECT password FROM sudoku_players WHERE id = $1;
        `;
        const values = [id];

        try {
            const result = await pool.query(query, values);
            if (result.rows.length === 0) {
                return false; // User not found
            }
            const hashedPassword = result.rows[0].password;
            return await bcrypt.compare(password, hashedPassword);
        } catch (error) {
            throw new Error('Error verifying password');
        }
    }

    /**
     * Authenticate a user by email and password
     * @param {string} email - The user's email
     * @param {string} password - The user's password
     * @returns {Promise<Object|null>} - The user object if authentication is successful, null otherwise
     */
    static async authenticateUser(email, password) {
        const user = await this.getUserByEmail(email);
        if (!user) {
            return null; // User not found
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return null; // Invalid password
        }

        // Filter columns for display
        return user;
    }

    /**
     * Get all groups
     * @returns {Promise<Array>} - An array of all groups
     */
    static async getAllGroups() {
        const query = `
            SELECT * FROM sudoku_groups;
        `;

        try {
            const result = await pool.query(query);
            return result.rows;
        } catch (error) {
            throw new Error('Error retrieving all groups');
        }
    }

    /**
     * Create a new group
     * @param {Object} groupData - The data for the new group. Contains group name, description, and optionally password.
     * @param {number} currentUserId - The ID of the user creating the group - will automatically be added as the first member, with leader role.
     * @return {Promise<Object>} - The created group object
     */
    static async createGroup(groupData, currentUserId) {
        const { group_name, group_description, group_password } = groupData;

        const query = `
            INSERT INTO sudoku_groups (group_name, group_description, group_password)
            VALUES ($1, $2, $3)
            RETURNING *;
        `;
        const values = [group_name, group_description, group_password];

        try {
            const result = await pool.query(query, values);
            const newGroup = result.rows[0];

            // Automatically add the creator as the first member with leader role
            await this.addMemberToGroup(newGroup.id, currentUserId);
            await this.setRole(newGroup.id, currentUserId, 'leader');

            return newGroup;
        } catch (error) {
            throw new Error('Error creating group');
        }
        
    }

    /**
     * Get a group by ID
     * @param {number} groupId - The ID of the group to retrieve
     * @returns {Promise<Object>} - The group object
     */
    static async getGroupById(groupId) {
        const query = `
            SELECT * FROM sudoku_groups WHERE id = $1;
        `;
        const values = [groupId];

        try {
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            throw new Error('Error retrieving group by ID');
        }
    }

    /**
     * Get all members of a group
     * @param {number} groupId - The ID of the group
     * @returns {Promise<Array>} - An array of members in the group
     */
    static async getGroupMembers(groupId) {
        const query = `
            SELECT sudoku_players.* FROM sudoku_players
            JOIN sudoku_group_members ON sudoku_players.id = sudoku_group_members.player_id
            WHERE sudoku_group_members.group_id = $1;
        `;
        const values = [groupId];

        try {
            const result = await pool.query(query, values);
            return result.rows;
        } catch (error) {
            throw new Error('Error retrieving group members');
        }
    }

    /**
     * Add a member to a group
     * @param {number} groupId - The ID of the group
     * @param {number} userId - The ID of the user to add
     * @return {Promise<void>} - Resolves when the user is added to the group
     */
    static async addMemberToGroup(groupId, userId) {
        const query = `
            INSERT INTO sudoku_group_members (group_id, player_id)
            VALUES ($1, $2);
        `;
        const values = [groupId, userId];

        try {
            await pool.query(query, values);
        } catch (error) {
            throw new Error('Error adding member to group');
        }
    }

    /**
     * Set the role for a member in a group.
     * @param {number} groupId - The ID of the group
     * @param {number} userId - The ID of the user
     * @param {string} role - The role to set (e.g., 'leader', 'member')
     * @returns {Promise<void>} - Resolves when the role is set
     */
    static async setRole(groupId, userId, role) {
        const query = `
            UPDATE sudoku_group_members
            SET role = $1
            WHERE group_id = $2 AND player_id = $3;
        `;
        const values = [role, groupId, userId];

        try {
            await pool.query(query, values);
        } catch (error) {
            throw new Error('Error setting role for member');
        }
    }

    /**
     * Delete a group. Only a 'leader' can delete a group.
     * @param {number} groupId - The ID of the group to delete
     * @param {number} currentUserId - The ID of the user attempting to delete the group
     * @returns {Promise<void>} - Resolves when the group is deleted
     */
    static async deleteGroup(groupId, currentUserId) {
        // Check if the user is a leader of the group
        const queryCheck = `
            SELECT role FROM sudoku_group_members
            WHERE group_id = $1 AND player_id = $2;
        `;
        const valuesCheck = [groupId, currentUserId];

        try {
            const resultCheck = await pool.query(queryCheck, valuesCheck);
            if (resultCheck.rows.length === 0 || resultCheck.rows[0].role !== 'leader') {
                throw new Error('Only leaders can delete the group');
            }

            // Proceed to delete the group
            const queryDelete = `
                DELETE FROM sudoku_groups WHERE id = $1;
            `;
            const valuesDelete = [groupId];
            await pool.query(queryDelete, valuesDelete);
        } catch (error) {
            throw new Error('Error deleting group: ' + error.message);
        }
    }

    /**
     * Add or update score in global leaderboard
     * @param {number} playerId - The ID of the player
     * @param {number} score - The score to add
     * @param {string} periodType - The type of period (e.g., 'all', 'month', 'week', 'day')
     * @param {Date} periodStart - The start date of the period (NULL for 'all')
     * @returns {Promise<void>} - Resolves when the score is added or updated
     */
    static async upsertScoreToLeaderboard(playerId, score, periodType, periodStart = null) {
        const query = `
            INSERT INTO sudoku_leaderboard (player_id, period_type, period_start, score)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (player_id, period_type, period_start)
            DO UPDATE SET score = EXCLUDED.score;
        `;
        const values = [playerId, periodType, periodStart, score];

        try {
            await pool.query(query, values);
        } catch (error) {
            throw new Error('Error adding/updating score to leaderboard');
        }
    }

    /**
     * Add or update score in group leaderboard
     * @param {number} groupId - The ID of the group
     * @param {number} playerId - The ID of the player
     * @param {number} score - The score to add
     * @param {string} periodType - The type of period (e.g., 'all', 'month', 'week', 'day')
     * @param {Date} periodStart - The start date of the period (NULL for 'all')
     * @returns {Promise<void>} - Resolves when the score is added or updated
     */
    static async upsertScoreToGroupLeaderboard(groupId, playerId, score, periodType, periodStart = null) {
        const query = `
            INSERT INTO sudoku_group_leaderboard (group_id, player_id, period_type, period_start, score)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (group_id, player_id, period_type, period_start)
            DO UPDATE SET score = EXCLUDED.score;
        `;
        const values = [groupId, playerId, periodType, periodStart, score];

        try {
            await pool.query(query, values);
        } catch (error) {
            throw new Error('Error adding/updating score to group leaderboard');
        }
    }

    /**
     * Record a completed sudoku game
     * @param {number} playerId
     * @param {number} timeSeconds
     * @param {string} difficulty
     * @param {boolean} noMistakes
     * @returns {Promise<void>}
     */
    static async recordCompletedGame(playerId, timeSeconds, difficulty, noMistakes) {
        const query = `
            INSERT INTO sudoku_scores (player_id, time_seconds, difficulty, no_mistakes)
            VALUES ($1, $2, $3, $4);
        `;
        const values = [playerId, timeSeconds, difficulty, noMistakes];
        try {
            await pool.query(query, values);
        } catch (error) {
            throw new Error('Error recording completed game');
        }
    }

    /**
     * Get all scores for a player
     * @param {number} playerId
     * @returns {Promise<Array>}
     */
    static async getScoresForPlayer(playerId) {
        const query = `
            SELECT * FROM sudoku_scores WHERE player_id = $1 ORDER BY completed_at DESC;
        `;
        const values = [playerId];
        try {
            const result = await pool.query(query, values);
            return result.rows;
        } catch (error) {
            throw new Error('Error retrieving scores for player');
        }
    }

    /**
     * Get top N players from global leaderboard for a given period
     * @param {string} periodType
     * @param {Date|null} periodStart
     * @param {number} limit
     * @returns {Promise<Array>}
     */
    static async getTopGlobalLeaderboard(periodType, periodStart = null, limit = 10) {
        const query = `
            SELECT * FROM sudoku_leaderboard
            WHERE period_type = $1 AND (period_start = $2 OR ($2 IS NULL AND period_start IS NULL))
            ORDER BY score DESC
            LIMIT $3;
        `;
        const values = [periodType, periodStart, limit];
        try {
            const result = await pool.query(query, values);
            return result.rows;
        } catch (error) {
            throw new Error('Error retrieving global leaderboard');
        }
    }

    /**
     * Get top N players from group leaderboard for a given period
     * @param {number} groupId
     * @param {string} periodType
     * @param {Date|null} periodStart
     * @param {number} limit
     * @returns {Promise<Array>}
     */
    static async getTopGroupLeaderboard(groupId, periodType, periodStart = null, limit = 10) {
        const query = `
            SELECT * FROM sudoku_group_leaderboard
            WHERE group_id = $1 AND period_type = $2 AND (period_start = $3 OR ($3 IS NULL AND period_start IS NULL))
            ORDER BY score DESC
            LIMIT $4;
        `;
        const values = [groupId, periodType, periodStart, limit];
        try {
            const result = await pool.query(query, values);
            return result.rows;
        } catch (error) {
            throw new Error('Error retrieving group leaderboard');
        }
    }

    /**
     * Award a medal to a player (upsert)
     * @param {number} playerId
     * @param {string} medalType
     * @param {string} description
     * @param {number} numberOfMedals
     * @returns {Promise<void>}
     */
    static async awardMedal(playerId, medalType, description, numberOfMedals = 1) {
        const query = `
            INSERT INTO sudoku_player_medals (player_id, medal_type, description, number_of_medals)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (player_id, medal_type)
            DO UPDATE SET number_of_medals = sudoku_player_medals.number_of_medals + EXCLUDED.number_of_medals, description = EXCLUDED.description;
        `;
        const values = [playerId, medalType, description, numberOfMedals];
        try {
            await pool.query(query, values);
        } catch (error) {
            throw new Error('Error awarding medal');
        }
    }

    /**
     * Get all medals for a player
     * @param {number} playerId
     * @returns {Promise<Array>}
     */
    static async getMedalsForPlayer(playerId) {
        const query = `
            SELECT * FROM sudoku_player_medals WHERE player_id = $1;
        `;
        const values = [playerId];
        try {
            const result = await pool.query(query, values);
            return result.rows;
        } catch (error) {
            throw new Error('Error retrieving medals for player');
        }
    }

    /**
     * Remove a member from a group
     * @param {number} groupId
     * @param {number} userId
     * @returns {Promise<void>}
     */
    static async removeMemberFromGroup(groupId, userId) {
        const query = `
            DELETE FROM sudoku_group_members WHERE group_id = $1 AND player_id = $2;
        `;
        const values = [groupId, userId];
        try {
            await pool.query(query, values);
        } catch (error) {
            throw new Error('Error removing member from group');
        }
    }

    /**
     * List all groups a player is a member of
     * @param {number} playerId
     * @returns {Promise<Array>}
     */
    static async getGroupsForPlayer(playerId) {
        const query = `
            SELECT g.* FROM sudoku_groups g
            JOIN sudoku_group_members m ON g.id = m.group_id
            WHERE m.player_id = $1;
        `;
        const values = [playerId];
        try {
            const result = await pool.query(query, values);
            return result.rows;
        } catch (error) {
            throw new Error('Error retrieving groups for player');
        }
    }

    /**
     * Search groups by name or description
     * @param {string} searchTerm
     * @returns {Promise<Array>}
     */
    static async searchGroups(searchTerm) {
        const query = `
            SELECT * FROM sudoku_groups WHERE group_name ILIKE $1 OR group_description ILIKE $1;
        `;
        const values = [`%${searchTerm}%`];
        try {
            const result = await pool.query(query, values);
            return result.rows;
        } catch (error) {
            throw new Error('Error searching groups');
        }
    }

    /**
     * Get statistics for a player (total puzzles solved, average time, etc.)
     * @param {number} playerId
     * @returns {Promise<Object>}
     */
    static async getPlayerStatistics(playerId) {
        const query = `
            SELECT COUNT(*) AS total_solved,
                   AVG(time_seconds) AS avg_time,
                   SUM(CASE WHEN no_mistakes THEN 1 ELSE 0 END) AS no_mistake_count
            FROM sudoku_scores WHERE player_id = $1;
        `;
        const values = [playerId];
        try {
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            throw new Error('Error retrieving player statistics');
        }
    }

    /**
     * Get statistics for a group (total puzzles solved by members, average time, etc.)
     * @param {number} groupId
     * @returns {Promise<Object>}
     */
    static async getGroupStatistics(groupId) {
        const query = `
            SELECT COUNT(*) AS total_solved,
                   AVG(s.time_seconds) AS avg_time,
                   SUM(CASE WHEN s.no_mistakes THEN 1 ELSE 0 END) AS no_mistake_count
            FROM sudoku_scores s
            JOIN sudoku_group_members m ON s.player_id = m.player_id
            WHERE m.group_id = $1;
        `;
        const values = [groupId];
        try {
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            throw new Error('Error retrieving group statistics');
        }
    }

    /**
     * Submits completed game for a logged in player
     * Updates the score, leaderboard, statistics, best time (if applicable)
     * @param {number} playerId - The ID of the player
     * @param {number} timeSeconds - The time taken to complete the game in seconds
     * @param {string} difficulty - The difficulty level of the game (e.g., 'easy', 'medium', 'hard')
     * @param {number} numberOfMistakes - The number of mistakes made during the game
     * @returns {Promise<void>}
     */
    static async submitCompletedGame(playerId, timeSeconds, difficulty, numberOfMistakes) {
        try {
            // Calculate score based on difficulty and time
            const basePoints = 1000; // Base points for any completed game
            const difficultyMultiplier = {
                easy: 0.33,
                medium: 0.7,
                hard: 1.5
            }[difficulty] || 1;

            const timeScore = {
                easy: 600,
                medium: 1200,
                hard: 1800
            }[difficulty] || 600; // Base time score for each difficulty

            const mistakePenalty = Math.max(0.4, 1 - (numberOfMistakes * 0.1)); // Penalty for mistakes, capped at 40% of the score

            const score = Math.round((difficultyMultiplier * mistakePenalty) * (Math.max(0, (timeScore - timeSeconds) * 2) + basePoints)); // Example scoring formula

            const noMistakes = numberOfMistakes === 0;

            // Get current date for period calculations
            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const startOfWeek = new Date(startOfDay);
            startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            // Upsert to sudoku_score table
            const query = `
                INSERT INTO sudoku_score (
                    player_id, 
                    best_time_${difficulty}, 
                    best_time_${difficulty}_no_mistakes,
                    total_completed_${difficulty},
                    total_completed_${difficulty}_no_mistakes,
                    total_score,
                    score_month,
                    score_week,
                    score_day
                )
                VALUES ($1, $2, $3, 1, $4, $5, $6, $7, $8)
                ON CONFLICT (player_id) DO UPDATE SET
                    best_time_${difficulty} = CASE 
                        WHEN sudoku_score.best_time_${difficulty} IS NULL OR sudoku_score.best_time_${difficulty} > EXCLUDED.best_time_${difficulty}
                        THEN EXCLUDED.best_time_${difficulty}
                        ELSE sudoku_score.best_time_${difficulty}
                    END,
                    best_time_${difficulty}_no_mistakes = CASE 
                        WHEN $4 = 1 AND (sudoku_score.best_time_${difficulty}_no_mistakes IS NULL OR sudoku_score.best_time_${difficulty}_no_mistakes > EXCLUDED.best_time_${difficulty}_no_mistakes)
                        THEN EXCLUDED.best_time_${difficulty}_no_mistakes
                        ELSE sudoku_score.best_time_${difficulty}_no_mistakes
                    END,
                    total_completed_${difficulty} = sudoku_score.total_completed_${difficulty} + 1,
                    total_completed_${difficulty}_no_mistakes = sudoku_score.total_completed_${difficulty}_no_mistakes + $4,
                    total_score = sudoku_score.total_score + EXCLUDED.total_score,
                    score_month = sudoku_score.score_month + EXCLUDED.score_month,
                    score_week = sudoku_score.score_week + EXCLUDED.score_week,
                    score_day = sudoku_score.score_day + EXCLUDED.score_day;
            `;

            const values = [
                playerId,
                timeSeconds,
                noMistakes ? timeSeconds : null,
                noMistakes ? 1 : 0,
                score,
                score, // score_month
                score, // score_week
                score  // score_day
            ];

            await pool.query(query, values);

            // Update global leaderboard
            await this.upsertScoreToLeaderboard(playerId, score, 'all');

            // Update period-based leaderboards
            await this.upsertScoreToLeaderboard(playerId, score, 'day', startOfDay);
            await this.upsertScoreToLeaderboard(playerId, score, 'week', startOfWeek);
            await this.upsertScoreToLeaderboard(playerId, score, 'month', startOfMonth);

            // Update group leaderboards if player is in a group
            const groups = await this.getGroupsForPlayer(playerId);
            for (const group of groups) {
                await this.upsertScoreToGroupLeaderboard(group.id, playerId, score, 'all');
                await this.upsertScoreToGroupLeaderboard(group.id, playerId, score, 'day', startOfDay);
                await this.upsertScoreToGroupLeaderboard(group.id, playerId, score, 'week', startOfWeek);
                await this.upsertScoreToGroupLeaderboard(group.id, playerId, score, 'month', startOfMonth);
            }

        } catch (error) {
            throw new Error('Error submitting completed game: ' + error.message);
        }
    }
}

module.exports = SudokuModel;