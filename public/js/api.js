// API Configuration
const API_BASE_URL = 'http://localhost:3031/api';

// Utility function to handle API calls
async function apiCall(endpoint, method = 'GET', data = null, token = null) {
    const headers = {
        'Content-Type': 'application/json'
    };
    
    // Always try to get token if not provided - ensures consistent auth for all requests
    if (!token) {
        token = auth.getToken();
    }
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }    try {
        // Ensure we don't have double slashes in the URL
        const adjustedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const response = await fetch(`${API_BASE_URL}${adjustedEndpoint}`, {
            method,
            headers,
            body: data ? JSON.stringify(data) : null,
            credentials: 'include'
        });

        let responseData;
        try {            responseData = await response.json();
            console.log('API Response:', { 
                status: response.status, 
                data: responseData,
                structure: JSON.stringify(responseData)
            });
        } catch (e) {
            console.error('Failed to parse response:', e);
            throw new Error('Unable to parse server response');
        }

        if (!response.ok) {
            const error = new Error(responseData.message || 'An error occurred');
            error.response = {
                status: response.status,
                data: responseData
            };
            throw error;
        }

        return responseData;
    } catch (error) {
        // console.error('API Error:', error);
        
        if (!window.navigator.onLine) {
            showToast('error', 'You are offline. Please check your internet connection.');
            throw error;
        }
        
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            showToast('error', 'Unable to connect to the server. Please check if the server is running at ' + API_BASE_URL);
        } else if (error.response?.status === 500) {
            showToast('error', 'Internal server error. Please try again later.');
        } else {
            const errorMessage = error.response?.data?.message || error.message || 'An error occurred';
            showToast('error', errorMessage);
        }
        throw error;
    }
}

// Auth functions
const auth = {    
    async login(email, password) {
        try {
            const response = await apiCall('/auth/login', 'POST', { email, password });
            console.log('Login response from server:', response);
            
            // Try multiple response formats to handle different structures
            let token, user;
            
            // Format 1: { data: { access_token, user } }
            if (response && response.data && response.data.access_token) {
                token = response.data.access_token;
                user = response.data.user;
                console.log("Found format 1 (nested data object):", user);
            } 
            // Format 2: { access_token, user }
            else if (response && response.access_token) {
                token = response.access_token;
                user = response.user;
                console.log("Found format 2 (direct properties):", user);
            }
            
            if (!token || !user) {
                console.error('Invalid response structure:', response);
                throw new Error('Invalid server response format');
            }
            
            // Make sure user has a role property
            if (!user.role) {
                console.warn('User object missing role, using default');
                user.role = 'user'; // Default role
            }
            
            console.log('Storing user with role:', user.role);
            
            // Store authentication data
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            
            return { access_token: token, user };
        } catch (error) {
            console.error('Login error:', error);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            throw error;
        }
    },

    async register(userData) {
        return await apiCall('/auth/register', 'POST', userData);
    },    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Determine correct path for redirection
        const isInPages = window.location.pathname.includes('/pages/');
        const redirectPath = isInPages ? '../index.html' : 'index.html';
        window.location.href = redirectPath;
    },

    getToken() {
        return localStorage.getItem('token');
    },    getUser() {
        try {
            const userJson = localStorage.getItem('user');
            if (!userJson) {
                console.warn('No user found in localStorage');
                return null;
            }
            
            const user = JSON.parse(userJson);
            console.log('Retrieved user from localStorage:', user);
            return user;
        } catch (error) {
            console.error('Error parsing user from localStorage:', error);
            // Clear corrupted data
            localStorage.removeItem('user');
            return null;
        }
    },

    isAuthenticated() {
        return !!this.getToken();
    }
};

// Events API functions
const eventsApi = {
    async getAllEvents() {
        return await apiCall('/events', 'GET', null, auth.getToken());
    },

    async getEvent(id) {
        return await apiCall(`/events/${id}`, 'GET', null, auth.getToken());
    },

    async createEvent(eventData) {
        return await apiCall('/events', 'POST', eventData, auth.getToken());
    },

    async updateEvent(id, eventData) {
        return await apiCall(`/events/${id}`, 'PATCH', eventData, auth.getToken());
    },

    async deleteEvent(id) {
        return await apiCall(`/events/${id}`, 'DELETE', null, auth.getToken());
    }
};

