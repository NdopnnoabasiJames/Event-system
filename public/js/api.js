// API Configuration
const API_BASE_URL = 'http://localhost:3031';

// Utility function to handle API calls
async function apiCall(endpoint, method = 'GET', data = null, token = null) {
    const headers = {
        'Content-Type': 'application/json'
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method,
            headers,
            body: data ? JSON.stringify(data) : null,
            credentials: 'include'
        });

        let responseData;
        try {
            responseData = await response.json();
        } catch (e) {
            responseData = { message: 'Unable to parse server response' };
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
        console.error('API Error:', error);
        
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
        const response = await apiCall('/auth/login', 'POST', { email, password });
        if (response.access_token) {
            localStorage.setItem('token', response.access_token);
            localStorage.setItem('user', JSON.stringify(response.user));
            return response;
        }
    },

    async register(userData) {
        return await apiCall('/auth/register', 'POST', userData);
    },

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/index.html';
    },

    getToken() {
        return localStorage.getItem('token');
    },

    getUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },

    isAuthenticated() {
        return !!this.getToken();
    }
};

// Events API functions
const eventsApi = {
    async getAllEvents() {
        return await apiCall('/events');
    },

    async getEvent(id) {
        return await apiCall(`/events/${id}`);
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

    if (authButtons) {
        authButtons.innerHTML = isAuthenticated
            ? `<span class="navbar-text me-3">Welcome, ${user.firstName || 'User'}</span>
               <button onclick="auth.logout()" class="btn btn-outline-light">Logout</button>`
            : `<a href="pages/login.html" class="btn btn-outline-light me-2">Login</a>
               <a href="pages/register.html" class="btn btn-light">Register</a>`;
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
