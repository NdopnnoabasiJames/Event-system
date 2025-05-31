// Hierarchical Event Creation Module
// Handles UI and logic for creating events based on admin hierarchy

import { adminHierarchyAPI } from './admin-hierarchy-api.js';

class HierarchicalEventCreator {
    constructor() {
        this.currentAdmin = null;
        this.accessibleStates = [];
        this.accessibleBranches = [];
    }

    async initialize(adminProfile) {
        this.currentAdmin = adminProfile;
        await this.loadAccessibleData();
        this.setupEventCreationModal();
    }

    async loadAccessibleData() {
        try {
            // Load accessible states
            this.accessibleStates = await adminHierarchyAPI.getAccessibleStates();
            
            // Load accessible branches
            this.accessibleBranches = await adminHierarchyAPI.getAccessibleBranches();
        } catch (error) {
            console.error('Error loading accessible data:', error);
            showToast('error', 'Failed to load accessible locations');
        }
    }

    setupEventCreationModal() {
        // Update the event creation modal based on admin role
        const eventModal = document.getElementById('eventModal');
        if (!eventModal) return;

        // Clear existing content
        const modalBody = eventModal.querySelector('.modal-body');
        if (!modalBody) return;

        // Generate form based on admin role
        modalBody.innerHTML = this.generateEventCreationForm();
        
        // Setup form handlers
        this.setupFormHandlers();
    }

    generateEventCreationForm() {
        const role = this.currentAdmin.role;
        
        let formHTML = `
            <form id="hierarchicalEventForm">
                <div class="mb-3">
                    <label for="eventName" class="form-label">Event Name</label>
                    <input type="text" class="form-control" id="eventName" required>
                </div>
                
                <div class="mb-3">
                    <label for="eventDescription" class="form-label">Event Description</label>
                    <textarea class="form-control" id="eventDescription" rows="3"></textarea>
                </div>
                
                <div class="mb-3">
                    <label for="eventDate" class="form-label">Event Date</label>
                    <input type="datetime-local" class="form-control" id="eventDate" required>
                </div>
                
                <div class="mb-3">
                    <label for="eventBanner" class="form-label">Event Banner</label>
                    <input type="file" class="form-control" id="eventBanner" accept="image/*">
                    <div class="form-text">Upload an image for the event banner</div>
                </div>
        `;

        // Add role-specific fields
        if (role === 'super_admin') {
            formHTML += this.generateSuperAdminFields();
        } else if (role === 'state_admin') {
            formHTML += this.generateStateAdminFields();
        } else if (role === 'branch_admin') {
            formHTML += this.generateBranchAdminFields();
        }

        formHTML += `
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="submit" class="btn btn-primary">Create Event</button>
                </div>
            </form>
        `;

        return formHTML;
    }

    generateSuperAdminFields() {
        return `
            <div class="mb-3">
                <label class="form-label">Select States</label>
                <div class="border rounded p-3" style="max-height: 200px; overflow-y: auto;">
                    ${this.accessibleStates.map(state => `
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" value="${state._id}" id="state_${state._id}">
                            <label class="form-check-label" for="state_${state._id}">
                                ${state.name}
                            </label>
                        </div>
                    `).join('')}
                </div>
                <div class="form-text">Select states where this event will be available</div>
            </div>
        `;
    }

    generateStateAdminFields() {
        // Filter branches for current state
        const stateBranches = this.accessibleBranches.filter(branch => 
            branch.stateId._id === this.currentAdmin.state._id
        );

        return `
            <div class="mb-3">
                <label class="form-label">Select Branches</label>
                <div class="border rounded p-3" style="max-height: 200px; overflow-y: auto;">
                    ${stateBranches.map(branch => `
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" value="${branch._id}" id="branch_${branch._id}">
                            <label class="form-check-label" for="branch_${branch._id}">
                                ${branch.name} - ${branch.location}
                            </label>
                        </div>
                    `).join('')}
                </div>
                <div class="form-text">Select branches in your state for this event</div>
            </div>
        `;
    }

    generateBranchAdminFields() {
        const branchInfo = this.accessibleBranches.find(branch => 
            branch._id === this.currentAdmin.branch._id
        );

        return `
            <div class="mb-3">
                <div class="alert alert-info">
                    <strong>Branch Event</strong><br>
                    This event will be created for: <strong>${branchInfo?.name || 'Your Branch'}</strong>
                </div>
            </div>
        `;
    }

