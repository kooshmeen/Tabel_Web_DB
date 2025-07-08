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
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 2000);
            } else {
                errorDiv.style.display = 'block';
                errorDiv.textContent = result.message || 'Login failed';
            }
        } catch (error) {
            console.error('Error:', error);
            errorDiv.style.display = 'block';
            errorDiv.textContent = 'An error occurred during login';
        }
    });
})