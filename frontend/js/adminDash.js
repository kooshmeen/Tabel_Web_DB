let currentUser = null;
let currentSortColumn = null;
let currentSortDirection = 'asc';
let currentTableData = null; // Store the current table data for sorting

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Admin Dashboard loading...');
    
    const storedUser = localStorage.getItem('user');
    console.log('🔍 Stored user:', storedUser);
    
    if (!storedUser) {
        console.log('❌ No stored user, redirecting to login');
        window.location.href = 'login.html';
        return;
    }

    try {
        currentUser = JSON.parse(storedUser);
        console.log('👤 Parsed user:', currentUser);
        console.log('👤 User role:', currentUser.role);
        console.log('👤 Role type:', typeof currentUser.role);
    } catch (error) {
        console.error('❌ Error parsing user data:', error);
        localStorage.removeItem('user');
        window.location.href = 'login.html';
        return;
    }
    
    if (currentUser.role !== 'admin') {
        console.log('❌ User is not admin, role is:', currentUser.role);
        window.location.href = 'user-dashboard.html';
        return;
    }

    console.log('✅ Admin user confirmed, initializing dashboard...');
    initializeDashboard();
    setupEventListeners();
});

// Rest of your functions...
function initializeDashboard() {
    setupNavigation();
    // By default, show the tables section
    showSection('tables');
    loadDatabaseTables();
}

function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            
            if (section === 'tables') {
                loadDatabaseTables();
            }
            
            // Show section and update active tab
            showSection(section);
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

function showSection(sectionName) {
    document.querySelectorAll('.dashboard-section').forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(sectionName + '-section');
    if (targetSection) {
        targetSection.classList.add('active');
    }
}

function setupEventListeners() {
    // Logout
    document.getElementById('logout-btn').addEventListener('click', function() {
        localStorage.clear();
        window.location.href = 'login.html';
    });
    
    // Refresh tables
    document.getElementById('refresh-tables-btn').addEventListener('click', function() {
        console.log('🔄 Refreshing tables...');
        loadDatabaseTables();
    });
    
    // Back to tables button
    document.getElementById('back-to-tables-btn')?.addEventListener('click', function() {
        showSection('tables');
        // Update nav active state
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        document.querySelector('.nav-link[data-section="tables"]')?.classList.add('active');
    });
    
    // Setup table controls
    setupTableControls();
}

