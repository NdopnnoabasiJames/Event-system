import { statesAndBranches } from './marketer/modules/states-branches.js';

document.addEventListener('DOMContentLoaded', () => {
    const registrationForm = document.getElementById('registrationForm');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const roleSelect = document.getElementById('role');
    const stateField = document.getElementById('stateField');
    const branchField = document.getElementById('branchField');
    const stateSelect = document.getElementById('state');
    const branchSelect = document.getElementById('branch');
    
    // Setup password toggles
    setupPasswordToggle('password', 'togglePassword');
    setupPasswordToggle('confirmPassword', 'toggleConfirmPassword');

    // Populate state dropdown
    populateStates();

    // Handle role selection changes
    roleSelect.addEventListener('change', (e) => {
        const selectedRole = e.target.value;
        handleRoleChange(selectedRole);
    });

    // Handle state selection changes for branch admin
    stateSelect.addEventListener('change', (e) => {
        const selectedState = e.target.value;
        if (selectedState && roleSelect.value === 'branch_admin') {
            populateBranches(selectedState);
        }
    });

    function populateStates() {
        stateSelect.innerHTML = '<option value="">Select a state</option>';
        Object.keys(statesAndBranches).forEach(state => {
            const option = document.createElement('option');
            option.value = state;
            option.textContent = state;
            stateSelect.appendChild(option);
        });
    }

    function populateBranches(selectedState) {
        branchSelect.innerHTML = '<option value="">Select a branch</option>';
        if (statesAndBranches[selectedState]) {
            statesAndBranches[selectedState].forEach(branch => {
                const option = document.createElement('option');
                option.value = branch;
                option.textContent = branch;
                branchSelect.appendChild(option);
            });
        }
    }

    function handleRoleChange(selectedRole) {
        // Hide all admin fields by default
        stateField.style.display = 'none';
        branchField.style.display = 'none';
        
        // Clear selections
        stateSelect.value = '';
        branchSelect.value = '';
        
        // Show appropriate fields based on role
        if (selectedRole === 'state_admin') {
            stateField.style.display = 'block';
            stateSelect.required = true;
            branchSelect.required = false;
        } else if (selectedRole === 'branch_admin') {
            stateField.style.display = 'block';
            branchField.style.display = 'block';
            stateSelect.required = true;
            branchSelect.required = true;
        } else {
            stateSelect.required = false;
            branchSelect.required = false;
        }
    }

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
                delete formData.confirmPassword;                  // Format the data for the API
                const userData = {
                    name: `${formData.firstName} ${formData.lastName}`,
                    email: formData.email,
                    password: formData.password,
                    role: formData.role, // Use selected role from dropdown
                    state: formData.state || undefined,
                    branch: formData.branch || undefined
                };
                  // Submit registration
                await auth.register(userData);
                
                // Show appropriate success message based on role
                if (userData.role === 'state_admin' || userData.role === 'branch_admin') {
                    showToast('success', 'Registration successful! Your account is pending approval from the administrator.');
                } else {
                    showToast('success', 'Registration successful! Please login.');
                }
                
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
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
