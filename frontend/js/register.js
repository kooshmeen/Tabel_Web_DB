document.addEventListener('DOMContentLoaded', function() {
    const userTypeSelect = document.getElementById('userType');
    const adminPasswordField = document.getElementById('adminPassword');
    const registerForm = document.getElementById('register-section');

    // Handle user type change
    userTypeSelect.addEventListener('change', function() {
        if (this.value === 'admin') {
            adminPasswordField.disabled = false;
            adminPasswordField.required = true;
            adminPasswordField.style.opacity = '1';
        } else {
            adminPasswordField.disabled = true;
            adminPasswordField.required = false;
            adminPasswordField.value = '';
            adminPasswordField.style.opacity = '0.5';
        }
    });

    // Initialize admin password field as disabled
    adminPasswordField.style.opacity = '0.5';

    // Handle form submission
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const formData = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            password: document.getElementById('password').value,
            userType: document.getElementById('userType').value,
            adminPassword: document.getElementById('adminPassword').value
        };

        try {
            const response = await fetch('/api/users/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (response.ok) {
                alert('Registration successful!');
                window.location.href = 'login.html';
            } else {
                alert(result.message || 'Registration failed');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred during registration');
        }
    });

    // Theme management functions
    function initializeTheme() {
        // Check for saved theme preference or default to light mode
        const savedTheme = localStorage.getItem('theme') || 'light';
        applyTheme(savedTheme);
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

    // Initialize theme first
    initializeTheme();

    // Add theme toggle event listener
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            toggleTheme();
        });
    }
});