// The main function to load tables
async function loadDatabaseTables() {
    console.log('🔄 loadDatabaseTables called');
    
    const loading = document.getElementById('tables-loading');
    const tableBody = document.getElementById('tables-tbody');
    
    if (!loading || !tableBody) {
        console.error('❌ Required elements not found!');
        return;
    }
    
    loading.classList.remove('hidden');
    tableBody.innerHTML = '';
    
    try {
        const token = localStorage.getItem('token');
        console.log('🔑 Token exists:', !!token);
        console.log('🔑 Token value:', token);
        
        if (!token) {
            console.error('❌ No token found in localStorage');
            alert('No authentication token found. Please login again.');
            window.location.href = 'login.html';
            return;
        }
        
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        
        console.log('📡 Request headers:', headers);
        console.log('📡 Making request to /api/users/tables');
        
        const response = await fetch('/api/users/tables', {
            method: 'GET',
            headers: headers
        });
        
        console.log('📡 Response status:', response.status);
        console.log('📡 Response ok:', response.ok);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Response error:', errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        console.log('📡 Success response:', result);
        
        loading.classList.add('hidden');
        
        if (result.success && result.data && result.data.length > 0) {
            console.log('✅ Displaying tables:', result.data.length);
            
            result.data.forEach((table, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${table.name}</td>
                    <td>${table.schema || 'public'}</td>
                    <td>${table.rowCount || 0}</td>
                    <td>${table.columnCount || 0}</td>
                    <td>
                        <button class="btn btn-primary">View Data</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        } else {
            console.log('❌ No tables in response');
            document.getElementById('tables-empty')?.classList.remove('hidden');
        }
        
    } catch (error) {
        console.error('❌ Error loading tables:', error);
        loading.classList.add('hidden');
        alert('Error loading tables: ' + error.message);
    }
}

// Function to load data from a specific table
async function loadTableData(tableName) {
    console.log(`🔄 loadTableData called for table: ${tableName}`);
    
    const loading = document.getElementById('table-data-loading');
    const tableBody = document.getElementById('table-data-tbody');
    const tableHead = document.getElementById('table-data-thead');
    const tableTitle = document.getElementById('table-data-title');
    
    if (!loading || !tableBody) {
        console.error('❌ Required elements not found!');
        return;
    }
    
    loading.classList.remove('hidden');
    tableBody.innerHTML = '';
    if (tableHead) tableHead.innerHTML = '';
    if (tableTitle) tableTitle.textContent = `Table Data - ${tableName}`;
    
    try {
        const token = localStorage.getItem('token');
        
        if (!token) {
            console.error('❌ No token found in localStorage');
            alert('No authentication token found. Please login again.');
            window.location.href = 'login.html';
            return;
        }
        
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        
        const response = await fetch(`/api/users/tables/${tableName}`, {
            method: 'GET',
            headers: headers
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Response error:', errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        console.log('📡 Success response:', result);
        
        loading.classList.add('hidden');

        if (result.success && result.data && result.data.rows && result.data.rows.length > 0) {
            console.log(`✅ Displaying data for table ${tableName}:`, result.data.rows.length, 'rows');
            
            // Store the data for sorting
            currentTableData = result.data;
            
            // Reset sorting when loading new table
            currentSortColumn = null;
            currentSortDirection = 'asc';
            
            renderTable(tableName);
            
        } else {
            console.log(`❌ No data found for table ${tableName}`);
            document.getElementById('table-data-empty')?.classList.remove('hidden');
        }
        
    } catch (error) {
        console.error(`❌ Error loading data for table ${tableName}:`, error);
        loading.classList.add('hidden');
        alert(`Error loading data for table ${tableName}: ` + error.message);
    }
}

// New function to render the table with current data and sorting
function renderTable(tableName) {
    const tableBody = document.getElementById('table-data-tbody');
    const tableHead = document.getElementById('table-data-thead');
    
    if (!currentTableData || !tableBody) {
        return;
    }
    
    const { columns, rows } = currentTableData;
    
    // Clear existing content
    tableBody.innerHTML = '';
    if (tableHead) tableHead.innerHTML = '';
    
    // Update entry counter
    updateEntryCounter(rows.length, tableName);
    
    // Populate column filter
    populateColumnFilter(columns);
    
    // Setup search and filter functionality
    setupSearchAndFilter();
    
    // Create table headers with sorting functionality
    if (tableHead && columns && columns.length > 0) {
        const headerRow = document.createElement('tr');
        columns.forEach(column => {
            const th = document.createElement('th');
            th.style.cursor = 'pointer';
            th.style.userSelect = 'none';
            th.style.position = 'relative';
            
            // Create header content with sort indicator
            const headerContent = document.createElement('div');
            headerContent.style.display = 'flex';
            headerContent.style.alignItems = 'center';
            headerContent.style.justifyContent = 'space-between';
            
            const columnName = document.createElement('span');
            columnName.textContent = column.column_name;
            headerContent.appendChild(columnName);
            
            // Add sort indicator
            const sortIndicator = document.createElement('span');
            sortIndicator.className = 'sort-indicator';
            sortIndicator.style.marginLeft = '5px';
            sortIndicator.style.color = '#666';
            
            if (currentSortColumn === column.column_name) {
                sortIndicator.textContent = currentSortDirection === 'asc' ? '▲' : '▼';
                sortIndicator.style.color = '#007bff';
            } else {
                sortIndicator.textContent = '▲▼';
                sortIndicator.style.opacity = '0.3';
            }
            
            headerContent.appendChild(sortIndicator);
            th.appendChild(headerContent);
            
            // Add visual indicators for column permissions
            if (column.permissions && !column.permissions.editable) {
                th.classList.add('readonly-column');
                th.title = `${column.permissions.reason || 'This column is not editable'} - Click to sort`;
            } else if (column.permissions && column.permissions.editable) {
                th.classList.add('editable-column');
                th.title = 'Click cells to edit - Click header to sort';
            }
            
            // Add click handler for sorting
            th.addEventListener('click', () => sortTable(column.column_name, tableName));
            
            headerRow.appendChild(th);
        });
        
        // Add actions column
        const actionsHeader = document.createElement('th');
        actionsHeader.textContent = 'Actions';
        actionsHeader.style.cursor = 'default';
        headerRow.appendChild(actionsHeader);
        
        tableHead.appendChild(headerRow);
    }
    
    // Sort the data if a sort column is selected
    let sortedData = [...rows];
    if (currentSortColumn) {
        sortedData.sort((a, b) => {
            let aValue = a[currentSortColumn];
            let bValue = b[currentSortColumn];
            
            // Handle null/undefined values
            if (aValue === null || aValue === undefined) aValue = '';
            if (bValue === null || bValue === undefined) bValue = '';
            
            // Special handling for datetime columns
            if (currentSortColumn.includes('_at') || currentSortColumn.includes('date') || currentSortColumn.includes('time')) {
                // Try to parse as dates
                const aDate = new Date(aValue);
                const bDate = new Date(bValue);
                
                if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
                    // Valid dates - sort by timestamp
                    return currentSortDirection === 'asc' ? aDate.getTime() - bDate.getTime() : bDate.getTime() - aDate.getTime();
                }
            }
            
            // Convert to strings for comparison
            aValue = String(aValue).toLowerCase();
            bValue = String(bValue).toLowerCase();
            
            // Try to parse as numbers if possible
            const aNum = parseFloat(aValue);
            const bNum = parseFloat(bValue);
            
            if (!isNaN(aNum) && !isNaN(bNum)) {
                // Numeric sort
                return currentSortDirection === 'asc' ? aNum - bNum : bNum - aNum;
            } else {
                // String sort
                if (aValue < bValue) return currentSortDirection === 'asc' ? -1 : 1;
                if (aValue > bValue) return currentSortDirection === 'asc' ? 1 : -1;
                return 0;
            }
        });
    }
    
    // Create table rows with edit capabilities
    if (currentTableData.rowsWithPermissions) {
        // Use the new row-specific permissions
        const sortedRowsWithPermissions = sortedData.map(row => {
            // Find the original row data with permissions
            return currentTableData.rowsWithPermissions.find(rwp => 
                JSON.stringify(rwp.data) === JSON.stringify(row)
            );
        }).filter(Boolean);
        
        sortedRowsWithPermissions.forEach((rowData, index) => {
            const tr = document.createElement('tr');
            const row = rowData.data;
            const rowPermissions = rowData.permissions;
            
            rowPermissions.forEach(column => {
                const td = document.createElement('td');
                const value = row[column.column_name];
                
                if (column.permissions && column.permissions.editable) {
                    // Make editable cells
                    td.classList.add('editable-cell');
                    td.setAttribute('data-column', column.column_name);
                    td.setAttribute('data-table', tableName);
                    td.setAttribute('data-row-id', row.id || index);
                    td.setAttribute('data-original-value', value || '');
                    td.addEventListener('click', handleCellEdit);
                    td.title = 'Click to edit';
                } else {
                    // Read-only cells
                    td.classList.add('readonly-cell');
                    td.title = column.permissions?.reason || 'Read-only';
                }
                
                td.textContent = value !== null && value !== undefined ? value : '';
                tr.appendChild(td);
            });
            
            // Add actions column
            const actionsCell = document.createElement('td');
            actionsCell.innerHTML = `
                <button class="btn btn-sm btn-danger" onclick="deleteRow('${tableName}', ${row.id || index})">Delete</button>
            `;
            tr.appendChild(actionsCell);
            
            tableBody.appendChild(tr);
        });
    } else {
        // Fallback to old method if rowsWithPermissions is not available
        sortedData.forEach((row, index) => {
            const tr = document.createElement('tr');
            
            columns.forEach(column => {
                const td = document.createElement('td');
                const value = row[column.column_name];
                
                if (column.permissions && column.permissions.editable) {
                    // Make editable cells
                    td.classList.add('editable-cell');
                    td.setAttribute('data-column', column.column_name);
                    td.setAttribute('data-table', tableName);
                    td.setAttribute('data-row-id', row.id || index);
                    td.setAttribute('data-original-value', value || '');
                    td.addEventListener('click', handleCellEdit);
                    td.title = 'Click to edit';
                } else {
                    // Read-only cells
                    td.classList.add('readonly-cell');
                    td.title = column.permissions?.reason || 'Read-only';
                }
                
                td.textContent = value !== null && value !== undefined ? value : '';
                tr.appendChild(td);
            });
            
            // Add actions column
            const actionsCell = document.createElement('td');
            actionsCell.innerHTML = `
                <button class="btn btn-sm btn-danger" onclick="deleteRow('${tableName}', ${row.id || index})">Delete</button>
            `;
            tr.appendChild(actionsCell);
            
            tableBody.appendChild(tr);
        });
    }
}

// New function to handle sorting
function sortTable(columnName, tableName) {
    console.log(`🔄 Sorting table by column: ${columnName}`);
    
    if (currentSortColumn === columnName) {
        // Toggle direction if same column
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        // New column, start with ascending
        currentSortColumn = columnName;
        currentSortDirection = 'asc';
    }
    
    // Re-render the table with new sorting
    renderTable(tableName);
}

// Function to handle table data view button click
document.addEventListener('click', function(e) {
    if (e.target && e.target.matches('.btn-primary')) {
        const row = e.target.closest('tr');
        const tableName = row.querySelector('td:first-child').textContent.trim();
        console.log(`🔄 Button clicked for table: ${tableName}`);
        
        // Load data for the clicked table
        loadTableData(tableName);
        
        // Show the table data section
        showSection('table-data');
    }
});

// Function to handle cell editing
function handleCellEdit(event) {
    const cell = event.target;
    const currentValue = cell.textContent;
    const column = cell.getAttribute('data-column');
    const tableName = cell.getAttribute('data-table');
    const rowId = cell.getAttribute('data-row-id');
    const originalValue = cell.getAttribute('data-original-value');
    
    // Don't edit if already editing
    if (cell.querySelector('input')) {
        return;
    }
    
    // Create input field
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentValue;
    input.className = 'cell-editor';
    
    // Replace cell content with input
    cell.innerHTML = '';
    cell.appendChild(input);
    input.focus();
    input.select();
    
    // Handle save on Enter or blur
    const saveEdit = async () => {
        const newValue = input.value;
        
        // If value hasn't changed, just restore
        if (newValue === originalValue) {
            cell.textContent = currentValue;
            return;
        }
        
        try {
            // Show loading state
            cell.innerHTML = '<span class="saving">Saving...</span>';
            
            // Update database
            await updateCellValue(tableName, rowId, column, newValue);
            
            // Update UI
            cell.textContent = newValue;
            cell.setAttribute('data-original-value', newValue);
            cell.classList.add('cell-updated');
            
            // Remove updated class after animation
            setTimeout(() => {
                cell.classList.remove('cell-updated');
            }, 2000);
            
        } catch (error) {
            console.error('❌ Error updating cell:', error);
            cell.textContent = currentValue; // Restore original
            alert('Error updating cell: ' + error.message);
        }
    };
    
    const cancelEdit = () => {
        cell.textContent = currentValue;
    };
    
    // Event listeners
    input.addEventListener('blur', saveEdit);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveEdit();
        } else if (e.key === 'Escape') {
            cancelEdit();
        }
    });
}

