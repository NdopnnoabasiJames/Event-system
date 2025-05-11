// Error Types
const ErrorTypes = {
    AUTH: 'AUTH_ERROR',
    VALIDATION: 'VALIDATION_ERROR',
    NETWORK: 'NETWORK_ERROR',
    SERVER: 'SERVER_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    FORBIDDEN: 'FORBIDDEN',
    CONFLICT: 'CONFLICT'
};

// Error Messages
const ErrorMessages = {
    [ErrorTypes.AUTH]: {
        INVALID_CREDENTIALS: 'Invalid email or password',
        TOKEN_EXPIRED: 'Your session has expired. Please login again',
        UNAUTHORIZED: 'You are not authorized to perform this action'
    },
    [ErrorTypes.VALIDATION]: {
        REQUIRED_FIELD: (field) => `${field} is required`,
        INVALID_EMAIL: 'Please enter a valid email address',
        PASSWORD_WEAK: 'Password must be at least 8 characters long and contain letters, numbers, and special characters',
        PASSWORDS_NOT_MATCH: 'Passwords do not match',
        INVALID_DATE: 'Please enter a valid date',
        PAST_DATE: 'Date cannot be in the past',
        CAPACITY_EXCEEDED: 'Event capacity has been exceeded'
    },
    [ErrorTypes.NETWORK]: {
        OFFLINE: 'You are offline. Please check your internet connection',
        TIMEOUT: 'Request timed out. Please try again'
    },
    [ErrorTypes.SERVER]: {
        DEFAULT: 'Something went wrong. Please try again later',
        MAINTENANCE: 'Server is under maintenance. Please try again later'
    }
};

// Error Handler Class
class ErrorHandler {
    static handle(error, context = '') {
        console.error(`[${context}]`, error);

        if (error.name === 'TypeError' && !navigator.onLine) {
            return this.handleError(ErrorTypes.NETWORK, 'OFFLINE');
        }

        if (error.response) {
            const status = error.response.status;
            switch (status) {
                case 400:
                    return this.handleValidationError(error.response.data);
                case 401:
                    this.handleAuthError();
                    return ErrorMessages[ErrorTypes.AUTH].UNAUTHORIZED;
                case 403:
                    return ErrorMessages[ErrorTypes.AUTH].UNAUTHORIZED;
                case 404:
                    return 'Resource not found';
                case 409:
                    return error.response.data.message || 'Conflict occurred';
                case 422:
                    return this.handleValidationError(error.response.data);
                case 429:
                    return 'Too many requests. Please try again later';
                case 500:
                    return ErrorMessages[ErrorTypes.SERVER].DEFAULT;
                default:
                    return 'An unexpected error occurred';
            }
        }

        return error.message || ErrorMessages[ErrorTypes.SERVER].DEFAULT;
    }

    static handleAuthError() {
        if (auth && typeof auth.logout === 'function') {
            showToast('error', ErrorMessages[ErrorTypes.AUTH].TOKEN_EXPIRED);
            auth.logout();
        }
    }

    static handleValidationError(data) {
        if (Array.isArray(data.message)) {
            return data.message[0];
        }
        return data.message || 'Validation failed';
    }

    static validateForm(formData, rules) {
        const errors = {};

        for (const [field, value] of Object.entries(formData)) {
            if (rules[field]) {
                const fieldRules = rules[field];

                // Required field validation
                if (fieldRules.required && !value) {
                    errors[field] = ErrorMessages[ErrorTypes.VALIDATION].REQUIRED_FIELD(field);
                    continue;
                }

                // Email validation
                if (fieldRules.email && value && !this.validateEmail(value)) {
                    errors[field] = ErrorMessages[ErrorTypes.VALIDATION].INVALID_EMAIL;
                    continue;
                }

                // Password validation
                if (fieldRules.password && value && !this.validatePassword(value)) {
                    errors[field] = ErrorMessages[ErrorTypes.VALIDATION].PASSWORD_WEAK;
                    continue;
                }

                // Date validation
                if (fieldRules.date) {
                    const dateError = this.validateDate(value, fieldRules.pastDates);
                    if (dateError) {
                        errors[field] = dateError;
                        continue;
                    }
                }

                // Custom validation
                if (fieldRules.custom && typeof fieldRules.custom === 'function') {
                    const customError = fieldRules.custom(value, formData);
                    if (customError) {
                        errors[field] = customError;
                    }
                }
            }
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }

    static validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    static validatePassword(password) {
        return /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/.test(password);
    }

    static validateDate(date, allowPastDates = false) {
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) {
            return ErrorMessages[ErrorTypes.VALIDATION].INVALID_DATE;
        }

        if (!allowPastDates && dateObj < new Date()) {
            return ErrorMessages[ErrorTypes.VALIDATION].PAST_DATE;
        }

        return null;
    }
}

// Export the ErrorHandler class to make it globally available
window.ErrorHandler = ErrorHandler;

// Form Validation Rules
window.ValidationRules = {
    login: {
        email: { required: true, email: true },
        password: { required: true }
    },
    registration: {
        firstName: { required: true },
        lastName: { required: true },
        email: { required: true, email: true },        password: { 
            required: true,
            custom: (value) => value.length < 6 ? 'Password must be at least 6 characters' : null
        },
        confirmPassword: {
            required: true,
            custom: (value, formData) => value !== formData.password ? 
                ErrorMessages[ErrorTypes.VALIDATION].PASSWORDS_NOT_MATCH : null
        }
    },
    event: {
        name: { required: true },
        description: { required: true },
        date: { required: true, date: true, pastDates: false },
        location: { required: true },
        capacity: {
            required: true,
            custom: (value) => value < 1 ? 'Capacity must be greater than 0' : null
        }
    },
    attendee: {
        firstName: { required: true },
        lastName: { required: true },
        email: { required: true, email: true },
        transport: { required: true },
        pickupLocation: {
            custom: (value, formData) => formData.transport === 'bus' && !value ? 
                'Pickup location is required for bus transport' : null
        }
    }
};
