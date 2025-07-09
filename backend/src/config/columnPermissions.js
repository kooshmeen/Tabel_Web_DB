const COLUMN_PERMISSIONS = {
    'users': {
        'id': { visible: true, editable: false, reason: 'Primary key' },
        'name': { visible: true, editable: true },
        'email': { visible: true, editable: true },
        'password': { visible: false, editable: false, reason: 'Sensitive data' },
        'role': { 
            visible: true, 
            editable: 'conditional',
            reason: 'Role management restricted'
        },
        'created_at': { visible: true, editable: false, reason: 'System timestamp' }
    },
    'default': {
        'id': { visible: true, editable: false, reason: 'Primary key' },
        'password': { visible: false, editable: false, reason: 'Sensitive data' },
        'token': { visible: false, editable: false, reason: 'Sensitive data' },
        'created_at': { visible: true, editable: false, reason: 'System timestamp' },
        'updated_at': { visible: true, editable: false, reason: 'System timestamp' }
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

module.exports = {
    COLUMN_PERMISSIONS,
    getColumnPermissions,
    filterColumnsForDisplay,
    filterColumnsForEdit,
    getRowPermissions // Add this new function
};