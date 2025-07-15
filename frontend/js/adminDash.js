let currentUser = null;
let currentSortColumn = null;
let currentSortDirection = 'asc';
let currentTableData = null; // Store the current table data for sorting

// Pagination variables for normal table
let currentPage = 1;
let pageSize = 20;
let totalRows = 0;
let totalPages = 0;
let filteredRows = 0;
let isViewingAll = false;

let currentJoinData = null;
let currentJoinPage = 1;
let isJoinViewingAll = false;
let availableTables = [];
let tableRelationships = [];

// Theme management
function initializeTheme() {
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem('theme') || 'light';
    
    // Apply theme immediately without transition to prevent flash
    document.documentElement.style.transition = 'none';
    applyTheme(savedTheme);
    
    // Re-enable transitions after a short delay
    setTimeout(() => {
        document.documentElement.style.transition = '';
    }, 50);
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    // Update the theme toggle button
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
        themeToggle.title = theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    }
    
    console.log(`🎨 Theme changed to: ${theme}`);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Admin Dashboard loading...');
    
    // Initialize theme first
    initializeTheme();
    
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
    
    // Setup join functionality
    setupJoinFunctionality();
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
                    <td>
                        <input type="checkbox" class="table-checkbox" value="${table.name}" 
                               data-table-name="${table.name}">
                    </td>
                    <td>${table.name}</td>
                    <td>${table.schema || 'public'}</td>
                    <td>${table.rowCount || 0}</td>
                    <td>${table.columnCount || 0}</td>
                    <td>
                        <button class="btn btn-primary" onclick="viewTableData('${table.name}')">View Data</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
            
            // Set up checkbox event listeners
            setupTableCheckboxListeners();
            
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
            currentTableData.tableName = tableName; // Store table name for reference
            
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
    
    // Reset pagination
    currentPage = 1;
    isViewingAll = false;
    
    // Update entry counter
    updateEntryCounter(rows.length, tableName);
    
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
        
        // Add column search row
        const searchRow = document.createElement('tr');
        searchRow.className = 'column-search-row';
        columns.forEach(column => {
            const th = document.createElement('th');
            const searchInput = document.createElement('input');
            searchInput.type = 'text';
            searchInput.placeholder = `Search ${column.column_name}...`;
            searchInput.className = 'column-search-input';
            searchInput.dataset.column = column.column_name;
            
            // Add search event listener
            searchInput.addEventListener('input', debounce(() => {
                applyTableFilters();
            }, 300));
            
            th.appendChild(searchInput);
            searchRow.appendChild(th);
        });
        
        // Add empty actions column
        const actionsSearchTh = document.createElement('th');
        searchRow.appendChild(actionsSearchTh);
        
        tableHead.appendChild(searchRow);
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

// Update entry counter and pagination info
function updateEntryCounter(count, tableName) {
    totalRows = count;
    filteredRows = count;
    
    // Update entry counter element
    const counterElement = document.getElementById('entry-counter');
    if (counterElement) {
        counterElement.textContent = `${count} entries`;
    }
    
    // Update pagination info
    updateTablePagination();
    
    // Update the table title with count
    const tableTitle = document.getElementById('table-data-title');
    if (tableTitle) {
        tableTitle.textContent = `Table Data - ${tableName} (${count} entries)`;
    }
}

// Update table pagination similar to joined table pagination
function updateTablePagination() {
    const paginationInfo = document.getElementById('pagination-info');
    const pageNumbers = document.getElementById('page-numbers');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    
    // Calculate pagination
    totalPages = Math.ceil(filteredRows / pageSize);
    
    if (paginationInfo) {
        if (isViewingAll) {
            paginationInfo.textContent = `Showing all ${filteredRows} entries`;
        } else {
            const start = (currentPage - 1) * pageSize + 1;
            const end = Math.min(currentPage * pageSize, filteredRows);
            paginationInfo.textContent = `Showing ${start}-${end} of ${filteredRows} entries`;
        }
    }
    
    if (pageNumbers) {
        pageNumbers.innerHTML = '';
        
        if (!isViewingAll && totalPages > 1) {
            const maxPages = Math.min(totalPages, 10);
            const startPage = Math.max(1, currentPage - 5);
            const endPage = Math.min(totalPages, startPage + maxPages - 1);
            
            for (let i = startPage; i <= endPage; i++) {
                const pageBtn = document.createElement('button');
                pageBtn.textContent = i;
                pageBtn.className = `btn btn-sm ${i === currentPage ? 'btn-primary' : 'btn-secondary'}`;
                pageBtn.addEventListener('click', function() {
                    navigateToPage(i);
                });
                pageNumbers.appendChild(pageBtn);
            }
        }
    }
    
    if (prevBtn) {
        prevBtn.disabled = currentPage <= 1 || isViewingAll;
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentPage >= totalPages || isViewingAll;
    }
}

// Navigate to specific page
function navigateToPage(page) {
    currentPage = page;
    isViewingAll = false;
    applyTableFilters();
}