// Function to update cell value in database
async function updateCellValue(tableName, rowId, column, newValue) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/users/tables/${tableName}/rows/${rowId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                [column]: newValue
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update cell');
        }
        
        const result = await response.json();
        console.log(`✅ Updated ${column} to ${newValue}`);
        return result;
        
    } catch (error) {
        console.error('❌ Error updating cell:', error);
        throw error;
    }
}

// Function to delete row
async function deleteRow(tableName, rowId) {
    if (!confirm('Are you sure you want to delete this row?')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/users/tables/${tableName}/rows/${rowId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete row');
        }
        
        // Reload the table data
        loadTableData(tableName);
        
    } catch (error) {
        console.error('❌ Error deleting row:', error);
        alert('Error deleting row: ' + error.message);
    }
}

// Add this new function to update the entry counter
function updateEntryCounter(count, tableName) {
    const counterElement = document.getElementById('entry-counter');
    if (counterElement) {
        counterElement.textContent = `Showing ${count} entries`;
    }
    
    // Update the table title with count
    const tableTitle = document.getElementById('table-data-title');
    if (tableTitle) {
        tableTitle.textContent = `Table Data - ${tableName} (${count} entries)`;
    }
}

// Add search functionality
function setupSearchAndFilter() {
    const searchInput = document.getElementById('search-input');
    const columnFilter = document.getElementById('column-filter');
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }
    
    if (columnFilter) {
        columnFilter.addEventListener('change', handleColumnFilter);
    }
}

