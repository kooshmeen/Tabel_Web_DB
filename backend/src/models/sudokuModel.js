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
    * Get all groups with additional metadata
    * @param {number|null} currentUserId - Optional user ID to get user role in groups
    * @returns {Promise<Array>} - An array of all groups with member count and privacy info
    */
    static async getAllGroups(currentUserId = null) {
        let query = `
            SELECT 
                g.*,
                COUNT(gm.player_id) as member_count,
                CASE WHEN g.group_password IS NOT NULL AND g.group_password != '' THEN true ELSE false END as is_private
        `;
        
        if (currentUserId) {
            query += `,
                COALESCE(user_gm.role, null) as user_role
            `;
        }
        
        query += `
            FROM sudoku_groups g
            LEFT JOIN sudoku_group_members gm ON g.id = gm.group_id
        `;
        
        if (currentUserId) {
            query += `
                LEFT JOIN sudoku_group_members user_gm ON g.id = user_gm.group_id AND user_gm.player_id = $1
            `;
        }
        
        query += `
            GROUP BY g.id`;
        
        if (currentUserId) {
            query += `, user_gm.role`;
        }
        
        query += `
            ORDER BY g.created_at DESC
        `;
        
        try {
            const values = currentUserId ? [currentUserId] : [];
            const result = await pool.query(query, values);
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
    * Get a group by ID with additional metadata
    * @param {number} groupId - The ID of the group to retrieve
    * @param {number|null} currentUserId - Optional user ID to get user role in the group
    * @returns {Promise<Object>} - The group object with metadata
    */
    static async getGroupById(groupId, currentUserId = null) {
        let query = `
            SELECT 
                g.*,
                COUNT(gm.player_id) as member_count,
                CASE WHEN g.group_password IS NOT NULL AND g.group_password != '' THEN true ELSE false END as is_private
        `;
        
        if (currentUserId) {
            query += `,
                COALESCE(user_gm.role, null) as user_role
            `;
        }
        
        query += `
            FROM sudoku_groups g
            LEFT JOIN sudoku_group_members gm ON g.id = gm.group_id
        `;
        
        if (currentUserId) {
            query += `
                LEFT JOIN sudoku_group_members user_gm ON g.id = user_gm.group_id AND user_gm.player_id = $2
            `;
        }
        
        query += `
            WHERE g.id = $1
            GROUP BY g.id`;
        
        if (currentUserId) {
            query += `, user_gm.role`;
        }
        
        try {
            const values = currentUserId ? [groupId, currentUserId] : [groupId];
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
            SELECT 
                sgm.id,
                sgm.player_id,
                sgm.role,
                sgm.joined_at,
                sgm.wins,
                sgm.losses, 
                sgm.draws,
                sp.username,
                sp.email
            FROM sudoku_group_members sgm
            JOIN sudoku_players sp ON sgm.player_id = sp.id
            WHERE sgm.group_id = $1
            ORDER BY sgm.role DESC, sgm.joined_at ASC
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
    * List all groups a player is a member of with additional metadata
    * @param {number} playerId
    * @returns {Promise<Array>}
    */
    static async getGroupsForPlayer(playerId) {
        const query = `
            SELECT 
                g.*,
                COUNT(all_gm.player_id) as member_count,
                CASE WHEN g.group_password IS NOT NULL AND g.group_password != '' THEN true ELSE false END as is_private,
                m.role as user_role
            FROM sudoku_groups g
            JOIN sudoku_group_members m ON g.id = m.group_id
            LEFT JOIN sudoku_group_members all_gm ON g.id = all_gm.group_id
            WHERE m.player_id = $1
            GROUP BY g.id, m.role
            ORDER BY g.created_at DESC
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
    * Search groups by name or description with additional metadata
    * @param {string} searchTerm
    * @param {number|null} currentUserId - Optional user ID to get user role in groups
    * @returns {Promise<Array>}
    */
    static async searchGroups(searchTerm, currentUserId = null) {
        let query = `
            SELECT 
                g.*,
                COUNT(gm.player_id) as member_count,
                CASE WHEN g.group_password IS NOT NULL AND g.group_password != '' THEN true ELSE false END as is_private
        `;
        
        if (currentUserId) {
            query += `,
                COALESCE(user_gm.role, null) as user_role
            `;
        }
        
        query += `
            FROM sudoku_groups g
            LEFT JOIN sudoku_group_members gm ON g.id = gm.group_id
        `;
        
        if (currentUserId) {
            query += `
                LEFT JOIN sudoku_group_members user_gm ON g.id = user_gm.group_id AND user_gm.player_id = $2
            `;
        }
        
        query += `
            WHERE g.group_name ILIKE $1 OR g.group_description ILIKE $1
            GROUP BY g.id`;
        
        if (currentUserId) {
            query += `, user_gm.role`;
        }
        
        query += `
            ORDER BY g.created_at DESC
        `;
        
        const values = currentUserId ? [`%${searchTerm}%`, currentUserId] : [`%${searchTerm}%`];
        
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
    
    //region challenge
    /**
    * Check if both players are members of the specified group
    */
    static async checkPlayersInGroup(player1Id, player2Id, groupId) {
        const query = `
            SELECT COUNT(DISTINCT player_id) as count 
            FROM sudoku_group_members 
            WHERE group_id = $1 AND player_id IN ($2, $3)
        `;
        const result = await pool.query(query, [groupId, player1Id, player2Id]);
        //return parseInt(result.rows[0].count) === 2;
        return true;
    }
    
    /**
    * Generate puzzle data (implement based on your puzzle generation logic)
    */
    static async generatePuzzle(difficulty) {
        // For now, return a placeholder - replace with actual puzzle generation
        return {
            puzzle: Array(81).fill(0), // 9x9 grid flattened
            solution: Array(81).fill(1),
            difficulty: difficulty
        };
    }
    
    /**
    * Create a new challenge invitation (pending challenger completion)
    */
    static async createChallenge(challengeData) {
        const { challengerId, challengedId, groupId, difficulty } = challengeData;
        
        const query = `
            INSERT INTO sudoku_challenge_invitations 
            (challenger_id, challenged_id, group_id, difficulty, puzzle_data, status)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        `;
        
        // Create with empty puzzle data and 'challenger_playing' status
        const result = await pool.query(query, [
            challengerId, challengedId, groupId, difficulty, 
            JSON.stringify({ puzzle: [], solution: [], difficulty }), 
            'challenger_playing'
        ]);
        
        return result.rows[0].id;
    }
    
    /**
    * Create a live match for online challenges
    */
    static async createLiveMatch(matchData) {
        const { challengerId, challengedId, groupId, difficulty, puzzleData } = matchData;
        
        const query = `
            INSERT INTO sudoku_live_matches 
            (challenger_id, challenged_id, group_id, difficulty, puzzle_data)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
        `;
        
        const result = await pool.query(query, [
            challengerId, challengedId, groupId, difficulty, puzzleData
        ]);
        
        return result.rows[0].id;
    }
    
    /**
    * Get pending live matches for a user
    */
    static async getPendingLiveMatches(userId) {
        const query = `
            SELECT 
                lm.*,
                challenger.username as challenger_name,
                sg.group_name
            FROM sudoku_live_matches lm
            JOIN sudoku_players challenger ON lm.challenger_id = challenger.id
            JOIN sudoku_groups sg ON lm.group_id = sg.id
            WHERE lm.challenged_id = $1 AND lm.status = 'pending'
            ORDER BY lm.created_at DESC
        `;
        
        const result = await pool.query(query, [userId]);
        return result.rows;
    }
    
    /**
    * Accept a live match
    */
    static async acceptLiveMatch(matchId) {
        const query = `
            UPDATE sudoku_live_matches 
            SET status = 'active' 
            WHERE id = $1
            RETURNING *
        `;
        
        const result = await pool.query(query, [matchId]);
        return result.rows[0];
    }
    
    /**
    * Reject a challenge or live match
    */
    static async rejectChallenge(challengeId) {
        const query = `
            UPDATE sudoku_challenge_invitations 
            SET status = 'rejected' 
            WHERE id = $1
        `;
        
        await pool.query(query, [challengeId]);
    }
    
    /**
    * Reject a live match
    */
    static async rejectLiveMatch(matchId) {
        const query = `
            UPDATE sudoku_live_matches 
            SET status = 'rejected' 
            WHERE id = $1
        `;
        
        await pool.query(query, [matchId]);
    }
    
    /**
    * Update challenger completion for offline challenges
    */
    static async updateChallengerCompletion(challengeId, timeSeconds, score, mistakes) {
        const query = `
            UPDATE sudoku_challenge_invitations 
            SET challenger_time = $1, challenger_score = $2, challenger_mistakes = $3, status = 'challenger_completed'
            WHERE id = $4
        `;
        
        await pool.query(query, [timeSeconds, score, mistakes, challengeId]);
    }
    
    /**
    * Get pending challenges for a user
    */
    static async getPendingChallenges(userId) {
        const query = `
            SELECT 
                ci.*,
                challenger.username as challenger_name,
                sg.group_name
            FROM sudoku_challenge_invitations ci
            JOIN sudoku_players challenger ON ci.challenger_id = challenger.id
            JOIN sudoku_groups sg ON ci.group_id = sg.id
            WHERE ci.challenged_id = $1 AND ci.status = 'pending'
            ORDER BY ci.created_at DESC
        `;
        
        const result = await pool.query(query, [userId]);
        return result.rows;
    }
    
    /**
    * Get challenge by ID
    */
    static async getChallengeById(challengeId) {
        const query = `SELECT * FROM sudoku_challenge_invitations WHERE id = $1`;
        const result = await pool.query(query, [challengeId]);
        return result.rows[0];
    }
    
    /**
    * Accept a challenge
    */
    static async acceptChallenge(challengeId) {
        const query = `
            UPDATE sudoku_challenge_invitations 
            SET status = 'accepted' 
            WHERE id = $1
        `;
        
        await pool.query(query, [challengeId]);
    }
    
    /**
    * Complete a challenge (either challenger completing initial game or challenged player responding)
    */
    static async completeChallenge(challengeId, userId, gameData) {
        const challenge = await this.getChallengeById(challengeId);
        
        if (!challenge) {
            throw new Error('Challenge not found');
        }
        
        // Check if this is the challenger completing for the first time
        if (userId === challenge.challenger_id && challenge.challenger_time === 0) {
            // Challenger completing initial game
            const score = this.calculateGameScore(challenge.difficulty, gameData.timeSeconds, gameData.numberOfMistakes === 0);
            
            const updateQuery = `
            UPDATE sudoku_challenge_invitations 
            SET challenger_time = $1, 
                challenger_score = $2, 
                challenger_mistakes = $3,
                status = 'pending'
            WHERE id = $4
        `;
            
            await pool.query(updateQuery, [
                gameData.timeSeconds, 
                score, 
                gameData.numberOfMistakes, 
                challengeId
            ]);
            
            // Also submit as regular game
            await this.recordCompletedGame(challenge.challenger_id, challenge.difficulty, gameData.timeSeconds, gameData.numberOfMistakes);

            return { 
                message: 'Challenge game completed, waiting for opponent',
                status: 'challenger_completed'
            };
            
        } else if (userId === challenge.challenged_id && challenge.status === 'accepted') {
            // Challenged player completing response
            const challengedScore = this.calculateGameScore(
                challenge.difficulty, 
                gameData.timeSeconds, 
                gameData.numberOfMistakes === 0
            );
            
            // Store challenged player's data BEFORE determining winner
            const updateQuery = `
            UPDATE sudoku_challenge_invitations 
            SET status = 'completed',
                challenged_time = $1,
                challenged_score = $2,
                challenged_mistakes = $3
            WHERE id = $4
            RETURNING *
        `;
            
            const updateResult = await pool.query(updateQuery, [
                gameData.timeSeconds,
                challengedScore,
                gameData.numberOfMistakes,
                challengeId
            ]);
            
            const updatedChallenge = updateResult.rows[0];
            
            // Determine winner using the stored scores
            let winner = null;
            if (challengedScore > updatedChallenge.challenger_score) {
                winner = 'challenged';
            } else if (updatedChallenge.challenger_score > challengedScore) {
                winner = 'challenger'; 
            } else {
                winner = 'draw';
            }
            
            // Update group W/L records
            await this.updateGroupWLRecords(
                updatedChallenge.group_id, 
                updatedChallenge.challenger_id, 
                updatedChallenge.challenged_id, 
                winner
            );
            
            // Submit as regular game
            await this.recordCompletedGame(userId, gameData.timeSeconds, challenge.difficulty, gameData.numberOfMistakes);

            // Delete the completed challenge
            const deleteQuery = `DELETE FROM sudoku_challenge_invitations WHERE id = $1`;
            await pool.query(deleteQuery, [challengeId]);
            
            return { 
                message: 'Challenge completed successfully', 
                winner: winner,
                challengerScore: updatedChallenge.challenger_score,
                challengedScore: challengedScore,
                challengerTime: updatedChallenge.challenger_time,
                challengedTime: gameData.timeSeconds,
                challengerMistakes: updatedChallenge.challenger_mistakes,
                challengedMistakes: gameData.numberOfMistakes
            };
        }
        
        throw new Error('Invalid challenge completion attempt');
    }
    
    /**
    * Update group W/L records and delete completed challenge
    */
    static async updateGroupWLRecords(groupId, challengerId, challengedId, winner) {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            if (winner === 'challenger') {
                // Challenger wins
                await client.query(
                    'UPDATE sudoku_group_members SET wins = wins + 1 WHERE group_id = $1 AND player_id = $2',
                    [groupId, challengerId]
                );
                await client.query(
                    'UPDATE sudoku_group_members SET losses = losses + 1 WHERE group_id = $1 AND player_id = $2',
                    [groupId, challengedId]
                );
            } else if (winner === 'challenged') {
                // Challenged wins
                await client.query(
                    'UPDATE sudoku_group_members SET wins = wins + 1 WHERE group_id = $1 AND player_id = $2',
                    [groupId, challengedId]
                );
                await client.query(
                    'UPDATE sudoku_group_members SET losses = losses + 1 WHERE group_id = $1 AND player_id = $2',
                    [groupId, challengerId]
                );
            } else {
                // Draw
                await client.query(
                    'UPDATE sudoku_group_members SET draws = draws + 1 WHERE group_id = $1 AND player_id = $2',
                    [groupId, challengerId]
                );
                await client.query(
                    'UPDATE sudoku_group_members SET draws = draws + 1 WHERE group_id = $1 AND player_id = $2',
                    [groupId, challengedId]
                );
            }
            
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
    
    /**
    * Complete challenger's game and make challenge available to challenged player
    */
    static async completeChallengerGameWithPuzzle(challengeId, gameData) {
        const challenge = await this.getChallengeById(challengeId);
        const score = this.calculateGameScore(challenge.difficulty, gameData.timeSeconds, gameData.numberOfMistakes === 0);
        
        const updateQuery = `
            UPDATE sudoku_challenge_invitations 
            SET challenger_time = $1, 
                challenger_score = $2, 
                challenger_mistakes = $3,
                puzzle_data = $4,
                status = 'pending'
            WHERE id = $5
        `;
        
        await pool.query(updateQuery, [
            gameData.timeSeconds, 
            score, 
            gameData.numberOfMistakes,
            JSON.stringify(gameData.puzzleData),
            challengeId
        ]);
        
        return { message: 'Challenge completed and sent to challenged player' };
    }
}

module.exports = SudokuModel;