// URL-ul API-ului backend
const API_URL = 'http://localhost:3000/api';

// Elemente DOM
const userForm = document.getElementById('userForm');
const usersContainer = document.getElementById('usersContainer');
const refreshButton = document.getElementById('refreshUsers');
const editModal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');
const messageArea = document.getElementById('messageArea');

// Inițializare când se încarcă pagina
document.addEventListener('DOMContentLoaded', function() {
    loadUsers();
    setupEventListeners();
});

// Configurează event listeners
function setupEventListeners() {
    // Formular pentru adăugare user
    userForm.addEventListener('submit', handleAddUser);
    
    // Buton refresh
    refreshButton.addEventListener('click', loadUsers);
    
    // Modal editare
    document.querySelector('.close').addEventListener('click', closeEditModal);
    document.getElementById('cancelEdit').addEventListener('click', closeEditModal);
    editForm.addEventListener('submit', handleEditUser);
    
    // Închide modal dacă se face click în afara lui
    window.addEventListener('click', function(event) {
        if (event.target === editModal) {
            closeEditModal();
        }
    });
}

// Încarcă și afișează utilizatorii
async function loadUsers() {
    try {
        showMessage('Loading users...', 'info');
        
        const response = await fetch(`${API_URL}/users`);
        const data = await response.json();
        
        if (data.success) {
            displayUsers(data.data);
            showMessage(`Loaded ${data.count} users`, 'success');
        } else {
            throw new Error(data.error || 'Failed to load users');
        }
    } catch (error) {
        console.error('Error loading users:', error);
        showMessage('Error loading users: ' + error.message, 'error');
        usersContainer.innerHTML = '<p class="error">Failed to load users. Make sure the backend is running.</p>';
    }
}

// Afișează lista de utilizatori
function displayUsers(users) {
    if (users.length === 0) {
        usersContainer.innerHTML = '<p>No users found. Add some users to get started!</p>';
        return;
    }
    
    const usersHTML = users.map(user => `
        <div class="user-card" data-user-id="${user.id}">
            <div class="user-info">
                <h3>${escapeHtml(user.name)}</h3>
                <p><strong>Email:</strong> ${escapeHtml(user.email)}</p>
                <p><strong>ID:</strong> ${user.id}</p>
                <p><strong>Created:</strong> ${formatDate(user.created_at)}</p>
            </div>
            <div class="user-actions">
                <button class="btn btn-edit" onclick="openEditModal(${user.id}, '${escapeHtml(user.name)}', '${escapeHtml(user.email)}')">
                    Edit
                </button>
                <button class="btn btn-danger" onclick="deleteUser(${user.id}, '${escapeHtml(user.name)}')">
                    Delete
                </button>
            </div>
        </div>
    `).join('');
    
    usersContainer.innerHTML = usersHTML;
}

// Adaugă utilizator nou
async function handleAddUser(event) {
    event.preventDefault();
    
    const formData = new FormData(userForm);
    const userData = {
        name: formData.get('name').trim(),
        email: formData.get('email').trim(),
        password: formData.get('password')
    };
    
    // Validare de bază
    if (!userData.name || !userData.email || !userData.password) {
        showMessage('All fields are required', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage(`User "${userData.name}" created successfully!`, 'success');
            userForm.reset();
            loadUsers(); // Reîncarcă lista
        } else {
            throw new Error(data.error || 'Failed to create user');
        }
    } catch (error) {
        console.error('Error creating user:', error);
        showMessage('Error creating user: ' + error.message, 'error');
    }
}

// Deschide modal pentru editare
function openEditModal(userId, userName, userEmail) {
    document.getElementById('editUserId').value = userId;
    document.getElementById('editName').value = userName;
    document.getElementById('editEmail').value = userEmail;
    editModal.style.display = 'block';
}

// Închide modal editare
function closeEditModal() {
    editModal.style.display = 'none';
    editForm.reset();
}

// Editează utilizator
async function handleEditUser(event) {
    event.preventDefault();
    
    const userId = document.getElementById('editUserId').value;
    const formData = new FormData(editForm);
    const userData = {
        name: formData.get('name').trim(),
        email: formData.get('email').trim()
    };
    
    if (!userData.name || !userData.email) {
        showMessage('Name and email are required', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage(`User "${userData.name}" updated successfully!`, 'success');
            closeEditModal();
            loadUsers(); // Reîncarcă lista
        } else {
            throw new Error(data.error || 'Failed to update user');
        }
    } catch (error) {
        console.error('Error updating user:', error);
        showMessage('Error updating user: ' + error.message, 'error');
    }
}

// Șterge utilizator
async function deleteUser(userId, userName) {
    if (!confirm(`Are you sure you want to delete user "${userName}"?`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/users/${userId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage(`User "${userName}" deleted successfully!`, 'success');
            loadUsers(); // Reîncarcă lista
        } else {
            throw new Error(data.error || 'Failed to delete user');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showMessage('Error deleting user: ' + error.message, 'error');
    }
}

// Afișează mesaje către utilizator
function showMessage(message, type = 'info') {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    messageElement.textContent = message;
    
    messageArea.appendChild(messageElement);
    
    // Elimină mesajul după 5 secunde
    setTimeout(() => {
        if (messageElement.parentNode) {
            messageElement.parentNode.removeChild(messageElement);
        }
    }, 5000);
}

// Funcții utilitare
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}