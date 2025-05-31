// Admin Hierarchy API Module
// Handles all API calls for hierarchical admin operations

class AdminHierarchyAPI {
    constructor() {
        this.baseURL = 'http://localhost:3031/api/admin-hierarchy';
    }

    async getProfile() {
        try {
            const response = await fetch(`${this.baseURL}/profile`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching admin profile:', error);
            throw error;
        }
    }

    async getAccessibleStates() {
        try {
            const response = await fetch(`${this.baseURL}/accessible-states`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching accessible states:', error);
            throw error;
        }
    }

    async getAccessibleBranches(stateId = null) {
        try {
            const url = stateId ? 
                `${this.baseURL}/accessible-branches/${stateId}` : 
                `${this.baseURL}/accessible-branches`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching accessible branches:', error);
            throw error;
        }
    }

    async getEventsForAdmin() {
        try {
            const response = await fetch(`${this.baseURL}/events`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching admin events:', error);
            throw error;
        }
    }

    async createSuperAdminEvent(eventData) {
        try {
            const response = await fetch(`${this.baseURL}/events/super-admin`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(eventData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error creating super admin event:', error);
            throw error;
        }
    }

    async createStateAdminEvent(eventData) {
        try {
            const response = await fetch(`${this.baseURL}/events/state-admin`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(eventData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error creating state admin event:', error);
            throw error;
        }
    }

    async createBranchAdminEvent(eventData) {
        try {
            const response = await fetch(`${this.baseURL}/events/branch-admin`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(eventData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error creating branch admin event:', error);
            throw error;
        }
    }

    async getEventsNeedingBranchSelection() {
        try {
            const response = await fetch(`${this.baseURL}/events/needing-branch-selection`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching events needing branch selection:', error);
            throw error;
        }
    }

    async selectBranchesForEvent(eventId, selectedBranches) {
        try {
            const response = await fetch(`${this.baseURL}/events/${eventId}/select-branches`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ selectedBranches })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error selecting branches for event:', error);
            throw error;
        }
    }
}

// Export the API instance
const adminHierarchyAPI = new AdminHierarchyAPI();
export { adminHierarchyAPI };
