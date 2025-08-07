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
     * Record a completed sudoku game using the new daily-based approach
     * @param {number} playerId
     * @param {number} timeSeconds
     * @param {string} difficulty
     * @param {number} numberOfMistakes
     * @returns {Promise<void>}
     */
    static async recordCompletedGame(playerId, timeSeconds, difficulty, numberOfMistakes) {
        try {
            const noMistakes = numberOfMistakes === 0;
            const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
            
            // Calculate score based on difficulty and performance
            const baseScore = this.calculateGameScore(difficulty, timeSeconds, numberOfMistakes);
            
            // Prepare field names based on difficulty and mistakes
            const timeField = `best_time_${difficulty}`;
            const timeNoMistakesField = `best_time_${difficulty}_no_mistakes`;
            const gamesField = `games_completed_${difficulty}`;
            const gamesNoMistakesField = `games_completed_${difficulty}_no_mistakes`;
            
            // Use ON CONFLICT to either insert new record or update existing one for the same day
            const query = `
                INSERT INTO sudoku_daily_scores (
                    player_id, 
                    play_date, 
                    ${timeField},
                    ${timeNoMistakesField},
                    ${gamesField},
                    ${gamesNoMistakesField},
                    daily_score
                ) VALUES (
                    $1, $2, $3, $4, 1, $5, $6
                )
                ON CONFLICT (player_id, play_date) 
                DO UPDATE SET
                    ${timeField} = CASE 
                        WHEN sudoku_daily_scores.${timeField} IS NULL OR $3 < sudoku_daily_scores.${timeField}
                        THEN $3 
                        ELSE sudoku_daily_scores.${timeField}
                    END,
                    ${timeNoMistakesField} = CASE 
                        WHEN $7 = true AND (sudoku_daily_scores.${timeNoMistakesField} IS NULL OR $3 < sudoku_daily_scores.${timeNoMistakesField})
                        THEN $3 
                        ELSE sudoku_daily_scores.${timeNoMistakesField}
                    END,
                    ${gamesField} = sudoku_daily_scores.${gamesField} + 1,
                    ${gamesNoMistakesField} = sudoku_daily_scores.${gamesNoMistakesField} + $5,
                    daily_score = sudoku_daily_scores.daily_score + $6,
                    updated_at = CURRENT_TIMESTAMP
            `;
            
            const values = [
                playerId,
                currentDate,
                timeSeconds,
                noMistakes ? timeSeconds : null,
                noMistakes ? 1 : 0,
                baseScore,
                noMistakes
            ];
            
            await pool.query(query, values);
            console.log(`Game recorded for player ${playerId} on ${currentDate}: ${difficulty}, ${timeSeconds}s, mistakes: ${numberOfMistakes}, score: ${baseScore}`);
            
        } catch (error) {
            console.error('Error recording completed game:', error);
            throw new Error('Error recording completed game');
        }
    }
    
    /**
     * Calculate score based on game performance (using original scoring formula)
     * @param {string} difficulty - 'easy', 'medium', 'hard'
     * @param {number} timeSeconds - Time taken to complete
     * @param {number} numberOfMistakes - Number of mistakes made
     * @returns {number} - Calculated score
     */
    static calculateGameScore(difficulty, timeSeconds, numberOfMistakes) {
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

        return score;
    }

    /**
     * Get all daily scores for a player
     * @param {number} playerId
     * @param {number} limit - Optional limit for recent entries
     * @returns {Promise<Array>}
     */
    static async getScoresForPlayer(playerId, limit = null) {
        let query = `
            SELECT * FROM sudoku_daily_scores 
            WHERE player_id = $1 
            ORDER BY play_date DESC
        `;
        const values = [playerId];
        
        if (limit) {
            query += ` LIMIT $2`;
            values.push(limit);
        }
        
        try {
            const result = await pool.query(query, values);
            return result.rows;
        } catch (error) {
            console.error('Error retrieving scores for player:', error);
            throw new Error('Error retrieving scores for player');
        }
    }

    /**
     * Get top N players from global leaderboard for a given period using daily scores
     * @param {string} periodType - 'all', 'month', 'week', 'day'
     * @param {Date|null} periodStart - The start date of the period (calculated if null)
     * @param {number} limit - Number of top players to return
     * @returns {Promise<Array>}
     */
    static async getTopGlobalLeaderboard(periodType, periodStart = null, limit = 10) {
        try {
            let dateFilter = '';
            const values = [limit];
            
            if (periodType !== 'all') {
                if (!periodStart) {
                    const now = new Date();
                    switch (periodType) {
                        case 'day':
                            periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                            break;
                        case 'week':
                            periodStart = new Date(now);
                            periodStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
                            break;
                        case 'month':
                            periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
                            break;
                    }
                }
                dateFilter = 'WHERE sds.play_date >= $2';
                values.push(periodStart.toISOString().split('T')[0]);
            }
            
            const query = `
                SELECT 
                    sp.id,
                    sp.username,
                    COALESCE(SUM(sds.daily_score), 0) as total_score,
                    COALESCE(SUM(sds.games_completed_easy + sds.games_completed_medium + sds.games_completed_hard), 0) as total_games,
                    MIN(LEAST(
                        NULLIF(sds.best_time_easy, 0),
                        NULLIF(sds.best_time_medium, 0), 
                        NULLIF(sds.best_time_hard, 0)
                    )) as best_overall_time
                FROM sudoku_players sp
                JOIN sudoku_daily_scores sds ON sp.id = sds.player_id
                ${dateFilter}
                GROUP BY sp.id, sp.username
                HAVING COALESCE(SUM(sds.daily_score), 0) > 0
                ORDER BY total_score DESC, best_overall_time ASC
                LIMIT $1
            `;
            
            const result = await pool.query(query, values);
            
            // Add rank to each player
            return result.rows.map((player, index) => ({
                ...player,
                rank: index + 1
            }));
            
        } catch (error) {
            console.error('Error getting global leaderboard:', error);
            throw new Error('Error retrieving global leaderboard');
        }
    }

        /**
     * Get top 100 players from global leaderboard for all time
     * @returns {Promise<Array>}
     */
    static async getTop100GlobalAllTime() {
        return await this.getTopGlobalLeaderboard('all', null, 100);
    }

    /**
     * Get top 100 players from global leaderboard for current month
     * @returns {Promise<Array>}
     */
    static async getTop100GlobalMonth() {
        return await this.getTopGlobalLeaderboard('month', null, 100);
    }

    /**
     * Get top 100 players from global leaderboard for current week
     * @returns {Promise<Array>}
     */
    static async getTop100GlobalWeek() {
        return await this.getTopGlobalLeaderboard('week', null, 100);
    }

    /**
     * Get top 100 players from global leaderboard for current day
     * @returns {Promise<Array>}
     */
    static async getTop100GlobalDay() {
        return await this.getTopGlobalLeaderboard('day', null, 100);
    }

    /**
     * Get top N players from group leaderboard for a given period using daily scores
     * @param {number} groupId
     * @param {string} periodType - 'all', 'month', 'week', 'day'
     * @param {Date|null} periodStart - The start date of the period (calculated if null)
     * @param {number} limit - Number of top players to return
     * @returns {Promise<Array>}
     */

    /**
     * Get top 100 players from global leaderboard for all time
     * @returns {Promise<Array>}
     */
    static async getTop100GlobalAllTime() {
        return await this.getTopGlobalLeaderboard('all', null, 100);
    }

    /**
     * Get top 100 players from global leaderboard for current month
     * @returns {Promise<Array>}
     */
    static async getTop100GlobalMonth() {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return await this.getTopGlobalLeaderboard('month', startOfMonth, 100);
    }

    /**
     * Get top 100 players from global leaderboard for current week
     * @returns {Promise<Array>}
     */
    static async getTop100GlobalWeek() {
        const now = new Date();
        const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        return await this.getTopGlobalLeaderboard('week', startOfWeek, 100);
    }

    /**
     * Get top 100 players from global leaderboard for current day
     * @returns {Promise<Array>}
     */
    static async getTop100GlobalDay() {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return await this.getTopGlobalLeaderboard('day', startOfDay, 100);
    }

    /**
     * Get top N players from group leaderboard for a given period using daily scores
     * @param {number} groupId
     * @param {string} periodType - 'all', 'month', 'week', 'day'
     * @param {Date|null} periodStart - The start date of the period (calculated if null)
     * @param {number} limit - Number of top players to return
     * @returns {Promise<Array>}
     */
    static async getTopGroupLeaderboard(groupId, periodType, periodStart = null, limit = 10) {
        try {
            let dateFilter = '';
            const values = [groupId, limit];
            
            if (periodType !== 'all') {
                if (!periodStart) {
                    const now = new Date();
                    switch (periodType) {
                        case 'day':
                            periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                            break;
                        case 'week':
                            periodStart = new Date(now);
                            periodStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
                            break;
                        case 'month':
                            periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
                            break;
                    }
                }
                dateFilter = 'AND sds.play_date >= $3';
                values.push(periodStart.toISOString().split('T')[0]);
            }
            
            const query = `
                SELECT 
                    sp.id,
                    sp.username,
                    SUM(sds.daily_score) as total_score,
                    SUM(sds.games_completed_easy + sds.games_completed_medium + sds.games_completed_hard) as total_games,
                    MIN(LEAST(
                        NULLIF(sds.best_time_easy, 0),
                        NULLIF(sds.best_time_medium, 0), 
                        NULLIF(sds.best_time_hard, 0)
                    )) as best_overall_time
                FROM sudoku_players sp
                JOIN sudoku_group_members sgm ON sp.id = sgm.player_id
                JOIN sudoku_daily_scores sds ON sp.id = sds.player_id
                WHERE sgm.group_id = $1 ${dateFilter}
                GROUP BY sp.id, sp.username
                HAVING SUM(sds.daily_score) > 0
                ORDER BY total_score DESC, best_overall_time ASC
                LIMIT $2
            `;
            
            const result = await pool.query(query, values);
            
            // Add rank to each player
            return result.rows.map((player, index) => ({
                ...player,
                rank: index + 1
            }));
            
        } catch (error) {
            console.error('Error getting group leaderboard:', error);
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
     * Get statistics for a player using the new daily scores system
     * @param {number} playerId
     * @returns {Promise<Object>}
     */
    static async getPlayerStatistics(playerId) {
        try {
            const query = `
                SELECT 
                    COUNT(*) as days_played,
                    SUM(games_completed_easy + games_completed_medium + games_completed_hard) as total_games_completed,
                    SUM(games_completed_easy) as total_easy_completed,
                    SUM(games_completed_medium) as total_medium_completed,
                    SUM(games_completed_hard) as total_hard_completed,
                    SUM(games_completed_easy_no_mistakes + games_completed_medium_no_mistakes + games_completed_hard_no_mistakes) as total_no_mistake_games,
                    SUM(daily_score) as total_score,
                    MIN(LEAST(
                        NULLIF(best_time_easy, 0),
                        NULLIF(best_time_medium, 0), 
                        NULLIF(best_time_hard, 0)
                    )) as best_overall_time,
                    MIN(NULLIF(best_time_easy, 0)) as best_time_easy,
                    MIN(NULLIF(best_time_medium, 0)) as best_time_medium,
                    MIN(NULLIF(best_time_hard, 0)) as best_time_hard,
                    AVG(NULLIF(best_time_easy, 0)) as avg_time_easy,
                    AVG(NULLIF(best_time_medium, 0)) as avg_time_medium,
                    AVG(NULLIF(best_time_hard, 0)) as avg_time_hard
                FROM sudoku_daily_scores 
                WHERE player_id = $1
            `;
            const values = [playerId];
            
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('Error retrieving player statistics:', error);
            throw new Error('Error retrieving player statistics');
        }
    }

    /**
     * Get statistics for a group using the new daily scores system
     * @param {number} groupId
     * @returns {Promise<Object>}
     */
    static async getGroupStatistics(groupId) {
        try {
            const query = `
                SELECT 
                    COUNT(DISTINCT sds.player_id) as active_members,
                    COUNT(*) as total_play_days,
                    SUM(sds.games_completed_easy + sds.games_completed_medium + sds.games_completed_hard) as total_games_completed,
                    SUM(sds.games_completed_easy) as total_easy_completed,
                    SUM(sds.games_completed_medium) as total_medium_completed,
                    SUM(sds.games_completed_hard) as total_hard_completed,
                    SUM(sds.games_completed_easy_no_mistakes + sds.games_completed_medium_no_mistakes + sds.games_completed_hard_no_mistakes) as total_no_mistake_games,
                    SUM(sds.daily_score) as total_group_score,
                    MIN(LEAST(
                        NULLIF(sds.best_time_easy, 0),
                        NULLIF(sds.best_time_medium, 0), 
                        NULLIF(sds.best_time_hard, 0)
                    )) as best_overall_time,
                    AVG(LEAST(
                        NULLIF(sds.best_time_easy, 0),
                        NULLIF(sds.best_time_medium, 0), 
                        NULLIF(sds.best_time_hard, 0)
                    )) as avg_best_time
                FROM sudoku_daily_scores sds
                JOIN sudoku_group_members sgm ON sds.player_id = sgm.player_id
                WHERE sgm.group_id = $1
            `;
            const values = [groupId];
            
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('Error retrieving group statistics:', error);
            throw new Error('Error retrieving group statistics');
        }
    }

}

module.exports = SudokuModel;