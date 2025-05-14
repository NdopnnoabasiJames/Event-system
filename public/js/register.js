document.addEventListener('DOMContentLoaded', () => {
    const registrationForm = document.getElementById('registrationForm');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    
    // Setup password toggles
    setupPasswordToggle('password', 'togglePassword');
    setupPasswordToggle('confirmPassword', 'toggleConfirmPassword');

    // Setup password strength checker
    if (passwordInput) {
        passwordInput.addEventListener('input', (e) => {
            updatePasswordStrength(e.target.value);
            
            // Check password match if confirm password has value
            if (confirmPasswordInput?.value) {
                validatePasswordMatch(e.target.value, confirmPasswordInput.value);
            }
        });
    }

    // Setup confirm password validation
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', (e) => {
            validatePasswordMatch(passwordInput.value, e.target.value);
        });
    }
    
    if (registrationForm) {
        // Reset form errors on input
        registrationForm.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', () => {
                const errorElement = document.getElementById(`${input.id}-error`);
                if (errorElement) {
                    errorElement.remove();
                }
                input.classList.remove('is-invalid');

                // Special handling for password match validation
                if (input.id === 'password' || input.id === 'confirmPassword') {
                    if (passwordInput.value && confirmPasswordInput.value) {
                        validatePasswordMatch(passwordInput.value, confirmPasswordInput.value);
                    }
                }
            });
        });

        registrationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                const formData = getFormData(registrationForm);
                
                // Check if passwords match
                const passwordsMatch = validatePasswordMatch(formData.password, formData.confirmPassword);
                if (!passwordsMatch) {
                    return; // Stop form submission if passwords don't match
                }
                
                // Validate form
                const { isValid, errors } = ErrorHandler.validateForm(formData, ValidationRules.registration);
                
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
                  // Remove confirmPassword from data before sending to API
                delete formData.confirmPassword;
                  // Format the data for the API
                const userData = {
                    name: `${formData.firstName} ${formData.lastName}`,
                    email: formData.email,
                    password: formData.password,
                    role: 'marketer' // Always register as marketer
                };
                
                // Submit registration
                await auth.register(userData);
                showToast('success', 'Registration successful! Please login.');
                
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1000);
            } catch (error) {
                if (error.response?.status === 409) {
                    showToast('error', 'Email already exists. Please use a different email.');
                    const emailInput = document.getElementById('email');
                    emailInput.classList.add('is-invalid');
                    
                    const errorElement = document.createElement('div');
                    errorElement.className = 'invalid-feedback';
                    errorElement.id = 'email-error';
                    errorElement.textContent = 'Email already exists';
                    
                    emailInput.parentNode.appendChild(errorElement);
                } else {
                    showToast('error', error.message || 'Registration failed. Please try again.');
                }
            }
        });
    }
});
