const pool = require('../config/database');
const bcrypt = require('bcrypt');

class User {
    // Create a new user
    static async createUser(userData) {
        const { name, email, password } = userData;
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = `INSERT INTO users (name, email, password) 
                       VALUES ($1, $2, $3) 
                       RETURNING id, name, email`;
        const values = [name, email, hashedPassword];
        try {
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('Error creating user:', error);
            throw new Error('Error creating user');
        }
    }

    // Get user by ID
    static async getUserById(userId) {
        const query = `SELECT id, name, email FROM users WHERE id = $1`;
        const values = [userId];
        try {
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('Error fetching user:', error);
            throw new Error('Error fetching user');
        }
    }

    // Get user by email
    static async getUserByEmail(email) {
        const query = `SELECT id, name, email, password FROM users WHERE email = $1`;
        const values = [email];
        try {
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('Error fetching user by email:', error);
            throw new Error('Error fetching user by email');
        }
    }

    // Update user information
    static async updateUser(userId, userData) {
        const { name, email } = userData;
        const query = `UPDATE users SET name = $1, email = $2 WHERE id = $3 
                       RETURNING id, name, email`;
        const values = [name, email, userId];
        try {
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('Error updating user:', error);
            throw new Error('Error updating user');
        }
    }

    // Change user password
    static async changePassword(userId, newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const query = `UPDATE users SET password = $1 WHERE id = $2 
                       RETURNING id, name, email`;
        const values = [hashedPassword, userId];
        try {
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('Error changing password:', error);
            throw new Error('Error changing password');
        }
    }

    // Delete user
    static async deleteUser(userId) {
        const query = `DELETE FROM users WHERE id = $1 RETURNING id`;
        const values = [userId];
        try {
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('Error deleting user:', error);
            throw new Error('Error deleting user');
        }
    }

    // List all users
    static async listUsers() {
        const query = `SELECT id, name, email FROM users ORDER BY created_at DESC`;
        try {
            const result = await pool.query(query);
            return result.rows;
        } catch (error) {
            console.error('Error listing users:', error);
            throw new Error('Error listing users');
        }
    }

    // Authenticate user
    static async authenticate(email, password) {
        const user = await this.getUserByEmail(email);
        if (!user) {
            throw new Error('User not found');
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new Error('Invalid password');
        }
        return { id: user.id, name: user.name, email: user.email };
    }

    // Check if email exists
    static async emailExists(email) {
        const query = `SELECT id FROM users WHERE email = $1`;
        const values = [email];
        try {
            const result = await pool.query(query, values);
            return result.rows.length > 0;
        } catch (error) {
            console.error('Error checking email existence:', error);
            throw new Error('Error checking email existence');
        }
    }
}

module.exports = User;