// Debounce function to limit search frequency
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Handle search functionality
function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    const tableBody = document.getElementById('table-data-tbody');
    const rows = tableBody.querySelectorAll('tr');
    
    let visibleCount = 0;
    
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        let matchFound = false;
        
        cells.forEach(cell => {
            if (cell.textContent.toLowerCase().includes(searchTerm)) {
                matchFound = true;
            }
        });
        
        if (matchFound) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });
    
    // Update counter for filtered results
    const counterElement = document.getElementById('entry-counter');
    if (counterElement) {
        if (searchTerm) {
            counterElement.textContent = `Showing ${visibleCount} of ${rows.length} entries (filtered)`;
        } else {
            counterElement.textContent = `Showing ${rows.length} entries`;
        }
    }
}

// Populate column filter dropdown
function populateColumnFilter(columns) {
    const columnFilter = document.getElementById('column-filter');
    if (columnFilter) {
        columnFilter.innerHTML = '<option value="">Filter by column...</option>';
        columns.forEach(column => {
            const option = document.createElement('option');
            option.value = column.column_name;
            option.textContent = column.column_name;
            columnFilter.appendChild(option);
        });
    }
}

// Add refresh functionality
function setupTableControls() {
    const refreshBtn = document.getElementById('refresh-table-btn');
    const addEntryBtn = document.getElementById('add-entry-btn');
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            if (currentTableData) {
                loadTableData(currentTableData.tableName);
            }
        });
    }
    
    if (addEntryBtn) {
        addEntryBtn.addEventListener('click', () => {
            // Implement add entry functionality
            console.log('Add entry functionality to be implemented');
        });
    }
}

