// Password strength criteria
const passwordCriteria = {
    minLength: 8,
    hasUpperCase: /[A-Z]/,
    hasLowerCase: /[a-z]/,
    hasNumbers: /\d/,
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/
};

function checkPasswordStrength(password) {
    let strength = 0;
    let suggestions = [];

    // Basic length check (minimum requirement)
    if (!password || password.length < 6) {
        return {
            strength: 'weak',
            class: 'password-strength-weak',
            score: 0,
            feedback: 'Password must be at least 6 characters'
        };
    }

    // Additional strength checks (suggestions only)
    if (password.length >= 8) {
        strength += 1;
    } else {
        suggestions.push('8+ characters');
    }

    // Check uppercase
    if (passwordCriteria.hasUpperCase.test(password)) {
        strength += 1;
    } else {
        suggestions.push('uppercase letter');
    }

    // Check lowercase
    if (passwordCriteria.hasLowerCase.test(password)) {
        strength += 1;
    } else {
        suggestions.push('lowercase letter');
    }

    // Check numbers
    if (passwordCriteria.hasNumbers.test(password)) {
        strength += 1;
    } else {
        suggestions.push('number');
    }

    // Check special characters
    if (passwordCriteria.hasSpecialChar.test(password)) {
        strength += 1;
    } else {
        suggestions.push('special character');
    }

    // Map strength to categories
    let result = {
        strength: 'weak',
        class: 'password-strength-weak',
        score: strength,
        feedback: ''
    };

    if (strength >= 5) {
        result.strength = 'strong';
        result.class = 'password-strength-strong';
        result.feedback = 'Strong password! 💪';
    } else if (strength >= 4) {
        result.strength = 'good';
        result.class = 'password-strength-good';
        result.feedback = suggestions.length ? `Try adding: ${suggestions.join(', ')}` : '';
    } else if (strength >= 3) {
        result.strength = 'fair';
        result.class = 'password-strength-fair';
        result.feedback = suggestions.length ? `Try adding: ${suggestions.join(', ')}` : '';
    } else {
        result.feedback = suggestions.length ? `Try adding: ${suggestions.join(', ')}` : '';
    }

    return result;
}

// Password toggle functionality
function setupPasswordToggle(inputId, toggleId) {
    const input = document.getElementById(inputId);
    const toggle = document.getElementById(toggleId);

    if (toggle && input) {
        toggle.addEventListener('click', () => {
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            
            // Toggle icon
            const icon = toggle.querySelector('i');
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        });
    }
}

// Validate password match
function validatePasswordMatch(password, confirmPassword) {
    const confirmPasswordInput = document.getElementById('confirmPassword');
    if (!confirmPasswordInput) return false;

    const errorElement = document.getElementById('confirmPassword-error');
    const isMatch = password === confirmPassword;
    
    if (!isMatch) {
        confirmPasswordInput.classList.add('is-invalid');
        
        if (!errorElement) {
            const newErrorElement = document.createElement('div');
            newErrorElement.className = 'invalid-feedback';
            newErrorElement.id = 'confirmPassword-error';
            newErrorElement.textContent = 'Passwords do not match';
            confirmPasswordInput.parentNode.appendChild(newErrorElement);
        }
    } else {
        confirmPasswordInput.classList.remove('is-invalid');
        if (errorElement) {
            errorElement.remove();
        }
    }
    
    return isMatch;
}

// Update password strength indicator
function updatePasswordStrength(password) {
    const strengthIndicator = document.querySelector('.password-strength');
    const strengthText = document.querySelector('.password-strength-text');

    if (strengthIndicator && strengthText) {
        if (!password) {
            strengthIndicator.className = 'password-strength';
            strengthText.textContent = '';
            return;
        }

        const result = checkPasswordStrength(password);
        strengthIndicator.className = `password-strength ${result.class}`;
        strengthText.textContent = result.feedback;
        return result.score;
    }
}
