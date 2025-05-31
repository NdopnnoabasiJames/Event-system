// API Configuration
const API_BASE_URL = 'http://localhost:3031/api';

// Utility function to handle API calls
async function apiCall(endpoint, method = 'GET', data = null, token = null, treatNotFoundAsEmpty = false) {
    const headers = {
        'Content-Type': 'application/json'
    };
    
    // Always try to get token if not provided - ensures consistent auth for all requests
    if (!token) {
        token = auth.getToken();
    }
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        // Ensure we don't have double slashes in the URL
        const adjustedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const response = await fetch(`${API_BASE_URL}${adjustedEndpoint}`, {
            method,
            headers,
            body: data ? JSON.stringify(data) : null,
            credentials: 'include'
        });

        let responseData;
        try {
            responseData = await response.json();
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
            // Special handling for 404 when we should treat it as empty result
            if (response.status === 404 && treatNotFoundAsEmpty) {
                return [];
            }
            
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

// States API functions
const statesApi = {
    async getAllStates(includeInactive = false) {
        const endpoint = includeInactive ? '/states?includeInactive=true' : '/states';
        return await apiCall(endpoint, 'GET', null, auth.getToken());
    },

    async getState(id) {
        return await apiCall(`/states/${id}`, 'GET', null, auth.getToken());
    },

    async createState(stateData) {
        return await apiCall('/states', 'POST', stateData, auth.getToken());
    },

    async updateState(id, stateData) {
        return await apiCall(`/states/${id}`, 'PATCH', stateData, auth.getToken());
    },

    async deleteState(id) {
        return await apiCall(`/states/${id}`, 'DELETE', null, auth.getToken());
    },

    async deactivateState(id) {
        return await apiCall(`/states/${id}/deactivate`, 'PATCH', null, auth.getToken());
    },

    async activateState(id) {
        return await apiCall(`/states/${id}/activate`, 'PATCH', null, auth.getToken());
    }
};

// Branches API functions
const branchesApi = {
    async getAllBranches(includeInactive = false) {
        const endpoint = includeInactive ? '/branches?includeInactive=true' : '/branches';
        return await apiCall(endpoint, 'GET', null, auth.getToken());
    },

    async getBranchesByState(stateId, includeInactive = false) {
        const endpoint = includeInactive ? 
            `/branches/by-state/${stateId}?includeInactive=true` : 
            `/branches/by-state/${stateId}`;
        return await apiCall(endpoint, 'GET', null, auth.getToken());
    },

    async getBranch(id) {
        return await apiCall(`/branches/${id}`, 'GET', null, auth.getToken());
    },

    async createBranch(branchData) {
        return await apiCall('/branches', 'POST', branchData, auth.getToken());
    },

    async updateBranch(id, branchData) {
        return await apiCall(`/branches/${id}`, 'PATCH', branchData, auth.getToken());
    },

    async deleteBranch(id) {
        return await apiCall(`/branches/${id}`, 'DELETE', null, auth.getToken());
    },

    async deactivateBranch(id) {
        return await apiCall(`/branches/${id}/deactivate`, 'PATCH', null, auth.getToken());
    },

    async activateBranch(id) {
        return await apiCall(`/branches/${id}/activate`, 'PATCH', null, auth.getToken());
    }
};

// Pickup Stations API functions
const pickupStationsApi = {
    async getAllPickupStations(includeInactive = false) {
        const endpoint = includeInactive ? '/pickup-stations?includeInactive=true' : '/pickup-stations';
        return await apiCall(endpoint, 'GET', null, auth.getToken());
    },    async getPickupStationsByBranch(branchId, includeInactive = false) {
        const endpoint = includeInactive ? 
            `/pickup-stations/by-branch/${branchId}?includeInactive=true` : 
            `/pickup-stations/by-branch/${branchId}`;
        return await apiCall(endpoint, 'GET', null, auth.getToken(), true);
    },

    async getPickupStationsByState(stateId, includeInactive = false) {
        const endpoint = includeInactive ? 
            `/pickup-stations/by-state/${stateId}?includeInactive=true` : 
            `/pickup-stations/by-state/${stateId}`;
        return await apiCall(endpoint, 'GET', null, auth.getToken());
    },

    async getPickupStation(id) {
        return await apiCall(`/pickup-stations/${id}`, 'GET', null, auth.getToken());
    },

    async createPickupStation(pickupStationData) {
        return await apiCall('/pickup-stations', 'POST', pickupStationData, auth.getToken());
    },

    async updatePickupStation(id, pickupStationData) {
        return await apiCall(`/pickup-stations/${id}`, 'PATCH', pickupStationData, auth.getToken());
    },

    async deletePickupStation(id) {
        return await apiCall(`/pickup-stations/${id}`, 'DELETE', null, auth.getToken());
    },

    async deactivatePickupStation(id) {
        return await apiCall(`/pickup-stations/${id}/deactivate`, 'PATCH', null, auth.getToken());
    },

    async activatePickupStation(id) {
        return await apiCall(`/pickup-stations/${id}/activate`, 'PATCH', null, auth.getToken());
    }
};

// Migration API functions
const migrationApi = {
    async runMigration() {
        return await apiCall('/migration/run', 'POST', null, auth.getToken());
    },

    async getMigrationStatus() {
        return await apiCall('/migration/status', 'GET', null, auth.getToken());
    },

    async resetMigrationData() {
        return await apiCall('/migration/reset', 'DELETE', null, auth.getToken());
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

// Admin approval API functions
const adminApproval = {
    async getPendingAdmins() {
        const response = await fetch('/api/users/pending-admins', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to fetch pending admins');
        }

        return response.json();
    },

    async approveAdmin(adminId) {
        const response = await fetch(`/api/users/approve-admin/${adminId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to approve admin');
        }

        return response.json();
    },

    async rejectAdmin(adminId) {
        const response = await fetch(`/api/users/reject-admin/${adminId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to reject admin');
        }

        return response.json();
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

// Make API objects and functions globally available for modules
window.apiCall = apiCall;
window.eventsApi = eventsApi;
window.attendeesApi = attendeesApi;
window.statesApi = statesApi;
window.branchesApi = branchesApi;
window.pickupStationsApi = pickupStationsApi;
window.migrationApi = migrationApi;
window.marketersApi = marketersApi;
window.auth = auth;
window.showToast = showToast;
window.updateAuthState = updateAuthState;
window.getFormData = getFormData;
window.adminApproval = adminApproval;