// Apply current filters for single table view
function applyTableFilters() {
    const globalSearchInput = document.getElementById('global-search-input');
    const globalSearchTerm = globalSearchInput ? globalSearchInput.value.toLowerCase() : '';
    
    const tableBody = document.getElementById('table-data-tbody');
    const rows = tableBody.querySelectorAll('tr');
    
    // Get all column search inputs
    const columnSearchInputs = document.querySelectorAll('.column-search-input');
    const columnFilters = {};
    columnSearchInputs.forEach(input => {
        const column = input.dataset.column;
        const value = input.value.toLowerCase();
        if (value) {
            columnFilters[column] = value;
        }
    });
    
    let visibleRows = [];
    
    // Filter rows based on search terms
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        let matchFound = true;
        
        // Check global search (searches all columns)
        if (globalSearchTerm) {
            let globalMatch = false;
            for (let i = 0; i < cells.length - 1; i++) { // -1 to exclude actions column
                const cell = cells[i];
                if (cell && cell.textContent.toLowerCase().includes(globalSearchTerm)) {
                    globalMatch = true;
                    break;
                }
            }
            if (!globalMatch) {
                matchFound = false;
            }
        }
        
        // Check individual column filters
        if (matchFound && Object.keys(columnFilters).length > 0) {
            const tableHead = document.getElementById('table-data-thead');
            if (tableHead) {
                const headerCells = tableHead.querySelectorAll('tr:first-child th');
                
                for (const [columnName, searchTerm] of Object.entries(columnFilters)) {
                    let columnIndex = -1;
                    
                    // Find the column index
                    headerCells.forEach((header, idx) => {
                        const headerText = header.querySelector('span') ? 
                            header.querySelector('span').textContent.trim() : 
                            header.textContent.trim();
                        
                        if (headerText === columnName) {
                            columnIndex = idx;
                        }
                    });
                    
                    if (columnIndex !== -1 && columnIndex < cells.length - 1) {
                        const cell = cells[columnIndex];
                        if (!cell || !cell.textContent.toLowerCase().includes(searchTerm)) {
                            matchFound = false;
                            break;
                        }
                    }
                }
            }
        }
        
        if (matchFound) {
            visibleRows.push(row);
        }
    });
    
    // Update filtered count
    filteredRows = visibleRows.length;
    
    // Apply pagination
    if (isViewingAll) {
        visibleRows.forEach(row => row.style.display = '');
        rows.forEach(row => {
            if (!visibleRows.includes(row)) {
                row.style.display = 'none';
            }
        });
    } else {
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        
        visibleRows.forEach((row, index) => {
            if (index >= startIndex && index < endIndex) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
        
        rows.forEach(row => {
            if (!visibleRows.includes(row)) {
                row.style.display = 'none';
            }
        });
    }
    
    updateTablePagination();
}

// Add search functionality
function setupSearchAndFilter() {
    const globalSearchInput = document.getElementById('global-search-input');
    const joinedGlobalSearchInput = document.getElementById('joined-global-search-input');
    
    if (globalSearchInput) {
        globalSearchInput.addEventListener('input', debounce(handleTableSearch, 300));
    }
    
    if (joinedGlobalSearchInput) {
        joinedGlobalSearchInput.addEventListener('input', debounce(handleJoinedTableSearch, 300));
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

// Handle search functionality for single table
function handleTableSearch(event) {
    currentPage = 1; // Reset to first page when searching
    isViewingAll = false;
    applyTableFilters();
}

// Handle search functionality for joined tables
function handleJoinedTableSearch(event) {
    applyJoinedTableFilters();
}

// Add refresh functionality
function setupTableControls() {
    const refreshBtn = document.getElementById('refresh-table-btn');
    const addEntryBtn = document.getElementById('add-entry-btn');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const viewAllBtn = document.getElementById('view-all-btn');
    
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
            showAddEntryModal();
        });
    }
    
    // Add pagination event listeners
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                navigateToPage(currentPage - 1);
            }
        });
    }
    
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                navigateToPage(currentPage + 1);
            }
        });
    }
    
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', () => {
            // Toggle viewing all entries
            // Change color when toggled to 'true'
            if (isViewingAll == true) {
                isViewingAll = false;
                viewAllBtn.classList.remove('active');
                viewAllBtn.style.background = '';
                viewAllBtn.style.color = '';
            } else {
                isViewingAll = true;
                viewAllBtn.classList.add('active');
                viewAllBtn.style.background = '#007bff';
                viewAllBtn.style.color = '#fff';
            }
            currentPage = 1;
            applyTableFilters();
        });
    }
}

// Function to show the add entry modal
async function showAddEntryModal() {
    const modal = document.getElementById('add-entry-modal');
    if (!modal) {
        console.error('❌ Add entry modal not found!');
        return;
    }

    // Check if we have current table data
    if (!currentTableData || !currentTableData.tableName) {
        console.error('❌ No current table data available!');
        alert('Please select a table first.');
        return;
    }

    modal.style.display = 'block';

    try {
        // Populate modal with table columns for entry
        const response2 = await fetch(`/api/users/tables/${currentTableData.tableName}/columns`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response2.ok) {
            throw new Error(`Failed to fetch columns: ${response2.status}`);
        }

    const columnsResponse = await response2.json();

    console.log('📡 Columns response for add entry:', columnsResponse);

    // Extract columns array from response
    const columns = columnsResponse.success ? columnsResponse.data : columnsResponse;
    
    if (!Array.isArray(columns)) {
        console.error('❌ Columns is not an array:', columns);
        alert('Error loading table columns. Please try again.');
        modal.style.display = 'none';
        return;
    }

    // Get modal body
    const modalBody = modal.querySelector('.modal-body');
    if (!modalBody) {
        console.error('❌ Modal body not found!');
        return;
    }


    console.log('📋 Columns to display in modal:', columns);

    // Remove is_nullable and id columns

    const filteredColumns = columns.filter(column =>
        column.is_nullable !== 'YES' &&
        column.column_name.toLowerCase() !== 'id'
    );

    console.log('📋 Filtered columns for modal:', filteredColumns);



    // Clear existing content
    modalBody.innerHTML = '';

    // Create form elements for each column
    const form = document.createElement('form');
    form.id = 'add-entry-form';
    filteredColumns.forEach(column => {
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';

        const label = document.createElement('label');
        label.textContent = column.column_name;
        formGroup.appendChild(label);

        const input = document.createElement('input');
        input.type = getInputType(column);
        input.name = column.column_name;
        input.className = 'form-control';
        formGroup.appendChild(input);

        form.appendChild(formGroup);
    });

    modalBody.appendChild(form);

    // Add button container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'modal-buttons';

    // Add save button
    const saveButton = document.createElement('button');
    saveButton.className = 'btn btn-primary';
    saveButton.textContent = 'Save Entry';
    saveButton.type = 'button';
    saveButton.addEventListener('click', () => {
        saveNewEntry(modal);
    });
    buttonContainer.appendChild(saveButton);

    // Add cancel button
    const cancelButton = document.createElement('button');
    cancelButton.className = 'btn btn-secondary';
    cancelButton.textContent = 'Cancel';
    cancelButton.type = 'button';
    cancelButton.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    buttonContainer.appendChild(cancelButton);

    modalBody.appendChild(buttonContainer);

    // Setup close button functionality
    const closeButton = modal.querySelector('.close');
    if (closeButton) {
        closeButton.onclick = () => {
            modal.style.display = 'none';
        };
    }

    } catch (error) {
        console.error('❌ Error loading modal:', error);
        alert('Error loading form. Please try again.');
        modal.style.display = 'none';
    }
}

