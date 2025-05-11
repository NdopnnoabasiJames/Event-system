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
                }

                const response = await auth.login(formData.email, formData.password);
                
                if (response.access_token) {
                    showToast('success', 'Login successful!');
                    setTimeout(() => {
                        window.location.href = '../pages/events.html';
                    }, 1000);
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
