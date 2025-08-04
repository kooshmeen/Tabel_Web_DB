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
        return filterColumnsForDisplay(user);
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
            await this.setRoleForMember(newGroup.id, currentUserId, 'leader');

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
            JOIN sudoku_group_members ON sudoku_players.id = sudoku_group_members.user_id
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
            INSERT INTO sudoku_group_members (group_id, user_id)
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
     * Set the role for a member in a group
     * @param {number} groupId - The ID of the group
     * @param {number} userId - The ID of the user
     * @param {string} role - The role to set (e.g., 'leader', 'member')
     * @returns {Promise<void>} - Resolves when the role is set
     */
    static async setRoleForMember(groupId, userId, role) {
        const query = `
            UPDATE sudoku_group_members
            SET role = $1
            WHERE group_id = $2 AND user_id = $3;
        `;
        const values = [role, groupId, userId];

        try {
            await pool.query(query, values);
        } catch (error) {
            throw new Error('Error setting role for member');
        }
    }
}

module.exports = SudokuModel;