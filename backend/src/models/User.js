const pool = require('../config/database');
const bcrypt = require('bcrypt');
const { filterColumnsForDisplay, getRowPermissions } = require('../config/columnPermissions');

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
        const query = `SELECT id, name, email, role FROM users WHERE id = $1`;
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

    // Get all column names for a specific table, including their data types and permissions
    static async getTableColumns(tableName, currentUser) {
        try {
            console.log(`📊 Fetching columns for table: ${tableName}`);
            
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
            
            // Get column information
            const columnsQuery = `
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = $1 AND table_schema = 'public'
                ORDER BY ordinal_position
            `;
            const columnsResult = await pool.query(columnsQuery, [tableName]);
            const allColumns = columnsResult.rows;
            
            return allColumns;
        }
        catch (error) {
            console.error('Error in getTableColumns model method:', error);
            throw new Error('Error fetching table columns: ' + error.message);
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

            // Filter columns based on permissions (for display)
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
            
            // For each row, calculate permissions based on the actual row data
            const rowsWithPermissions = dataResult.rows.map(row => {
                // Get row-specific permissions
                const rowPermissions = getRowPermissions(filteredColumns, tableName, currentUser, row);
                
                // Filter the row data to only include visible columns
                const filteredRow = {};
                rowPermissions.forEach(column => {
                    filteredRow[column.column_name] = row[column.column_name];
                });
                
                return {
                    data: filteredRow,
                    permissions: rowPermissions
                };
            });
            
            return {
                tableName,
                columns: filteredColumns,
                rows: rowsWithPermissions.map(r => r.data), // Just the data for backward compatibility
                rowsWithPermissions, // Include permissions for frontend
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

    // Add a new row to a specific table
    static async addTableRow(tableName, rowData, currentUser) {
        try {
            // Validate table name
            const validTablesQuery = `
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = $1
            `;
            const validTableResult = await pool.query(validTablesQuery, [tableName]);
            
            if (validTableResult.rows.length === 0) {
                throw new Error('Table not found');
            }
            
            // Get table columns information
            const columnsQuery = `
                SELECT column_name, data_type, is_nullable, column_default, 
                       character_maximum_length, numeric_precision, numeric_scale
                FROM information_schema.columns 
                WHERE table_name = $1 AND table_schema = 'public'
                ORDER BY ordinal_position
            `;
            const columnsResult = await pool.query(columnsQuery, [tableName]);
            const allColumns = columnsResult.rows;
            
            // Filter columns that can be edited for new entries
            const { filterColumnsForAdd } = require('../config/columnPermissions');
            const addableColumns = filterColumnsForAdd(allColumns, tableName, currentUser);
            
            // Validate required fields (but exclude columns with defaults)
            const requiredColumns = allColumns.filter(col => 
                col.is_nullable === 'NO' && 
                (col.column_default === null || col.column_default === '') &&
                col.column_name !== 'id' // Skip auto-increment ID
            );
            
            console.log('🔍 All columns for', tableName, ':', allColumns.map(c => ({
                name: c.column_name,
                nullable: c.is_nullable,
                default: c.column_default
            })));
            console.log('🔍 Required columns for', tableName, ':', requiredColumns.map(c => c.column_name));
            console.log('🔍 Received data keys:', Object.keys(rowData));
            console.log('🔍 Received data values:', rowData);
            
            for (const requiredCol of requiredColumns) {
                const columnName = requiredCol.column_name;
                const value = rowData[columnName];
                
                console.log(`🔍 Checking required field '${columnName}':`, value, 'Type:', typeof value);
                
                if (!rowData.hasOwnProperty(columnName) || 
                    value === null || 
                    value === undefined || 
                    String(value).trim() === '') {
                    console.log(`❌ Missing required field: ${columnName}`);
                    throw new Error(`Field '${columnName}' is required`);
                }
            }
            
            // Validate data types and permissions
            const validatedData = {};
            const insertColumns = [];
            const insertValues = [];
            const insertPlaceholders = [];
            
            for (const [columnName, value] of Object.entries(rowData)) {
                // Find column info
                const columnInfo = allColumns.find(col => col.column_name === columnName);
                if (!columnInfo) {
                    console.warn(`Warning: Column '${columnName}' not found in table schema`);
                    continue;
                }
                
                // Check if column can be added
                const canAdd = addableColumns.some(col => col.column_name === columnName);
                if (!canAdd) {
                    console.warn(`Warning: Column '${columnName}' is not addable for new entries`);
                    continue;
                }
                
                // Special handling for password hashing in users table
                let validatedValue = value;
                if (tableName === 'users' && columnName === 'password') {
                    if (value && value.trim() !== '') {
                        console.log('🔐 Hashing password for new user');
                        validatedValue = await bcrypt.hash(value.trim(), 10);
                    }
                } else {
                    // Validate and convert data types
                    validatedValue = value;
                }
                
                if (validatedValue !== null && validatedValue !== '' && validatedValue !== undefined) {
                    // Skip data type validation for hashed passwords
                    if (!(tableName === 'users' && columnName === 'password')) {
                        switch (columnInfo.data_type.toLowerCase()) {
                            case 'integer':
                            case 'bigint':
                            case 'smallint':
                                validatedValue = parseInt(validatedValue);
                                if (isNaN(validatedValue)) {
                                    throw new Error(`Invalid integer value for '${columnName}': ${value}`);
                                }
                                break;
                                
                            case 'numeric':
                            case 'decimal':
                            case 'real':
                            case 'double precision':
                                validatedValue = parseFloat(validatedValue);
                                if (isNaN(validatedValue)) {
                                    throw new Error(`Invalid numeric value for '${columnName}': ${value}`);
                                }
                                break;
                                
                            case 'boolean':
                                if (typeof validatedValue === 'string') {
                                    validatedValue = validatedValue.toLowerCase() === 'true' || validatedValue === '1';
                                } else {
                                    validatedValue = Boolean(validatedValue);
                                }
                                break;
                                
                            case 'date':
                                const dateValue = new Date(validatedValue);
                                if (isNaN(dateValue.getTime())) {
                                    throw new Error(`Invalid date value for '${columnName}': ${value}`);
                                }
                                validatedValue = validatedValue; // Keep as string for SQL
                                break;
                                
                            case 'timestamp':
                            case 'timestamp with time zone':
                            case 'timestamp without time zone':
                                const timestampValue = new Date(validatedValue);
                                if (isNaN(timestampValue.getTime())) {
                                    throw new Error(`Invalid timestamp value for '${columnName}': ${value}`);
                                }
                                validatedValue = validatedValue; // Keep as string for SQL
                                break;
                                
                            case 'character varying':
                            case 'varchar':
                            case 'text':
                                validatedValue = String(validatedValue);
                                if (columnInfo.character_maximum_length && 
                                    validatedValue.length > columnInfo.character_maximum_length) {
                                    throw new Error(`Value too long for '${columnName}'. Maximum length: ${columnInfo.character_maximum_length}`);
                                }
                                break;
                                
                            default:
                                validatedValue = String(validatedValue);
                        }
                    }
                }
                
                validatedData[columnName] = validatedValue;
                insertColumns.push(columnName);
                insertValues.push(validatedValue);
                insertPlaceholders.push(`$${insertValues.length}`);
            }
            
            if (insertColumns.length === 0) {
                throw new Error('No valid data provided for insertion');
            }
            
            // Build and execute INSERT query
            const insertQuery = `
                INSERT INTO ${tableName} (${insertColumns.join(', ')})
                VALUES (${insertPlaceholders.join(', ')})
                RETURNING *
            `;
            
            console.log('🔍 Executing insert query:', insertQuery);
            console.log('🔍 With values:', insertValues);
            
            const result = await pool.query(insertQuery, insertValues);
            const newRow = result.rows[0];
            
            return {
                id: newRow.id,
                data: newRow,
                message: 'Row added successfully'
            };
            
        } catch (error) {
            console.error('❌ Error in addTableRow model method:', error);
            throw new Error('Error adding row: ' + error.message);
        }
    }

    // Update a specific row in a table
    static async updateTableRow(tableName, rowId, updates, currentUser) {
        try {
            const { filterColumnsForEdit } = require('../config/columnPermissions');
            
            // Validate table name
            const validTablesQuery = `
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = $1
            `;
            const validTableResult = await pool.query(validTablesQuery, [tableName]);
            
            if (validTableResult.rows.length === 0) {
                throw new Error('Table not found');
            }
            
            // Get table columns
            const columnsQuery = `
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = $1 AND table_schema = 'public'
                ORDER BY ordinal_position
            `;
            const columnsResult = await pool.query(columnsQuery, [tableName]);
            const allColumns = columnsResult.rows;
            
            // Get current row data for conditional permissions
            const currentRowQuery = `SELECT * FROM ${tableName} WHERE id = $1`;
            const currentRowResult = await pool.query(currentRowQuery, [rowId]);
            const currentRow = currentRowResult.rows[0];
            
            if (!currentRow) {
                throw new Error('Row not found');
            }
            
            // Filter columns that can be edited
            const editableColumns = filterColumnsForEdit(allColumns, tableName, currentUser, currentRow);
            const editableColumnNames = editableColumns.map(col => col.column_name);
            
            // Validate that all update fields are editable
            const updateFields = Object.keys(updates);
            for (const field of updateFields) {
                if (!editableColumnNames.includes(field)) {
                    throw new Error(`Column '${field}' is not editable`);
                }
            }
            
            // Build dynamic UPDATE query
            const setClause = updateFields.map((field, index) => `${field} = $${index + 2}`).join(', ');
            const updateQuery = `
                UPDATE ${tableName} 
                SET ${setClause} 
                WHERE id = $1 
                RETURNING *
            `;
            
            const values = [rowId, ...updateFields.map(field => updates[field])];
            const result = await pool.query(updateQuery, values);
            
            return result.rows[0];
            
        } catch (error) {
            console.error('Error updating table row:', error);
            throw new Error('Error updating table row: ' + error.message);
        }
    }

    // Delete a specific row from a table
    static async deleteTableRow(tableName, rowId, currentUser) {
        try {
            // Validate table name
            const validTablesQuery = `
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = $1
            `;
            const validTableResult = await pool.query(validTablesQuery, [tableName]);
            
            if (validTableResult.rows.length === 0) {
                throw new Error('Table not found');
            }
            
            // Check if row exists
            const checkRowQuery = `SELECT id FROM ${tableName} WHERE id = $1`;
            const checkResult = await pool.query(checkRowQuery, [rowId]);
            
            if (checkResult.rows.length === 0) {
                throw new Error('Row not found');
            }
            
            // For now, allow all admins to delete rows
            // You can add more specific permissions here
            if (currentUser.role !== 'admin') {
                console.log('---------', currentUser);
                throw new Error('Only admins can delete rows');
            }

            // Prevent admins from deleting rows in the users table where the target is an admin
            if (tableName === 'users') {
                const rowQuery = `SELECT role FROM ${tableName} WHERE id = $1`;
                const rowResult = await pool.query(rowQuery, [rowId]);
                const targetRow = rowResult.rows[0];
                if (targetRow && targetRow.role === 'admin') {
                    throw new Error('Cannot delete admin user');
                }
            }
            
            // Delete the row
            const deleteQuery = `DELETE FROM ${tableName} WHERE id = $1 RETURNING id`;
            const result = await pool.query(deleteQuery, [rowId]);
            
            return result.rows[0];
            
        } catch (error) {
            console.error('Error deleting table row:', error);
            throw new Error('Error deleting table row: ' + error.message);
        }
    }

    
}

module.exports = User;