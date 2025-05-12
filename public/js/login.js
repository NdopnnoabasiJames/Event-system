document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    
    // Setup password toggle
    setupPasswordToggle('password', 'togglePassword');
    
    if (loginForm) {
        // Reset form errors on input
        loginForm.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', () => {
                const errorElement = document.getElementById(`${input.id}-error`);
                if (errorElement) {
                    errorElement.remove();
                }
                input.classList.remove('is-invalid');
            });
        });

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                const formData = getFormData(loginForm);
                
                // Validate form
                const { isValid, errors } = ErrorHandler.validateForm(formData, ValidationRules.login);
                
                if (!isValid) {
                    // Display validation errors
                    Object.entries(errors).forEach(([field, message]) => {
                        const input = document.getElementById(field);
                        input.classList.add('is-invalid');
                        
                        const errorElement = document.createElement('div');
                        errorElement.className = 'invalid-feedback';
                        errorElement.id = `${field}-error`;
                        errorElement.textContent = message;
                        
                        input.parentNode.appendChild(errorElement);
                    });
                    return;
                }                try {
                    const loginResponse = await auth.login(formData.email, formData.password);
                    console.log('Login successful:', loginResponse);                    // Make sure user data is available in localStorage
                    if (auth.getUser() && auth.getToken()) {
                        showToast('success', 'Login successful!');
                        
                        // Set a flag to indicate the user just logged in
                        sessionStorage.setItem('justLoggedIn', 'true');
                        
                        // Redirect based on user role
                        const user = auth.getUser();
                        setTimeout(() => {
                            if (user.role === 'admin') {
                                window.location.href = '../pages/admin-dashboard.html';
                            } else if (user.role === 'marketer') {
                                window.location.href = '../pages/marketer-dashboard.html';
                            } else {
                                window.location.href = '../pages/events.html';
                            }
                        }, 1000);
                    } else {
                        throw new Error('Failed to store authentication data');
                    }
                } catch (error) {
                    console.error('Login error:', error);
                    showToast('error', error.message || 'Login failed. Please try again.');
                }
            } catch (error) {
                // Error is already handled by the API call
                const errorMessage = error.response?.status === 401 ? 
                    ErrorMessages[ErrorTypes.AUTH].INVALID_CREDENTIALS :
                    error.message || 'Login failed. Please try again.';
                showToast('error', errorMessage);
            }
        });
    }
});
