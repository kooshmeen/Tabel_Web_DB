// js/admin-dashboard.js

// js/admin-dashboard.js

let currentUser = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Admin Dashboard loading...');
    
    // Check authentication
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
    // Load tables on initial load
    loadDatabaseTables();
    // Refresh tables
    document.getElementById('refresh-tables-btn').addEventListener('click', function() {
        console.log('🔄 Refreshing tables...');
        loadDatabaseTables();
    });
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