    setupFormHandlers() {
        const form = document.getElementById('hierarchicalEventForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleEventCreation(e);
        });

        // Setup dynamic branch loading for super admin
        if (this.currentAdmin.role === 'super_admin') {
            this.setupStateChangeHandler();
        }
    }

    setupStateChangeHandler() {
        const stateCheckboxes = document.querySelectorAll('input[type="checkbox"][id^="state_"]');
        stateCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                // Could add dynamic branch loading here if needed
                console.log('State selection changed');
            });
        });
    }

    async handleEventCreation(event) {
        try {
            const formData = new FormData(event.target);
            const eventData = this.collectEventData(formData);

            let createdEvent;
            
            switch (this.currentAdmin.role) {
                case 'super_admin':
                    createdEvent = await adminHierarchyAPI.createSuperAdminEvent(eventData);
                    break;
                case 'state_admin':
                    createdEvent = await adminHierarchyAPI.createStateAdminEvent(eventData);
                    break;
                case 'branch_admin':
                    createdEvent = await adminHierarchyAPI.createBranchAdminEvent(eventData);
                    break;
                default:
                    throw new Error('Invalid admin role');
            }

            showToast('success', 'Event created successfully!');
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('eventModal'));
            modal.hide();
            
            // Refresh events list
            if (window.loadEvents) {
                await window.loadEvents();
            }

        } catch (error) {
            console.error('Error creating event:', error);
            showToast('error', error.message || 'Failed to create event');
        }
    }

    collectEventData(formData) {
        const eventData = {
            name: document.getElementById('eventName').value,
            description: document.getElementById('eventDescription').value,
            date: document.getElementById('eventDate').value,
            bannerImage: '' // Will be handled separately for file upload
        };

        // Add role-specific data
        if (this.currentAdmin.role === 'super_admin') {
            const selectedStates = [];
            document.querySelectorAll('input[type="checkbox"][id^="state_"]:checked').forEach(checkbox => {
                selectedStates.push(checkbox.value);
            });
            eventData.selectedStates = selectedStates;
        } else if (this.currentAdmin.role === 'state_admin') {
            const selectedBranches = [];
            document.querySelectorAll('input[type="checkbox"][id^="branch_"]:checked').forEach(checkbox => {
                selectedBranches.push(checkbox.value);
            });
            eventData.selectedBranches = selectedBranches;
        }

        return eventData;
    }
}

// Branch Selection Manager for State Admins
class BranchSelectionManager {
    constructor() {
        this.eventsNeedingSelection = [];
    }

    async initialize() {
        await this.loadEventsNeedingSelection();
        this.setupBranchSelectionUI();
    }

    async loadEventsNeedingSelection() {
        try {
            this.eventsNeedingSelection = await adminHierarchyAPI.getEventsNeedingBranchSelection();
        } catch (error) {
            console.error('Error loading events needing branch selection:', error);
        }
    }

    setupBranchSelectionUI() {
        // Add a section for events needing branch selection
        const container = document.querySelector('.main-content');
        if (!container || this.eventsNeedingSelection.length === 0) return;

        const branchSelectionSection = this.createBranchSelectionSection();
        container.insertBefore(branchSelectionSection, container.firstChild);
    }

    createBranchSelectionSection() {
        const section = document.createElement('div');
        section.className = 'card mb-4';
        section.innerHTML = `
            <div class="card-header">
                <h5 class="mb-0">
                    <i class="fas fa-tasks me-2"></i>
                    Events Awaiting Branch Selection
                </h5>
            </div>
            <div class="card-body">
                ${this.eventsNeedingSelection.map(event => this.createEventSelectionCard(event)).join('')}
            </div>
        `;
        return section;
    }

    createEventSelectionCard(event) {
        return `
            <div class="card mb-3" data-event-id="${event._id}">
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-8">
                            <h6 class="card-title">${event.name}</h6>
                            <p class="card-text text-muted">${event.description || 'No description'}</p>
                            <small class="text-muted">Date: ${new Date(event.date).toLocaleString()}</small>
                        </div>
                        <div class="col-md-4 text-end">
                            <button class="btn btn-primary btn-sm" onclick="window.branchSelector.openBranchSelectionModal('${event._id}')">
                                Select Branches
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async openBranchSelectionModal(eventId) {
        // Implementation for branch selection modal
        console.log('Opening branch selection for event:', eventId);
        // This would open a modal with checkboxes for available branches
    }
}

// Export classes
export { HierarchicalEventCreator, BranchSelectionManager };
