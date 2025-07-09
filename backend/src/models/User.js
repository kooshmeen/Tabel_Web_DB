const pool = require('../config/database');
const bcrypt = require('bcrypt');
const { filterColumnsForDisplay } = require('../config/columnPermissions');

class User {
    // Create a new user
    static async createUser(userData) {
        const { name, email, password, role = 'user' } = userData;
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = `INSERT INTO users (name, email, password, role) 
                       VALUES ($1, $2, $3, $4) 
                       RETURNING id, name, email, role`;
        const values = [name, email, hashedPassword, role];
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
        const query = `SELECT id, name, email, password, role FROM users WHERE email = $1`;
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
        return { id: user.id, name: user.name, email: user.email, role: user.role };
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

    static async verifyPassword(password, hashedPassword) {
        try {
            return await bcrypt.compare(password, hashedPassword);
        } catch (error) {
            console.error('Error verifying password:', error);
            throw new Error('Error verifying password');
        }
    }

    // Get all tables in the database
    static async getAllTables() {
        try {
            console.log('📊 Fetching all database tables from model...');
            
            // Query to get all tables in the public schema
            const tablesQuery = `
                SELECT table_name, table_schema
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name;
            `;
            
            const tablesResult = await pool.query(tablesQuery);
            const tables = tablesResult.rows;
            
            console.log('Found tables:', tables);
            
            // For each table, get some basic info (row count, column count)
            const tableDetails = await Promise.all(
                tables.map(async (table) => {
                    try {
                        // Get row count
                        const countQuery = `SELECT COUNT(*) as row_count FROM ${table.table_name}`;
                        const countResult = await pool.query(countQuery);
                        const rowCount = parseInt(countResult.rows[0].row_count);
                        
                        // Get column count
                        const columnsQuery = `
                            SELECT COUNT(*) as column_count
                            FROM information_schema.columns 
                            WHERE table_name = $1 AND table_schema = 'public'
                        `;
                        const columnsResult = await pool.query(columnsQuery, [table.table_name]);
                        const columnCount = parseInt(columnsResult.rows[0].column_count);
                        
                        return {
                            name: table.table_name,
                            schema: table.table_schema,
                            rowCount,
                            columnCount
                        };
                    } catch (error) {
                        console.error(`Error getting details for table ${table.table_name}:`, error);
                        return {
                            name: table.table_name,
                            schema: table.table_schema,
                            rowCount: 0,
                            columnCount: 0,
                            error: error.message
                        };
                    }
                })
            );
            
            return tableDetails;
            
        } catch (error) {
            console.error('Error in getAllTables model method:', error);
            throw new Error('Error fetching database tables');
        }
    }

    // Get data for a specific table with pagination
    static async getTableData(tableName, currentUser, page = 1, limit = 50) {
        try {
            console.log(`📊 Fetching data for table: ${tableName}`);
            
            // Validate table name to prevent SQL injection
            const validTablesQuery = `
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = $1
            `;
            const validTableResult = await pool.query(validTablesQuery, [tableName]);
            
            if (validTableResult.rows.length === 0) {
                throw new Error('Table not found');
            }
            
            // Get table structure (columns)
            const columnsQuery = `
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = $1 AND table_schema = 'public'
                ORDER BY ordinal_position
            `;
            const columnsResult = await pool.query(columnsQuery, [tableName]);
            const allColumns = columnsResult.rows;

            // Filter columns based on permissions - Fix: pass currentUser instead of allColumns
            const filteredColumns = filterColumnsForDisplay(allColumns, tableName, currentUser);

            if (filteredColumns.length === 0) {
                return {
                    tableName,
                    columns: [],
                    rows: [],
                    pagination: { page: 1, limit, total: 0, totalPages: 0 }
                };
            }
            
            // Get total count
            const countQuery = `SELECT COUNT(*) as total FROM ${tableName}`;
            const countResult = await pool.query(countQuery);
            const total = parseInt(countResult.rows[0].total);
            
            // Build SELECT query with only visible columns
            const columnNames = filteredColumns.map(col => col.column_name).join(', ');
            const offset = (page - 1) * limit;
            const dataQuery = `SELECT ${columnNames} FROM ${tableName} ORDER BY 1 LIMIT $1 OFFSET $2`;
            const dataResult = await pool.query(dataQuery, [limit, offset]);
            
            // Filter the row data to only include visible columns
            const filteredRows = dataResult.rows.map(row => {
                const filteredRow = {};
                filteredColumns.forEach(column => {
                    filteredRow[column.column_name] = row[column.column_name];
                });
                return filteredRow;
            });
            
            return {
                tableName,
                columns: filteredColumns,
                rows: filteredRows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
            
        } catch (error) {
            console.error('Error in getTableData model method:', error);
            throw new Error('Error fetching table data: ' + error.message);
        }
    }
}

module.exports = User;