// Helper function to determine input type based on column data type
function getInputType(column) {
    if (!column.data_type) return 'text';
    
    const dataType = column.data_type.toLowerCase();
    const columnName = column.column_name.toLowerCase();
    
    // Special cases based on column name
    if (columnName === 'password') {
        return 'password';
    } else if (columnName.includes('email')) {
        return 'email';
    } else if (columnName.includes('url') || columnName.includes('website')) {
        return 'url';
    }
    
    // Cases based on data type
    if (dataType.includes('int') || dataType.includes('serial')) {
        return 'number';
    } else if (dataType.includes('numeric') || dataType.includes('decimal') || dataType.includes('real') || dataType.includes('double')) {
        return 'number';
    } else if (dataType.includes('boolean')) {
        return 'checkbox';
    } else if (dataType === 'date') {
        return 'date';
    } else if (dataType.includes('time')) {
        return 'datetime-local';
    } else {
        return 'text';
    }
}

// Close modal when clicking outside of it
window.addEventListener('click', function(event) {
    const modal = document.getElementById('add-entry-modal');
    if (modal && event.target === modal) {
        modal.style.display = 'none';
    }
});

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
    
    // Setup join functionality
    setupJoinFunctionality();
}

// Function to save new entry to database
async function saveNewEntry(modal) {
    try {
        const form = modal.querySelector('#add-entry-form');
        if (!form) {
            console.error('❌ Form not found!');
            alert('Form not found. Please try again.');
            return;
        }

        // Validate form
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const formData = new FormData(form);
        const entryData = {};
        
        // Collect form data
        for (const [key, value] of formData.entries()) {
            // Always include all form fields, even empty ones for debugging
            entryData[key] = value;
        }
        
        console.log('🔍 All form data collected:', entryData);
        
        // Remove empty values after logging, but keep required fields
        const cleanedData = {};
        for (const [key, value] of Object.entries(entryData)) {
            const trimmedValue = value.trim();
            
            // Always include required fields, even if empty (for better error messages)
            // or include non-empty values
            if (trimmedValue !== '' || (currentTableData.tableName === 'users' && ['name', 'email', 'password'].includes(key))) {
                cleanedData[key] = trimmedValue;
            }
        }
        
        console.log('🔍 Cleaned data to send:', cleanedData);
        
        // Get table name
        const tableName = currentTableData.tableName;
        
        if (Object.keys(cleanedData).length === 0) {
            alert('Please fill in at least one field.');
            return;
        }
        
        // Show loading state
        const saveButton = modal.querySelector('.btn-primary');
        const originalText = saveButton.textContent;
        saveButton.textContent = 'Saving...';
        saveButton.disabled = true;
        
        console.log('🔄 Submitting data to:', `/api/users/tables/${tableName}/rows`);
        console.log('🔄 Final payload:', cleanedData);
        
        // Make API request
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/users/tables/${tableName}/rows`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(cleanedData)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || `HTTP ${response.status}: Failed to add entry`);
        }
        
        console.log('✅ Entry added successfully:', result);
        
        // Close modal
        modal.style.display = 'none';
        
        // Refresh table data
        if (currentTableData && currentTableData.tableName) {
            await loadTableData(currentTableData.tableName);
        }
        
        // Show success message
        alert('Entry added successfully!');
        
    } catch (error) {
        console.error('❌ Error saving entry:', error);
        
        // Show user-friendly error message
        let errorMessage = 'Error saving entry: ';
        if (error.message.includes('required')) {
            errorMessage += 'Please fill in all required fields.';
        } else if (error.message.includes('Invalid')) {
            errorMessage += 'Please check your data format.';
        } else if (error.message.includes('too long')) {
            errorMessage += 'One or more fields exceed the maximum length.';
        } else {
            errorMessage += error.message;
        }
        
        alert(errorMessage);
        
        // Restore button state
        const saveButton = modal.querySelector('.btn-primary');
        if (saveButton) {
            saveButton.textContent = 'Save Entry';
            saveButton.disabled = false;
        }
    }
}

// region JOIN

// Initialize join functionality
function initializeJoinSection() {
    console.log('🔄 Initializing join section...');
    
    // Load available tables
    loadJoinableTables();
    
    // Setup event listeners
    setupJoinEventListeners();
}

// Setup join event listeners
function setupJoinEventListeners() {
    // Table selection handlers
    document.getElementById('left-table-select').addEventListener('change', handleTableSelection);
    document.getElementById('right-table-select').addEventListener('change', handleTableSelection);
    
    // Join condition handler
    document.getElementById('join-condition').addEventListener('change', handleJoinConditionChange);
    
    // Button handlers
    document.getElementById('execute-join-btn').addEventListener('click', executeJoin);
    document.getElementById('preview-join-btn').addEventListener('click', previewJoin);
    document.getElementById('refresh-joins-btn').addEventListener('click', loadJoinableTables);
    
    // Pagination handlers
    document.getElementById('join-prev-page').addEventListener('click', () => navigateJoinPage(-1));
    document.getElementById('join-next-page').addEventListener('click', () => navigateJoinPage(1));
}

// Load joinable tables
async function loadJoinableTables() {
    console.log('🔄 Loading joinable tables...');
    
    const loading = document.getElementById('joins-loading');
    const errorDiv = document.getElementById('joins-error');
    
    try {
        loading.classList.remove('hidden');
        errorDiv.classList.add('hidden');
        
        const token = localStorage.getItem('token');
        const response = await fetch('/api/users/joins/tables', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            availableTables = result.data;
            populateTableSelects();
            
            // Also load relationships
            await loadTableRelationships();
        } else {
            throw new Error(result.error || 'Failed to load tables');
        }
        
    } catch (error) {
        console.error('❌ Error loading joinable tables:', error);
        showJoinError('Error loading tables: ' + error.message);
    } finally {
        loading.classList.add('hidden');
    }
}

// Load table relationships
async function loadTableRelationships() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/users/joins/relationships', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            tableRelationships = result.data;
            console.log('📊 Table relationships loaded:', tableRelationships);
        }
        
    } catch (error) {
        console.error('❌ Error loading table relationships:', error);
    }
}

// Populate table select dropdowns
function populateTableSelects() {
    const leftSelect = document.getElementById('left-table-select');
    const rightSelect = document.getElementById('right-table-select');
    
    // Clear existing options
    leftSelect.innerHTML = '<option value="">Select left table...</option>';
    rightSelect.innerHTML = '<option value="">Select right table...</option>';
    
    // Add table options
    availableTables.forEach(table => {
        const leftOption = document.createElement('option');
        leftOption.value = table.table_name;
        leftOption.textContent = table.table_name;
        leftSelect.appendChild(leftOption);
        
        const rightOption = document.createElement('option');
        rightOption.value = table.table_name;
        rightOption.textContent = table.table_name;
        rightSelect.appendChild(rightOption);
    });
}

// Handle table selection
async function handleTableSelection() {
    const leftTable = document.getElementById('left-table-select').value;
    const rightTable = document.getElementById('right-table-select').value;
    
    if (leftTable && rightTable && leftTable !== rightTable) {
        await loadJoinSuggestions(leftTable, rightTable);
    } else {
        // Clear join conditions
        const joinConditionSelect = document.getElementById('join-condition');
        joinConditionSelect.innerHTML = '<option value="">Select join condition...</option>';
    }
}

// Load join suggestions
async function loadJoinSuggestions(leftTable, rightTable) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/users/joins/suggestions/${leftTable}/${rightTable}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
        
        const result = await response.json();
        
        const joinConditionSelect = document.getElementById('join-condition');
        joinConditionSelect.innerHTML = '<option value="">Select join condition...</option>';
        
        if (result.success && result.data.length > 0) {
            result.data.forEach(condition => {
                const option = document.createElement('option');
                option.value = condition;
                option.textContent = condition;
                joinConditionSelect.appendChild(option);
            });
        } else {
            // Add manual option if no suggestions
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No automatic joins found - use custom condition';
            option.disabled = true;
            joinConditionSelect.appendChild(option);
        }
        
    } catch (error) {
        console.error('❌ Error loading join suggestions:', error);
    }
}

// Handle join condition change
function handleJoinConditionChange() {
    const selectedCondition = document.getElementById('join-condition').value;
    const customCondition = document.getElementById('custom-join-condition');
    
    if (selectedCondition) {
        customCondition.value = selectedCondition;
    }
}

// Preview join query
function previewJoin() {
    const leftTable = document.getElementById('left-table-select').value;
    const rightTable = document.getElementById('right-table-select').value;
    const joinCondition = document.getElementById('custom-join-condition').value || 
                         document.getElementById('join-condition').value;
    
    if (!leftTable || !rightTable || !joinCondition) {
        alert('Please select both tables and a join condition');
        return;
    }
    
    const queryInfo = document.getElementById('join-query-info');
    queryInfo.innerHTML = `
        <strong>Query Preview:</strong><br>
        SELECT * FROM ${leftTable}<br>
        LEFT JOIN ${rightTable} ON ${joinCondition}
    `;
    
    document.getElementById('join-results').style.display = 'block';
}

// Execute join
async function executeJoin() {
    const leftTable = document.getElementById('left-table-select').value;
    const rightTable = document.getElementById('right-table-select').value;
    const joinCondition = document.getElementById('custom-join-condition').value || 
                         document.getElementById('join-condition').value;
    
    if (!leftTable || !rightTable || !joinCondition) {
        alert('Please select both tables and a join condition');
        return;
    }
    
    const loading = document.getElementById('joins-loading');
    const errorDiv = document.getElementById('joins-error');
    
    try {
        loading.classList.remove('hidden');
        errorDiv.classList.add('hidden');
        
        const token = localStorage.getItem('token');
        const response = await fetch('/api/users/joins/execute', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                leftTable,
                rightTable,
                joinCondition,
                page: currentJoinPage,
                // limit is pageSize if Viewing All is false, otherwise 1000
                limit: isJoinViewingAll ? 1000 : pageSize
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            currentJoinData = result.data;
            renderJoinResults();
            document.getElementById('join-results').style.display = 'block';
        } else {
            throw new Error(result.error || 'Failed to execute join');
        }
        
    } catch (error) {
        console.error('❌ Error executing join:', error);
        showJoinError('Error executing join: ' + error.message);
    } finally {
        loading.classList.add('hidden');
    }
}

// Helper function to view individual table data
function viewTableData(tableName) {
    loadTableData(tableName);
    showSection('table-data');
}

// Render join results
function renderJoinResults() {
    if (!currentJoinData) return;
    
    const { leftTable, rightTable, joinCondition, columns, rows, pagination } = currentJoinData;
    
    // Update query info
    const queryInfo = document.getElementById('join-query-info');
    queryInfo.innerHTML = `
        <strong>Executed Query:</strong><br>
        SELECT * FROM ${leftTable} LEFT JOIN ${rightTable} ON ${joinCondition}<br>
        <strong>Results:</strong> ${pagination.total} total rows, showing page ${pagination.page} of ${pagination.totalPages}
    `;
    
    // Clear existing table
    const tableHead = document.getElementById('join-results-thead');
    const tableBody = document.getElementById('join-results-tbody');
    tableHead.innerHTML = '';
    tableBody.innerHTML = '';
    
    if (rows.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="100%">No results found</td></tr>';
        return;
    }
    
    // Create headers with table grouping
    const headerRow = document.createElement('tr');
    
    // Left table headers
    const leftTableHeader = document.createElement('th');
    leftTableHeader.textContent = leftTable.toUpperCase() + ' (Double-click to edit)';
    leftTableHeader.colSpan = columns[leftTable].length;
    leftTableHeader.className = 'table-header-group left-table-col';
    headerRow.appendChild(leftTableHeader);
    
    // Right table headers
    const rightTableHeader = document.createElement('th');
    rightTableHeader.textContent = rightTable.toUpperCase() + ' (Double-click to edit)';
    rightTableHeader.colSpan = columns[rightTable].length;
    rightTableHeader.className = 'table-header-group right-table-col';
    headerRow.appendChild(rightTableHeader);
    
    tableHead.appendChild(headerRow);
    
    // Column headers
    const columnHeaderRow = document.createElement('tr');
    
    // Left table columns
    columns[leftTable].forEach(column => {
        const th = document.createElement('th');
        th.textContent = column.column_name;
        th.className = 'left-table-col';
        
        // Add visual indicators for column permissions
        const permissions = column.permissions || getBasicPermissions(column.column_name);
        if (!permissions.editable) {
            th.classList.add('readonly-column');
            th.title = permissions.reason || 'This column is not editable';
        } else if (permissions.editable) {
            th.classList.add('editable-column');
            th.title = 'Double-click cells to edit';
        }
        
        columnHeaderRow.appendChild(th);
    });
    
    // Right table columns
    columns[rightTable].forEach(column => {
        const th = document.createElement('th');
        th.textContent = column.column_name;
        th.className = 'right-table-col';
        
        // Add visual indicators for column permissions
        const permissions = column.permissions || getBasicPermissions(column.column_name);
        if (!permissions.editable) {
            th.classList.add('readonly-column');
            th.title = permissions.reason || 'This column is not editable';
        } else if (permissions.editable) {
            th.classList.add('editable-column');
            th.title = 'Double-click cells to edit';
        }
        
        columnHeaderRow.appendChild(th);
    });
    
    tableHead.appendChild(columnHeaderRow);
    
    // Create data rows
    rows.forEach(rowData => {
        const tr = document.createElement('tr');
        
        // Left table data
        columns[leftTable].forEach(column => {
            const td = document.createElement('td');
            const value = rowData[leftTable][column.column_name];
            td.textContent = value !== null && value !== undefined ? value : '';
            td.className = 'left-table-col';
            
            // Add metadata for editing
            td.setAttribute('data-source-table', leftTable);
            td.setAttribute('data-column', column.column_name);
            td.setAttribute('data-original-value', value || '');
            
            // Add row ID if available (assuming 'id' is the primary key)
            const rowId = rowData[leftTable]['id'];
            if (rowId) {
                td.setAttribute('data-row-id', rowId);
                
                // Check if cell is editable based on permissions (like single table view)
                const permissions = column.permissions || getBasicPermissions(column.column_name);
                if (permissions.editable) {
                    td.classList.add('editable-cell');
                    td.addEventListener('dblclick', handleJoinCellEdit);
                    td.title = 'Double-click to edit';
                } else {
                    td.classList.add('readonly-cell');
                    if (permissions.reason) {
                        td.title = permissions.reason;
                    }
                }
            }
            
            tr.appendChild(td);
        });
        
        // Right table data
        columns[rightTable].forEach(column => {
            const td = document.createElement('td');
            const value = rowData[rightTable][column.column_name];
            td.textContent = value !== null && value !== undefined ? value : '';
            td.className = 'right-table-col';
            
            // Add metadata for editing
            td.setAttribute('data-source-table', rightTable);
            td.setAttribute('data-column', column.column_name);
            td.setAttribute('data-original-value', value || '');
            
            // Add row ID if available
            const rowId = rowData[rightTable]['id'];
            if (rowId) {
                td.setAttribute('data-row-id', rowId);
                
                // Check if cell is editable based on permissions (like single table view)
                const permissions = column.permissions || getBasicPermissions(column.column_name);
                if (permissions.editable) {
                    td.classList.add('editable-cell');
                    td.addEventListener('dblclick', handleJoinCellEdit);
                    td.title = 'Double-click to edit';
                } else {
                    td.classList.add('readonly-cell');
                    if (permissions.reason) {
                        td.title = permissions.reason;
                    }
                }
            }
            
            tr.appendChild(td);
        });
        
        tableBody.appendChild(tr);
    });
    
    // Update pagination
    updateJoinPagination();
}

// Update join pagination
function updateJoinPagination() {
    if (!currentJoinData) return;
    
    const { pagination } = currentJoinData;
    const paginationInfo = document.getElementById('join-pagination-info');
    const pageNumbers = document.getElementById('join-page-numbers');
    const prevBtn = document.getElementById('join-prev-page');
    const nextBtn = document.getElementById('join-next-page');
    
    // Update info
    const start = ((pagination.page - 1) * pagination.limit) + 1;
    const end = Math.min(pagination.page * pagination.limit, pagination.total);
    paginationInfo.textContent = `Showing ${start}-${end} of ${pagination.total} results`;
    
    // Update buttons
    prevBtn.disabled = pagination.page <= 1;
    nextBtn.disabled = pagination.page >= pagination.totalPages;
    
    // Update page numbers
    pageNumbers.innerHTML = '';
    const maxPageNumbers = 5;
    let startPage = Math.max(1, pagination.page - Math.floor(maxPageNumbers / 2));
    let endPage = Math.min(pagination.totalPages, startPage + maxPageNumbers - 1);
    
    if (endPage - startPage + 1 < maxPageNumbers) {
        startPage = Math.max(1, endPage - maxPageNumbers + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.className = `page-number ${i === pagination.page ? 'active' : ''}`;
        pageBtn.addEventListener('click', () => navigateJoinToPage(i));
        pageNumbers.appendChild(pageBtn);
    }
}

// Navigate join page
function navigateJoinPage(direction) {
    if (!currentJoinData) return;
    
    const newPage = currentJoinPage + direction;
    if (newPage >= 1 && newPage <= currentJoinData.pagination.totalPages) {
        navigateJoinToPage(newPage);
    }
}

// Navigate to specific join page
function navigateJoinToPage(page) {
    currentJoinPage = page;
    executeJoin();
}

// Show join error
function showJoinError(message) {
    const errorDiv = document.getElementById('joins-error');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    
    setTimeout(() => {
        errorDiv.classList.add('hidden');
    }, 5000);
}

// Setup join functionality
function setupJoinFunctionality() {
    // Join tables button
    const joinBtn = document.getElementById('join-tables-btn');
    if (joinBtn) {
        joinBtn.addEventListener('click', function() {
            const selectedTables = getSelectedTables();
            if (selectedTables.length >= 2) {
                performTableJoin(selectedTables);
            } else {
                alert('Please select at least 2 tables to join');
            }
        });
    }
    
    // Select all tables checkbox
    // const selectAllCheckbox = document.getElementById('select-all-tables');
    // if (selectAllCheckbox) {
    //     selectAllCheckbox.addEventListener('change', function() {
    //         const tableCheckboxes = document.querySelectorAll('.table-checkbox');
    //         tableCheckboxes.forEach(checkbox => {
    //             checkbox.checked = this.checked;
    //         });
    //         updateJoinButtonState();
    //     });
    // }
    
    // Back to tables from join section
    const backFromJoinBtn = document.getElementById('back-to-tables-from-join-btn');
    if (backFromJoinBtn) {
        backFromJoinBtn.addEventListener('click', function() {
            showSection('tables');
            // Update nav active state
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            document.querySelector('.nav-link[data-section="tables"]')?.classList.add('active');
        });
    }
    
    // Refresh joined data
    const refreshJoinedBtn = document.getElementById('refresh-joined-btn');
    if (refreshJoinedBtn) {
        refreshJoinedBtn.addEventListener('click', function() {
            if (currentJoinData && currentJoinData.tableNames) {
                performTableJoin(currentJoinData.tableNames);
            }
        });
    }
    
    // Join pagination
    const joinPrevBtn = document.getElementById('joined-prev-page');
    const joinNextBtn = document.getElementById('joined-next-page');
    
    if (joinPrevBtn) {
        joinPrevBtn.addEventListener('click', function() {
            if (currentJoinPage > 1 && !isJoinViewingAll) {
                currentJoinPage--;
                if (currentJoinData && currentJoinData.tableNames) {
                    performTableJoin(currentJoinData.tableNames, currentJoinPage);
                }
            }
        });
    }
    
    if (joinNextBtn) {
        joinNextBtn.addEventListener('click', function() {
            if (currentJoinData && currentJoinData.pagination && currentJoinPage < currentJoinData.pagination.totalPages && !isJoinViewingAll) {
                currentJoinPage++;
                performTableJoin(currentJoinData.tableNames, currentJoinPage);
            }
        });
    }
    
    // Join view all button
    const joinViewAllBtn = document.getElementById('joined-view-all-btn');
    if (joinViewAllBtn) {
        joinViewAllBtn.addEventListener('click', function() {
            // Toggle viewing all entries for joined tables
            if (isJoinViewingAll) {
                isJoinViewingAll = false;
                joinViewAllBtn.classList.remove('active');
                joinViewAllBtn.style.background = '';
                joinViewAllBtn.style.color = '';
                // Return to paginated view
                currentJoinPage = 1;
                if (currentJoinData && currentJoinData.tableNames) {
                    performTableJoin(currentJoinData.tableNames, currentJoinPage);
                }
            } else {
                isJoinViewingAll = true;
                joinViewAllBtn.classList.add('active');
                joinViewAllBtn.style.background = '#007bff';
                joinViewAllBtn.style.color = '#fff';
                // Load all data
                if (currentJoinData && currentJoinData.tableNames) {
                    performTableJoin(currentJoinData.tableNames, 1, true);
                }
            }
        });
    }
}

// Setup table checkbox listeners
function setupTableCheckboxListeners() {
    const tableCheckboxes = document.querySelectorAll('.table-checkbox');
    tableCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateJoinButtonState);
    });
}

// Get selected tables
function getSelectedTables() {
    const checkboxes = document.querySelectorAll('.table-checkbox:checked');
    // if join contains 'users' table, make that primary table (first table in array)
    const selectedTables = Array.from(checkboxes).map(checkbox => checkbox.value);
    if (selectedTables.includes('users')) {
        selectedTables.unshift(selectedTables.splice(selectedTables.indexOf('users'), 1)[0]);
    }
    return selectedTables;
}

// Update join button state
function updateJoinButtonState() {
    const selectedTables = getSelectedTables();
    const joinBtn = document.getElementById('join-tables-btn');
    
    if (joinBtn) {
        if (selectedTables.length >= 2) {
            joinBtn.disabled = false;
            joinBtn.textContent = `Join Selected Tables (${selectedTables.length})`;
        } else {
            joinBtn.disabled = true;
            joinBtn.textContent = 'Join Selected Tables';
        }
    }
}

// Perform table join
async function performTableJoin(tableNames, page = 1, viewAll = false) {
    console.log(`🔄 Performing join operation on tables: ${tableNames.join(', ')}`);
    
    // Update view all state
    if (!viewAll) {
        isJoinViewingAll = false;
        const joinViewAllBtn = document.getElementById('joined-view-all-btn');
        if (joinViewAllBtn) {
            joinViewAllBtn.classList.remove('active');
            joinViewAllBtn.style.background = '';
            joinViewAllBtn.style.color = '';
        }
    }
    
    const loading = document.getElementById('joined-tables-loading');
    const tableBody = document.getElementById('joined-tables-tbody');
    const tableHead = document.getElementById('joined-tables-thead');
    const tableTitle = document.getElementById('joined-tables-title');
    const joinInfo = document.getElementById('join-info-text');
    
    if (!loading || !tableBody || !tableHead) {
        console.error('❌ Required elements not found!');
        return;
    }
    
    loading.classList.remove('hidden');
    tableBody.innerHTML = '';
    tableHead.innerHTML = '';
    
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
        
        const requestBody = {
            tableNames: tableNames
        };
        
        console.log('📡 Making join request:', requestBody);
        
        // Use a very high limit for view all, or no limit parameter for paginated view
        const limitParam = viewAll ? '&limit=10000' : '&limit=20';
        const response = await fetch(`/api/users/tables/join?page=${page}${limitParam}`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Join response error:', errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        console.log('📡 Join success response:', result);
        
        loading.classList.add('hidden');
        
        if (result.success && result.data) {
            currentJoinData = result.data;
            currentJoinPage = page;
            
            // Update UI
            if (tableTitle) {
                tableTitle.textContent = `Joined Table Data - ${tableNames.join(' ⟵ ')}`;
            }
            
            if (joinInfo) {
                joinInfo.textContent = `${result.data.joinType} operation on ${tableNames.length} tables. Total rows: ${result.data.pagination.total}`;
            }
            
            // Create table headers
            if (result.data.columns && result.data.columns.length > 0) {
                const headerRow = document.createElement('tr');
                result.data.columns.forEach(column => {
                    const th = document.createElement('th');
                    th.textContent = column.display_name || column.column_name;
                    th.setAttribute('data-column', column.column_name);
                    headerRow.appendChild(th);
                });
                tableHead.appendChild(headerRow);
                
                // Add column search row for joined tables
                const searchRow = document.createElement('tr');
                searchRow.className = 'joined-column-search-row';
                result.data.columns.forEach(column => {
                    const th = document.createElement('th');
                    const searchInput = document.createElement('input');
                    searchInput.type = 'text';
                    searchInput.placeholder = `Search ${column.display_name || column.column_name}...`;
                    searchInput.className = 'joined-column-search-input';
                    searchInput.dataset.column = column.display_name || column.column_name;
                    
                    // Add search event listener
                    searchInput.addEventListener('input', debounce(() => {
                        applyJoinedTableFilters();
                    }, 300));
                    
                    th.appendChild(searchInput);
                    searchRow.appendChild(th);
                });
                tableHead.appendChild(searchRow);
            }
            
            // Create table rows
            if (result.data.rows && result.data.rows.length > 0) {
                result.data.rows.forEach(row => {
                    const tr = document.createElement('tr');
                    result.data.columns.forEach(column => {
                        const td = document.createElement('td');
                        const value = row[column.display_name] || row[column.column_name];
                        td.textContent = value !== null && value !== undefined ? value : '';
                        
                        // Add metadata for potential editing
                        td.setAttribute('data-column', column.column_name);
                        td.setAttribute('data-original-value', value || '');
                        
                        // Determine source table and row ID from display name if available
                        if (column.display_name && column.display_name.includes('.')) {
                            const parts = column.display_name.split('.');
                            const sourceTable = parts[0];
                            td.setAttribute('data-source-table', sourceTable);
                            
                            // Look for ID in the row data
                            const idColumnName = `${sourceTable}.id`;
                            const rowId = row[idColumnName];
                            if (rowId) {
                                td.setAttribute('data-row-id', rowId);
                                
                                // Check if cell is editable based on permissions
                                const permissions = column.permissions || getBasicPermissions(column.column_name);
                                if (permissions.editable) {
                                    td.classList.add('editable-cell');
                                    td.classList.add(`${sourceTable}-table-col`);
                                    td.addEventListener('dblclick', handleJoinCellEdit);
                                    td.title = 'Double-click to edit';
                                } else {
                                    td.classList.add('readonly-cell');
                                    if (permissions.reason) {
                                        td.title = permissions.reason;
                                    }
                                }
                            }
                        }
                        
                        tr.appendChild(td);
                    });
                    tableBody.appendChild(tr);
                });
            }
            // Update pagination
            updateJoinPagination(result.data.pagination);
            
            // Update joined entry counter
            const joinedEntryCounter = document.getElementById('joined-entry-counter');
            if (joinedEntryCounter) {
                joinedEntryCounter.textContent = `${result.data.pagination.total} entries`;
            }
            
            // Setup search functionality for joined tables
            setupSearchAndFilter();
            
            // Show the joined tables section
            showSection('joined-tables');
            
        } else {
            console.log('❌ No joined data in response');
            document.getElementById('joined-tables-empty')?.classList.remove('hidden');
        }
        
    } catch (error) {
        console.error('❌ Error performing join:', error);
        loading.classList.add('hidden');
        alert('Error performing join: ' + error.message);
    }
}

// Update join pagination
function updateJoinPagination(pagination) {
    const paginationInfo = document.getElementById('joined-pagination-info');
    const pageNumbers = document.getElementById('joined-page-numbers');
    const prevBtn = document.getElementById('joined-prev-page');
    const nextBtn = document.getElementById('joined-next-page');
    
    if (paginationInfo) {
        if (isJoinViewingAll) {
            paginationInfo.textContent = `Showing all ${pagination.total} entries`;
        } else {
            const start = (pagination.page - 1) * pagination.limit + 1;
            const end = Math.min(pagination.page * pagination.limit, pagination.total);
            paginationInfo.textContent = `Showing ${start}-${end} of ${pagination.total} entries`;
        }
    }
    
    if (pageNumbers) {
        pageNumbers.innerHTML = '';
        
        // Only show page numbers if not viewing all
        if (!isJoinViewingAll && pagination.totalPages > 1) {
            const maxPages = Math.min(pagination.totalPages, 10);
            const startPage = Math.max(1, pagination.page - 5);
            const endPage = Math.min(pagination.totalPages, startPage + maxPages - 1);
            
            for (let i = startPage; i <= endPage; i++) {
                const pageBtn = document.createElement('button');
                pageBtn.textContent = i;
                pageBtn.className = `btn btn-sm ${i === pagination.page ? 'btn-primary' : 'btn-secondary'}`;
                pageBtn.addEventListener('click', function() {
                    if (currentJoinData && currentJoinData.tableNames && !isJoinViewingAll) {
                        currentJoinPage = i;
                        performTableJoin(currentJoinData.tableNames, i);
                    }
                });
                pageNumbers.appendChild(pageBtn);
            }
        }
    }
    
    if (prevBtn) {
        prevBtn.disabled = pagination.page <= 1 || isJoinViewingAll;
    }
    
    if (nextBtn) {
        nextBtn.disabled = pagination.page >= pagination.totalPages || isJoinViewingAll;
    }
}

// Function to handle cell editing in join view
function handleJoinCellEdit(event) {
    const cell = event.target;
    const currentValue = cell.textContent;
    const column = cell.getAttribute('data-column');
    const sourceTable = cell.getAttribute('data-source-table');
    const rowId = cell.getAttribute('data-row-id');
    const originalValue = cell.getAttribute('data-original-value');
    
    // Don't edit if already editing or no row ID
    if (cell.querySelector('input') || !rowId) {
        return;
    }
    
    console.log(`📝 Editing cell: ${sourceTable}.${column} for row ${rowId}`);
    
    // Create input field
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentValue;
    input.className = 'cell-editor join-cell-editor';
    
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
            
            // Update database using the source table
            await updateCellValue(sourceTable, rowId, column, newValue);
            
            // Update UI
            cell.textContent = newValue;
            cell.setAttribute('data-original-value', newValue);
            cell.classList.add('cell-updated');
            
            // Remove updated class after animation
            setTimeout(() => {
                cell.classList.remove('cell-updated');
            }, 2000);
            
        } catch (error) {
            console.error('❌ Error updating join cell:', error);
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

// Initialize theme toggle when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Add theme toggle event listener if not already added
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle && !themeToggle.hasAttribute('data-theme-listener')) {
        themeToggle.addEventListener('click', function() {
            toggleTheme();
        });
        themeToggle.setAttribute('data-theme-listener', 'true');
    }
});

// Helper function to check if join API returned permissions
function checkJoinPermissions(joinData) {
    if (!joinData || !joinData.columns) return false;
    
    // Check if any column has permissions data
    for (const tableName in joinData.columns) {
        const columns = joinData.columns[tableName];
        for (const column of columns) {
            if (column.permissions) {
                return true;
            }
        }
    }
    return false;
}

// Helper function to fall back to basic permission checking
function getBasicPermissions(columnName) {
    // If no permissions from API, use basic rules
    const readOnlyColumns = ['id', 'created_at', 'updated_at', 'order_date'];
    const foreignKeyPattern = /_id$/;
    
    if (readOnlyColumns.includes(columnName) || foreignKeyPattern.test(columnName)) {
        return {
            editable: false,
            reason: 'This column is not editable (system managed)'
        };
    }
    
    return {
        editable: true
    };
}

// Apply current filters for joined table view
function applyJoinedTableFilters() {
    const globalSearchInput = document.getElementById('joined-global-search-input');
    const globalSearchTerm = globalSearchInput ? globalSearchInput.value.toLowerCase() : '';
    
    const tableBody = document.getElementById('joined-tables-tbody');
    const rows = tableBody.querySelectorAll('tr');
    
    // Get all column search inputs for joined tables
    const columnSearchInputs = document.querySelectorAll('.joined-column-search-input');
    const columnFilters = {};
    columnSearchInputs.forEach(input => {
        const column = input.dataset.column;
        const value = input.value.toLowerCase();
        if (value) {
            columnFilters[column] = value;
        }
    });
    
    console.log('🔍 Joined table filters:', { globalSearchTerm, columnFilters });
    
    let visibleRows = [];
    
    // Filter rows based on search terms
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        let matchFound = true;
        
        // Check global search (searches all columns)
        if (globalSearchTerm) {
            let globalMatch = false;
            for (let i = 0; i < cells.length; i++) {
                const cell = cells[i];
                if (cell && cell.textContent.toLowerCase().includes(globalSearchTerm)) {
                    globalMatch = true;
                    break;
                }
            }
            if (!globalMatch) {
                matchFound = false;
            }
        }
        
        // Check individual column filters
        if (matchFound && Object.keys(columnFilters).length > 0) {
            const tableHead = document.getElementById('joined-tables-thead');
            if (tableHead) {
                // Get the actual column header row (not the search input row)
                const headerRow = tableHead.querySelector('tr:not(.joined-column-search-row)');
                
                if (headerRow) {
                    const headerCells = headerRow.querySelectorAll('th');
                    console.log('📋 Header cells found:', Array.from(headerCells).map(h => h.textContent.trim()));
                    
                    for (const [columnName, searchTerm] of Object.entries(columnFilters)) {
                        let columnIndex = -1;
                        
                        // Find the column index by matching the column name exactly
                        headerCells.forEach((header, idx) => {
                            const headerText = header.textContent.trim();
                            if (headerText === columnName) {
                                columnIndex = idx;
                            }
                        });
                        
                        console.log(`🔍 Column "${columnName}" search term "${searchTerm}" found at index ${columnIndex}`);
                        
                        if (columnIndex !== -1 && columnIndex < cells.length) {
                            const cell = cells[columnIndex];
                            const cellText = cell ? cell.textContent.toLowerCase() : '';
                            const matches = cellText.includes(searchTerm);
                            console.log(`🔍 Cell [${columnIndex}] text "${cellText}" matches "${searchTerm}": ${matches}`);
                            
                            if (!cell || !matches) {
                                matchFound = false;
                                break;
                            }
                        }
                    }
                }
            }
        }
        
        if (matchFound) {
            visibleRows.push(row);
        }
    });
    
    // Update filtered count
    const entryCounter = document.getElementById('joined-entry-counter');
    if (entryCounter) {
        entryCounter.textContent = `${visibleRows.length} entries (filtered)`;
    }
    
    // Show/hide rows based on filter results
    rows.forEach(row => {
        if (visibleRows.includes(row)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}
