document.addEventListener('DOMContentLoaded', function() {
    const succesDiv = document.getElementById('login-success');
    const errorDiv = document.getElementById('login-error');
    const loginButton = document.getElementById('login-button');

    // Handle form submission
    loginButton.addEventListener('click', async function(e) {
        e.preventDefault();

        const formData = {
            email: document.getElementById('login-email').value,
            password: document.getElementById('login-password').value
        };

        try {
            const response = await fetch('/api/users/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            console.log('Login response:', result);

            if (response.ok) {
                succesDiv.style.display = 'block';
                succesDiv.textContent = 'Login successful! Redirecting...';
                const userRole = result.data.user.role;
                
                console.log('User role:', userRole);

                // Store user and token in localStorage
                localStorage.setItem('user', JSON.stringify(result.data.user));
                localStorage.setItem('token', result.data.token);

                // Redirect based on user role
                if (userRole === 'admin') {
                    setTimeout(() => {
                        window.location.href = 'dashboard-admin.html';
                    }, 200); // Redirect to admin dashboard
                } else if (userRole === 'user') {
                    setTimeout(() => {
                        window.location.href = 'dashboard-user.html';
                    }, 200); // Redirect to user dashboard
                }
            } else {
                errorDiv.style.display = 'block';
                errorDiv.textContent = result.message || 'Login failed';
            }
        } catch (error) {
            console.error('Error:', error);
            errorDiv.style.display = 'block';
            errorDiv.textContent = 'An error occurred during login';
        }

        // Clear form fields
        document.getElementById('login-email').value = '';
        document.getElementById('login-password').value = '';

        // Clear success and error messages
        setTimeout(() => {
            succesDiv.style.display = 'none';
            errorDiv.style.display = 'none';
        }, 1000);
    });
})