// Attendees API functions
const attendeesApi = {
    async getAllAttendees(eventId) {
        const endpoint = eventId ? `/attendees?eventId=${eventId}` : '/attendees';
        return await apiCall(endpoint, 'GET', null, auth.getToken());
    },

    async getAttendee(id) {
        return await apiCall(`/attendees/${id}`, 'GET', null, auth.getToken());
    },

    async createAttendee(eventId, attendeeData) {
        return await apiCall(`/attendees/${eventId}`, 'POST', attendeeData, auth.getToken());
    },

    async updateAttendee(id, attendeeData) {
        return await apiCall(`/attendees/${id}`, 'PATCH', attendeeData, auth.getToken());
    },

    async deleteAttendee(id) {
        return await apiCall(`/attendees/${id}`, 'DELETE', null, auth.getToken());
    },

    async getByBusPickup(eventId, location) {
        return await apiCall(`/attendees/bus-pickups/${location}?eventId=${eventId}`, 'GET', null, auth.getToken());
    }
};

// Marketers API functions
const marketersApi = {
    async getAvailableEvents() {
        return await apiCall('/marketers/events/available', 'GET', null, auth.getToken());
    },

    async getMyEvents() {
        return await apiCall('/marketers/events/my', 'GET', null, auth.getToken());
    },

    async volunteerForEvent(eventId) {
        return await apiCall(`/marketers/events/${eventId}/volunteer`, 'POST', null, auth.getToken());
    },

    async leaveEvent(eventId) {
        return await apiCall(`/marketers/events/${eventId}/leave`, 'DELETE', null, auth.getToken());
    },    async registerAttendee(eventId, attendeeData) {
        return await apiCall(`/marketers/events/${eventId}/attendees`, 'POST', attendeeData, auth.getToken());
    },

    async getMyAttendees(eventId = null) {
        const endpoint = eventId ? `/marketers/attendees?eventId=${eventId}` : '/marketers/attendees';
        return await apiCall(endpoint, 'GET', null, auth.getToken());
    },

    // Analytics endpoints
    async getPerformanceStats() {
        return await apiCall('/marketers/analytics/performance', 'GET', null, auth.getToken());
    },

    async getEventPerformance(eventId) {
        return await apiCall(`/marketers/analytics/event/${eventId}`, 'GET', null, auth.getToken());
    },

    async getTopMarketers() {
        return await apiCall('/marketers/analytics/top', 'GET', null, auth.getToken());
    }
};

// UI Utility functions
function showToast(type, message) {
    const toastContainer = document.getElementById('toast-container') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast show bg-${type === 'error' ? 'danger' : 'success'} text-white`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
        <div class="toast-body">
            ${message}
            <button type="button" class="btn-close btn-close-white ms-2" data-bs-dismiss="toast"></button>
        </div>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container position-fixed top-0 end-0 p-3';
    document.body.appendChild(container);
    return container;
}

// Form utility functions
function getFormData(form) {
    const formData = new FormData(form);
    const data = {};
    for (let [key, value] of formData.entries()) {
        data[key] = value;
    }
    return data;
}

// Auth state management
function updateAuthState() {
    const isAuthenticated = auth.isAuthenticated();
    const user = auth.getUser();
    const authButtons = document.querySelector('.auth-buttons');
    const protectedElements = document.querySelectorAll('[data-requires-auth]');

    if (authButtons) {        if (isAuthenticated) {
            let dashboardLink = '';
            // Check if we're in the root directory or pages directory
            const isInPages = window.location.pathname.includes('/pages/');
            const pathPrefix = isInPages ? '' : 'pages/';
            
            if (user.role === 'marketer') {
                dashboardLink = `<a href="${pathPrefix}marketer-dashboard.html" class="btn btn-outline-info me-2">Marketer Dashboard</a>`;
            } else if (user.role === 'admin') {
                dashboardLink = `<a href="${pathPrefix}admin-dashboard.html" class="btn btn-outline-warning me-2">Admin Dashboard</a>`;
            }
            
            authButtons.innerHTML = `
                <span class="navbar-text me-3">Welcome, ${user.name}</span>
                ${dashboardLink}
                <button onclick="auth.logout()" class="btn btn-outline-light">Logout</button>
            `;        } else {
            // Check if we're in the root directory or pages directory
            const isInPages = window.location.pathname.includes('/pages/');
            const pathPrefix = isInPages ? '' : 'pages/';
            
            authButtons.innerHTML = `
                <a href="${pathPrefix}login.html" class="btn btn-outline-light me-2">Login</a>
                <a href="${pathPrefix}register.html" class="btn btn-light">Register</a>
            `;
        }
    }

    protectedElements.forEach(element => {
        if (!isAuthenticated) {
            element.style.display = 'none';
        }
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    updateAuthState();
});