// Update your setupEventListeners function
function setupEventListeners() {
    // Logout
    document.getElementById('logout-btn').addEventListener('click', function() {
        localStorage.clear();
        window.location.href = 'login.html';
    });
    
    // Refresh tables
    document.getElementById('refresh-tables-btn').addEventListener('click', function() {
        console.log('🔄 Refreshing tables...');
        loadDatabaseTables();
    });
    
    // Back to tables button
    document.getElementById('back-to-tables-btn')?.addEventListener('click', function() {
        showSection('tables');
        // Update nav active state
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        document.querySelector('.nav-link[data-section="tables"]')?.classList.add('active');
    });
    
    // Setup table controls
    setupTableControls();
}

// Handle column filtering
function handleColumnFilter(event) {
    const selectedColumn = event.target.value;
    const searchInput = document.getElementById('search-input');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const tableBody = document.getElementById('table-data-tbody');
    const rows = tableBody.querySelectorAll('tr');

    let visibleCount = 0;

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        let matchFound = false;

        cells.forEach((cell, idx) => {
            // Only filter by the selected column if one is chosen
            if (selectedColumn) {
                const columnFilter = document.getElementById('column-filter');
                const columnIndex = Array.from(columnFilter.options).findIndex(opt => opt.value === selectedColumn);
                if (idx === columnIndex && cell.textContent.toLowerCase().includes(searchTerm)) {
                    matchFound = true;
                }
            } else {
                // If no column selected, search all columns
                if (cell.textContent.toLowerCase().includes(searchTerm)) {
                    matchFound = true;
                }
            }
        });

        if (matchFound) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });

    // Update counter for filtered results
    const counterElement = document.getElementById('entry-counter');
    if (counterElement) {
        if (searchTerm || selectedColumn) {
            counterElement.textContent = `Showing ${visibleCount} of ${rows.length} entries (filtered)`;
        } else {
            counterElement.textContent = `Showing ${rows.length} entries`;
        }
    }
}
