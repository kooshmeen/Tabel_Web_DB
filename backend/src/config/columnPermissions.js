const COLUMN_PERMISSIONS = {
    'users': {
        'id': { visible: true, editable: false, addable: false, reason: 'Primary key (auto-generated)' },
        'name': { visible: true, editable: true, addable: true },
        'email': { visible: true, editable: true, addable: true },
        'password': { visible: false, editable: false, addable: true, reason: 'Sensitive data (hidden when editing, required when creating)' },
        'role': { 
            visible: true, 
            editable: 'conditional',
            addable: 'conditional',
            reason: 'Role management restricted'
        },
        'created_at': { visible: true, editable: false, addable: false, reason: 'System timestamp (auto-generated)' },
        'updated_at': { visible: true, editable: false, addable: false, reason: 'System timestamp (auto-generated)' }
    },
    'default': {
        'id': { visible: true, editable: false, addable: false, reason: 'Primary key (auto-generated)' },
        'password': { visible: false, editable: false, addable: true, reason: 'Sensitive data' },
        'token': { visible: false, editable: false, addable: false, reason: 'Sensitive data' },
        'created_at': { visible: true, editable: false, addable: false, reason: 'System timestamp (auto-generated)' },
        'updated_at': { visible: true, editable: false, addable: false, reason: 'System timestamp (auto-generated)' }
    }
};

// Function to get column permissions for a specific table
function getColumnPermissions(tableName, columnName, currentUser, targetRow = null) {
    const tableConfig = COLUMN_PERMISSIONS[tableName] || {};
    const defaultConfig = COLUMN_PERMISSIONS['default'] || {};
    
    // Get specific column config or fall back to default patterns
    let columnConfig = tableConfig[columnName];
    
    if (!columnConfig) {
        // Check if column name matches any default patterns
        for (const [pattern, config] of Object.entries(defaultConfig)) {
            if (columnName.toLowerCase().includes(pattern.toLowerCase())) {
                columnConfig = config;
                break;
            }
        }
    }
    
    // If no config found, assume it's editable
    if (!columnConfig) {
        columnConfig = { visible: true, editable: true };
    }
    
    // Handle conditional permissions
    if (columnConfig.editable === 'conditional') {
        if (tableName === 'users' && columnName === 'role') {
            // Only allow role editing if current user is admin and target is not admin
            if (currentUser.role === 'admin' && targetRow && targetRow.role !== 'admin') {
                columnConfig = { ...columnConfig, editable: true };
            } else {
                columnConfig = { ...columnConfig, editable: false };
            }
        }
    }
    
    return columnConfig;
}

// Function to filter columns based on permissions
function filterColumnsForDisplay(columns, tableName, currentUser) {
    return columns.filter(column => {
        const permissions = getColumnPermissions(tableName, column.column_name, currentUser);
        return permissions.visible;
    }).map(column => ({
        ...column,
        permissions: getColumnPermissions(tableName, column.column_name, currentUser)
    }));
}

// Add a new function to get permissions for a specific row
function getRowPermissions(columns, tableName, currentUser, targetRow) {
    return columns.map(column => ({
        ...column,
        permissions: getColumnPermissions(tableName, column.column_name, currentUser, targetRow)
    }));
}

// Function to filter columns for editing
function filterColumnsForEdit(columns, tableName, currentUser, targetRow = null) {
    return columns.filter(column => {
        const permissions = getColumnPermissions(tableName, column.column_name, currentUser, targetRow);
        return permissions.visible && permissions.editable;
    });
}

// Function to filter columns for creating new entries (different from editing)
function filterColumnsForAdd(columns, tableName, currentUser) {
    return columns.filter(column => {
        const columnName = column.column_name;
        
        // Get table-specific configuration
        const tableConfig = COLUMN_PERMISSIONS[tableName] || {};
        const defaultConfig = COLUMN_PERMISSIONS['default'] || {};
        
        // Get column configuration
        let columnConfig = tableConfig[columnName];
        
        if (!columnConfig) {
            // Check if column name matches any default patterns
            for (const [pattern, config] of Object.entries(defaultConfig)) {
                if (columnName.toLowerCase().includes(pattern.toLowerCase())) {
                    columnConfig = config;
                    break;
                }
            }
        }
        
        // If we have a specific configuration, use it
        if (columnConfig) {
            // Handle conditional addability
            if (columnConfig.addable === 'conditional') {
                if (tableName === 'users' && columnName === 'role') {
                    // Only admins can set roles when creating users
                    return currentUser.role === 'admin';
                }
                // Add more conditional logic here as needed
                return false; // Default to not addable for unknown conditionals
            }
            
            // Use explicit addable setting
            return columnConfig.addable !== false;
        }
        
        // If no specific config, use sensible defaults
        // Always skip auto-increment ID columns
        if (columnName === 'id') {
            return false;
        }
        
        // Always skip auto-generated timestamps
        if (columnName === 'created_at' || columnName === 'updated_at') {
            return false;
        }
        
        // For other columns, allow them (let database validation handle requirements)
        return true;
    });
}

module.exports = {
    COLUMN_PERMISSIONS,
    getColumnPermissions,
    filterColumnsForDisplay,
    filterColumnsForEdit,
    getRowPermissions,
    filterColumnsForAdd // Add this new function
};