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
                    const loginResponse = await auth.login(formData.email, formData.password);                    console.log('Login successful:', loginResponse);                    // Make sure user data is available in localStorage
                    if (auth.getUser() && auth.getToken()) {
                        showToast('success', 'Login successful!');
                        
                        // Set a flag to indicate the user just logged in
                        sessionStorage.setItem('justLoggedIn', 'true');
                        
                        // Redirect based on user role
                        const user = auth.getUser();
                        console.log('User for redirection:', user);
                        setTimeout(() => {
                            // Check if there's a return URL in the session storage
                            const returnTo = sessionStorage.getItem('returnToAfterLogin');
                            
                            if (returnTo) {                                // Clear the return URL from session storage
                                sessionStorage.removeItem('returnToAfterLogin');
                                  // Check if the user is authorized to access the requested page
                                if (returnTo === 'admin-dashboard.html' && user.role !== 'admin') {
                                    showToast('error', 'Only administrators can access the dashboard');
                                    window.location.href = '../pages/events.html';
                                } else if (returnTo === 'hierarchical-admin-dashboard.html' && !['super_admin', 'state_admin', 'branch_admin'].includes(user.role)) {
                                    showToast('error', 'Only hierarchical administrators can access this dashboard');
                                    window.location.href = '../pages/events.html';
                                } else {
                                    // Redirect to the requested page
                                    window.location.href = '../pages/' + returnTo;
                                }
                            } else {                            // Default redirection based on user role
                                console.log('No return URL found, redirecting based on role:', user.role);
                                if (['super_admin', 'state_admin', 'branch_admin'].includes(user.role)) {
                                    console.log('Redirecting to hierarchical admin dashboard');
                                    window.location.href = '../pages/hierarchical-admin-dashboard.html';
                                } else if (user.role === 'admin') {
                                    console.log('Redirecting to admin dashboard');
                                    window.location.href = '../pages/admin-dashboard.html';
                                } else if (user.role === 'marketer') {
                                    console.log('Redirecting to marketer dashboard');
                                    window.location.href = '../pages/marketer-dashboard.html';
                                } else if (user.role === 'concierge') {
                                    console.log('Redirecting to concierge dashboard');
                                    window.location.href = '../pages/concierge-dashboard.html';
                                } else {
                                    console.log('Redirecting to events page');
                                    window.location.href = '../pages/events.html';
                                }
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
