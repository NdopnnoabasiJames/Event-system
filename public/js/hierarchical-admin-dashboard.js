// Hierarchical Admin Dashboard JavaScript
// Complete implementation for role-based hierarchical event management

// Import modules
import { loadTopMarketers, showMarketerDetails, setupMarketerFilter } from './modules/marketer-manager.js';
import { setupEventCreationHandlers, formatEventData } from './modules/events-manager.js';
import { adminHierarchyAPI } from './modules/admin-hierarchy-api.js';
import { HierarchicalEventCreator, BranchSelectionManager } from './modules/hierarchical-event-creator.js';

// Global variables
let currentAdmin = null;
let allEvents = [];
let allAttendees = [];
let hierarchicalEventCreator = null;
let branchSelectionManager = null;

// Derived variables based on currentAdmin
let currentUserRole = null;
let currentUserState = null;
let currentUserBranch = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is authenticated
    if (!window.auth.isAuthenticated()) {
        window.showToast('error', 'Please login to access the admin dashboard');
        window.location.href = 'login.html';
        return;
    }

    // Check if user is a hierarchical admin
    const user = window.auth.getUser();
    if (!['super_admin', 'state_admin', 'branch_admin'].includes(user.role)) {
        window.showToast('error', 'Only hierarchical administrators can access this page');
        
        // Redirect to appropriate dashboard based on role
        if (user.role === 'admin') {
            window.location.href = 'admin-dashboard.html';
        } else if (user.role === 'marketer') {
            window.location.href = 'marketer-dashboard.html';
        } else {
            window.location.href = '../index.html';
        }
        return;
    }

    try {
        // Load admin profile from new API
        currentAdmin = await adminHierarchyAPI.getProfile();

        // Set derived variables
        currentUserRole = currentAdmin.role;
        currentUserState = currentAdmin.state?._id || currentAdmin.state;
        currentUserBranch = currentAdmin.branch?._id || currentAdmin.branch;

        // Update auth state
        window.updateAuthState();

        // Initialize hierarchical event creator
        hierarchicalEventCreator = new HierarchicalEventCreator();
        await hierarchicalEventCreator.initialize(currentAdmin);

        // Initialize branch selection manager for state admins
        if (currentAdmin.role === 'state_admin') {
            branchSelectionManager = new BranchSelectionManager();
            await branchSelectionManager.initialize();
            // Make it globally accessible for button clicks
            window.branchSelector = branchSelectionManager;
        }

        // Initialize role-based UI
        await initializeRoleBasedUI();

        // Load initial data using new API
        await loadInitialData();

        // Setup event handlers
        setupEventHandlers();

    } catch (error) {
        console.error('Error initializing dashboard:', error);
        window.showToast('error', 'Failed to initialize dashboard');
    }
});

/**
 * Initialize role-based UI elements
 */
async function initializeRoleBasedUI() {
    // Update admin info section
    updateAdminInfoSection();

    // Show/hide role-specific tabs and content
    setupRoleBasedVisibility();

    // Update navigation based on role
    updateRoleBasedNavigation();
}

/**
 * Update admin info section with role and territory information
 */
function updateAdminInfoSection() {
    // Update admin name
    const adminNameElement = document.getElementById('admin-name');
    if (adminNameElement) {
        adminNameElement.textContent = currentAdmin.name || 'Admin User';
    }

    // Update role badge
    const roleBadgeElement = document.getElementById('admin-role');
    if (roleBadgeElement) {
        const roleDisplayNames = {
            'super_admin': 'Super Admin',
            'state_admin': 'State Admin', 
            'branch_admin': 'Branch Admin'
        };
        roleBadgeElement.textContent = roleDisplayNames[currentAdmin.role] || currentAdmin.role;
    }

    // Update territory information
    const territoryElement = document.getElementById('admin-territory');
    if (territoryElement) {
        let territoryText = 'All Territories';
        
        if (currentAdmin.role === 'state_admin' && currentAdmin.state) {
            territoryText = `State: ${currentAdmin.state.name}`;
        } else if (currentAdmin.role === 'branch_admin' && currentAdmin.branch) {
            territoryText = `Branch: ${currentAdmin.branch.name}`;
        }
        
        territoryElement.textContent = territoryText;
    }

    // Update description
    const descriptionElement = document.getElementById('admin-description');
    if (descriptionElement) {
        const descriptions = {
            'super_admin': 'Managing all events and territories nationwide',
            'state_admin': `Managing events and branches in ${currentAdmin.state?.name || 'your state'}`,
            'branch_admin': `Managing zones and pickup stations in ${currentAdmin.branch?.name || 'your branch'}`
        };
        descriptionElement.textContent = descriptions[currentAdmin.role] || 'Managing your events and territories';
    }

    // Update territory info
    const territoryInfoElement = document.getElementById('territory-info');
    const adminStateElement = document.getElementById('admin-state');
    const adminBranchElement = document.getElementById('admin-branch');
    const branchInfoContainer = document.getElementById('branch-info-container');

    if (currentAdmin.role !== 'super_admin' && territoryInfoElement) {
        territoryInfoElement.style.display = 'block';
        
        if (adminStateElement) {
            adminStateElement.textContent = currentAdmin.state?.name || currentAdmin.state || '-';
        }

        if (currentAdmin.role === 'branch_admin' && branchInfoContainer) {
            branchInfoContainer.style.display = 'block';
            if (adminBranchElement) {
                adminBranchElement.textContent = currentAdmin.branch?.name || currentAdmin.branch || '-';
            }
        }
    }
}

/**
 * Setup role-based visibility for tabs and content
 */
function setupRoleBasedVisibility() {
    // Show/hide Super Admin only content
    const superAdminElements = document.querySelectorAll('.super-admin-only');
    superAdminElements.forEach(element => {
        if (currentUserRole === 'super_admin') {
            element.style.display = 'block';
            element.classList.remove('d-none');
        } else {
            element.style.display = 'none';
            element.classList.add('d-none');
        }
    });

    // Show/hide State Admin only content
    const stateAdminElements = document.querySelectorAll('.state-admin-only');
    stateAdminElements.forEach(element => {
        if (currentUserRole === 'state_admin') {
            element.style.display = 'block';
            element.classList.remove('d-none');
        } else {
            element.style.display = 'none';
            element.classList.add('d-none');
        }
    });

    // Show/hide Branch Admin only content
    const branchAdminElements = document.querySelectorAll('.branch-admin-only');
    branchAdminElements.forEach(element => {
        if (currentUserRole === 'branch_admin') {
            element.style.display = 'block';
            element.classList.remove('d-none');
        } else {
            element.style.display = 'none';
            element.classList.add('d-none');
        }
    });
}

/**
 * Update navigation based on user role
 */
function updateRoleBasedNavigation() {
    // Update tab visibility based on role
    const allEventsTab = document.querySelector('a[href="#all-events"]');
    const adminApprovalsTab = document.querySelector('a[href="#admin-approvals"]');
    const branchSelectionTab = document.querySelector('a[href="#branch-selection"]');
    const pickupStationsTab = document.querySelector('a[href="#pickup-stations"]');

    // Super Admin sees: My Events, All Events, Admin Approvals, Attendees
    // State Admin sees: My Events, Branch Selection, Attendees  
    // Branch Admin sees: My Events, Pickup Stations, Attendees

    if (allEventsTab) {
        allEventsTab.closest('li').style.display = currentUserRole === 'super_admin' ? 'block' : 'none';
    }

    if (adminApprovalsTab) {
        adminApprovalsTab.closest('li').style.display = currentUserRole === 'super_admin' ? 'block' : 'none';
    }

    if (branchSelectionTab) {
        branchSelectionTab.closest('li').style.display = currentUserRole === 'state_admin' ? 'block' : 'none';
    }

    if (pickupStationsTab) {
        pickupStationsTab.closest('li').style.display = currentUserRole === 'branch_admin' ? 'block' : 'none';
    }
}

/**
 * Load initial data based on user role
 */
async function loadInitialData() {
    try {
        // Load role-specific events using new API
        await loadEvents();

        // Load attendees
        await loadAttendeesData();

        // Load role-specific additional data
        if (currentAdmin.role === 'super_admin') {
            await loadPendingAdmins();
        } else if (currentAdmin.role === 'branch_admin') {
            await loadPickupStations();
        }

    } catch (error) {
        console.error('Error loading initial data:', error);
        window.showToast('error', 'Failed to load dashboard data');
    }
}

/**
 * Load events specific to current admin's role and permissions using new API
 */
async function loadEvents() {
    try {
        const response = await adminHierarchyAPI.getEventsForAdmin();
        
        // Ensure we have an array - handle both direct array and wrapped responses
        const events = Array.isArray(response) ? response : (response.data || []);
        console.log('Loaded events:', events);
        
        allEvents = events; // Store for filtering
        displayMyEvents(events);
        
        // Make loadEvents globally accessible for refresh
        window.loadEvents = loadEvents;
        
    } catch (error) {
        console.error('Error loading events:', error);
        const tableBody = document.getElementById('my-events-table-body');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Failed to load events</td></tr>';
        }
    }
}

/**
 * Display user's events in My Events tab
 */
function displayMyEvents(events) {
    const tableBody = document.getElementById('my-events-table-body');
    const noEventsDiv = document.getElementById('no-my-events');
    
    if (!tableBody) return;

    // Ensure events is an array
    if (!events || !Array.isArray(events)) {
        console.error('displayMyEvents: events is not an array:', events);
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Error: Invalid events data</td></tr>';
        if (noEventsDiv) {
            noEventsDiv.classList.remove('d-none');
        }
        return;
    }

    if (events.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center">No events found</td></tr>';
        if (noEventsDiv) {
            noEventsDiv.classList.remove('d-none');
        }
        return;
    }

    if (noEventsDiv) {
        noEventsDiv.classList.add('d-none');
    }

    tableBody.innerHTML = '';

    events.forEach(event => {
        const row = document.createElement('tr');
        
        // Format date
        const eventDate = new Date(event.date);
        const formattedDate = eventDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        // Get creator level badge
        const creatorLevelBadge = getCreatorLevelBadge(event.creatorLevel);
        
        // Get status badge
        const statusBadge = getEventStatusBadge(event);
          // Format states and branches using new structure
        const statesDisplay = event.availableStates?.length > 0 ? 
            event.availableStates.map(state => state.name).join(', ') : 'None';
        const branchesDisplay = event.availableBranches?.length > 0 ? 
            event.availableBranches.map(branch => branch.name).join(', ') : 'None';

        // Count attendees (if available)
        const attendeeCount = event.attendeeCount || 0;

        row.innerHTML = `
            <td>
                <div class="fw-bold">${event.name}</div>
                <small class="text-muted">${event.description || 'No description'}</small>
            </td>
            <td>${formattedDate}</td>
            <td>${creatorLevelBadge}</td>
            <td>${statusBadge}</td>
            <td>${statesDisplay}</td>
            <td>${branchesDisplay}</td>
            <td>${attendeeCount}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="viewEventDetails('${event._id}')">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-outline-info" onclick="viewEventAttendees('${event._id}')">
                        <i class="bi bi-people"></i>
                    </button>
                    ${currentUserRole === 'super_admin' ? `
                        <button class="btn btn-outline-danger" onclick="deleteEvent('${event._id}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        `;

        tableBody.appendChild(row);
    });
}

/**
 * Load all events for Super Admin
 */
async function loadAllEvents() {
    if (currentUserRole !== 'super_admin') return;

    try {
        const response = await window.apiCall('/events/dashboard/super-admin', 'GET', null, window.auth.getToken());
        const events = Array.isArray(response) ? response : (response.data || []);
        
        displayAllEvents(events);
        
    } catch (error) {
        console.error('Error loading all events:', error);
        const tableBody = document.getElementById('all-events-table-body');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="9" class="text-center text-danger">Failed to load events</td></tr>';
        }
    }
}

/**
 * Display all events for Super Admin
 */
function displayAllEvents(events) {
    const tableBody = document.getElementById('all-events-table-body');
    if (!tableBody) return;

    if (!events || events.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="9" class="text-center">No events found</td></tr>';
        return;
    }

    tableBody.innerHTML = '';

    events.forEach(event => {
        const row = document.createElement('tr');
        
        const eventDate = new Date(event.date);
        const formattedDate = eventDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        const creatorName = event.createdBy?.name || 'Unknown';
        const creatorLevelBadge = getCreatorLevelBadge(event.creatorLevel);
        const statusBadge = getEventStatusBadge(event);

        const statesDisplay = event.selectedStates?.length > 0 ? 
            event.selectedStates.length : '0';
        const branchesDisplay = event.selectedBranches?.length > 0 ? 
            event.selectedBranches.length : '0';

        const attendeeCount = event.attendeeCount || 0;

        row.innerHTML = `
            <td>
                <div class="fw-bold">${event.name}</div>
                <small class="text-muted">${event.description || 'No description'}</small>
            </td>
            <td>${formattedDate}</td>
            <td>${creatorName}</td>
            <td>${creatorLevelBadge}</td>
            <td>${statusBadge}</td>
            <td>${statesDisplay}</td>
            <td>${branchesDisplay}</td>
            <td>${attendeeCount}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="viewEventDetails('${event._id}')">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-outline-info" onclick="viewEventAttendees('${event._id}')">
                        <i class="bi bi-people"></i>
                    </button>
                    <button class="btn btn-outline-danger" onclick="deleteEvent('${event._id}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        `;

        tableBody.appendChild(row);
    });
}

/**
 * Load events for branch selection (State Admin)
 */
async function loadBranchSelectionEvents() {
    if (currentUserRole !== 'state_admin') return;

    try {
        // Load Super Admin created events that include this state
        const response = await window.apiCall('/events', 'GET', null, window.auth.getToken());
        const allEvents = Array.isArray(response) ? response : (response.data || []);
        
        // Filter for Super Admin events that include this state but don't have branches selected yet
        const branchSelectionEvents = allEvents.filter(event => 
            event.creatorLevel === 'super_admin' && 
            event.selectedStates?.includes(currentUserState) &&
            (!event.selectedBranches || event.selectedBranches.length === 0)
        );
        
        displayBranchSelectionEvents(branchSelectionEvents);
        
    } catch (error) {
        console.error('Error loading branch selection events:', error);
        const tableBody = document.getElementById('branch-selection-table-body');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Failed to load events</td></tr>';
        }
    }
}

/**
 * Display events for branch selection
 */
function displayBranchSelectionEvents(events) {
    const tableBody = document.getElementById('branch-selection-table-body');
    if (!tableBody) return;

    if (!events || events.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No events pending branch selection</td></tr>';
        return;
    }

    tableBody.innerHTML = '';

    events.forEach(event => {
        const row = document.createElement('tr');
        
        const eventDate = new Date(event.date);
        const formattedDate = eventDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        const creatorName = event.createdBy?.name || 'Super Admin';
        const statusBadge = getEventStatusBadge(event);

        row.innerHTML = `
            <td>
                <div class="fw-bold">${event.name}</div>
                <small class="text-muted">${event.description || 'No description'}</small>
            </td>
            <td>${formattedDate}</td>
            <td>${creatorName}</td>
            <td>${statusBadge}</td>
            <td>
                <span class="badge bg-warning">Pending Branch Selection</span>
            </td>
            <td>
                <button class="btn btn-primary btn-sm" onclick="openBranchSelectionModal('${event._id}', '${event.name}')">
                    <i class="bi bi-building"></i> Select Branches
                </button>
            </td>
        `;

        tableBody.appendChild(row);
    });
}

/**
 * Open branch selection modal
 */
async function openBranchSelectionModal(eventId, eventName) {
    const modal = new bootstrap.Modal(document.getElementById('branchSelectionModal'));
    
    // Update modal title
    const eventNameElement = document.getElementById('branch-selection-event-name');
    if (eventNameElement) {
        eventNameElement.textContent = eventName;
    }

    try {
        // Load branches for current state
        const response = await window.apiCall(`/branches/by-state/${currentUserState}`, 'GET', null, window.auth.getToken());
        const branches = Array.isArray(response) ? response : (response.data || []);

        const container = document.getElementById('branch-checkboxes-container');
        if (!container) return;

        container.innerHTML = '';

        if (branches.length === 0) {
            container.innerHTML = '<p class="text-muted">No branches found in your state.</p>';
        } else {
            branches.forEach(branch => {
                const checkboxDiv = document.createElement('div');
                checkboxDiv.className = 'form-check mb-2';
                checkboxDiv.innerHTML = `
                    <input class="form-check-input" type="checkbox" value="${branch._id}" id="branch-${branch._id}">
                    <label class="form-check-label" for="branch-${branch._id}">
                        ${branch.name}
                    </label>
                `;
                container.appendChild(checkboxDiv);
            });
        }

        // Store event ID for confirmation
        document.getElementById('confirm-branch-selection-btn').setAttribute('data-event-id', eventId);

        modal.show();
        
    } catch (error) {
        console.error('Error loading branches:', error);
        window.showToast('error', 'Failed to load branches');
    }
}

/**
 * Confirm branch selection
 */
async function confirmBranchSelection() {
    const eventId = document.getElementById('confirm-branch-selection-btn').getAttribute('data-event-id');
    const selectedBranches = [];
    
    document.querySelectorAll('#branch-checkboxes-container input[type="checkbox"]:checked').forEach(checkbox => {
        selectedBranches.push(checkbox.value);
    });

    if (selectedBranches.length === 0) {
        window.showToast('error', 'Please select at least one branch');
        return;
    }

    try {
        await window.apiCall(`/events/${eventId}/select-branches`, 'POST', {
            selectedBranches: selectedBranches
        }, window.auth.getToken());

        window.showToast('success', 'Branches selected successfully');
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('branchSelectionModal'));
        modal.hide();

        // Reload branch selection events
        await loadBranchSelectionEvents();
        
    } catch (error) {
        console.error('Error selecting branches:', error);
        window.showToast('error', 'Failed to select branches: ' + (error.message || 'Unknown error'));
    }
}

/**
 * Load pickup stations for Branch Admin
 */
async function loadPickupStations() {
    if (currentUserRole !== 'branch_admin') return;

    try {
        const response = await window.apiCall(`/pickup-stations/by-branch/${currentUserBranch}`, 'GET', null, window.auth.getToken());
        const stations = Array.isArray(response) ? response : (response.data || []);
        
        displayPickupStations(stations);
        
    } catch (error) {
        console.error('Error loading pickup stations:', error);
        const tableBody = document.getElementById('pickup-stations-table-body');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Failed to load pickup stations</td></tr>';
        }
    }
}

/**
 * Display pickup stations
 */
function displayPickupStations(stations) {
    const tableBody = document.getElementById('pickup-stations-table-body');
    if (!tableBody) return;

    if (!stations || stations.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No pickup stations found</td></tr>';
        return;
    }

    tableBody.innerHTML = '';

    stations.forEach(station => {
        const row = document.createElement('tr');
        
        const createdDate = new Date(station.createdAt);
        const formattedDate = createdDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        const statusBadge = station.isActive ? 
            '<span class="badge bg-success">Active</span>' : 
            '<span class="badge bg-secondary">Inactive</span>';

        row.innerHTML = `
            <td>${station.location || station.name}</td>
            <td>${station.zone || 'Unassigned'}</td>
            <td>${statusBadge}</td>
            <td>${formattedDate}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="editPickupStation('${station._id}')">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-danger" onclick="deletePickupStation('${station._id}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        `;

        tableBody.appendChild(row);
    });
}

/**
 * Load attendees data
 */
async function loadAttendeesData() {
    try {
        const response = await window.apiCall('/attendees', 'GET', null, window.auth.getToken());
        const attendees = Array.isArray(response) ? response : (response.data || []);
        
        allAttendees = attendees;
        displayAttendees(attendees);
        populateAttendeeEventFilter(attendees);
        
    } catch (error) {
        console.error('Error loading attendees:', error);
        const tableBody = document.getElementById('attendees-table-body');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Failed to load attendees</td></tr>';
        }
    }
}

/**
 * Display attendees
 */
function displayAttendees(attendees) {
    const tableBody = document.getElementById('attendees-table-body');
    if (!tableBody) return;

    if (!attendees || attendees.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center">No attendees found</td></tr>';
        return;
    }

    tableBody.innerHTML = '';

    attendees.forEach(attendee => {
        const row = document.createElement('tr');
        
        const registrationDate = new Date(attendee.createdAt);
        const formattedDate = registrationDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        const eventName = attendee.event?.name || 'Unknown Event';
        const stateName = attendee.stateName || attendee.state || 'Unknown';
        const branchName = attendee.branchName || attendee.branch || 'Unknown';
        const transport = attendee.transport || 'Unknown';
        
        const checkInStatus = attendee.checkedIn ? 
            '<span class="badge bg-success">Checked In</span>' : 
            '<span class="badge bg-warning">Pending</span>';

        row.innerHTML = `
            <td>${attendee.name}</td>
            <td>${attendee.phone}</td>
            <td>${eventName}</td>
            <td>${stateName}</td>
            <td>${branchName}</td>
            <td>${transport}</td>
            <td>${formattedDate}</td>
            <td>${checkInStatus}</td>
        `;

        tableBody.appendChild(row);
    });
}

/**
 * Populate attendee event filter
 */
function populateAttendeeEventFilter(attendees) {
    const filter = document.getElementById('attendee-event-filter');
    if (!filter) return;

    // Get unique events
    const events = new Map();
    attendees.forEach(attendee => {
        if (attendee.event && attendee.event._id) {
            events.set(attendee.event._id, attendee.event.name);
        }
    });

    // Clear existing options except first
    filter.innerHTML = '<option value="">All Events</option>';

    // Add event options
    events.forEach((name, id) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = name;
        filter.appendChild(option);
    });
}

/**
 * Load pending admin approvals (Super Admin only)
 */
async function loadPendingAdmins() {
    if (currentUserRole !== 'super_admin') return;

    try {
        const response = await window.apiCall('/users/pending-admins', 'GET', null, window.auth.getToken());
        const pendingAdmins = Array.isArray(response) ? response : (response.data || []);
        
        displayPendingAdmins(pendingAdmins);
        
    } catch (error) {
        console.error('Error loading pending admins:', error);
        const tableBody = document.getElementById('pending-admins-table-body');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Failed to load pending admins</td></tr>';
        }
    }
}

/**
 * Display pending admin approvals
 */
function displayPendingAdmins(admins) {
    const tableBody = document.getElementById('pending-admins-table-body');
    if (!tableBody) return;

    if (!admins || admins.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No pending admin approvals</td></tr>';
        return;
    }

    tableBody.innerHTML = '';

    admins.forEach(admin => {
        const row = document.createElement('tr');
        
        const roleDisplayNames = {
            'state_admin': 'State Admin',
            'branch_admin': 'Branch Admin'
        };

        row.innerHTML = `
            <td>${admin.name}</td>
            <td>${admin.email}</td>
            <td>
                <span class="badge bg-info">${roleDisplayNames[admin.role] || admin.role}</span>
            </td>
            <td>${admin.stateName || admin.state || '-'}</td>
            <td>${admin.branchName || admin.branch || '-'}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-success" onclick="approveAdmin('${admin._id}')">
                        <i class="bi bi-check"></i> Approve
                    </button>
                    <button class="btn btn-danger" onclick="rejectAdmin('${admin._id}')">
                        <i class="bi bi-x"></i> Reject
                    </button>
                </div>
            </td>
        `;

        tableBody.appendChild(row);
    });
}

/**
 * Setup event handlers
 */
function setupEventHandlers() {
    // Attendee event filter
    const attendeeEventFilter = document.getElementById('attendee-event-filter');
    if (attendeeEventFilter) {
        attendeeEventFilter.addEventListener('change', filterAttendees);
    }

    // Branch selection confirmation
    const confirmBranchBtn = document.getElementById('confirm-branch-selection-btn');
    if (confirmBranchBtn) {
        confirmBranchBtn.addEventListener('click', confirmBranchSelection);
    }

    // Add pickup station button
    const addPickupStationBtn = document.getElementById('add-pickup-station-btn');
    if (addPickupStationBtn) {
        addPickupStationBtn.addEventListener('click', openAddPickupStationModal);
    }

    // Create pickup station form
    const createPickupStationForm = document.getElementById('createPickupStationForm');
    if (createPickupStationForm) {
        createPickupStationForm.addEventListener('submit', handleCreatePickupStation);
    }
}

/**
 * Filter attendees by event
 */
function filterAttendees() {
    const selectedEventId = document.getElementById('attendee-event-filter').value;
    
    if (!selectedEventId) {
        displayAttendees(allAttendees);
        return;
    }

    const filteredAttendees = allAttendees.filter(attendee => 
        attendee.event && attendee.event._id === selectedEventId
    );
    
    displayAttendees(filteredAttendees);
}

/**
 * Get creator level badge HTML
 */
function getCreatorLevelBadge(creatorLevel) {
    const badges = {
        'super_admin': '<span class="badge bg-danger event-creator-badge">Super Admin</span>',
        'state_admin': '<span class="badge bg-warning event-creator-badge">State Admin</span>',
        'branch_admin': '<span class="badge bg-info event-creator-badge">Branch Admin</span>'
    };
    return badges[creatorLevel] || '<span class="badge bg-secondary event-creator-badge">Unknown</span>';
}

/**
 * Get event status badge HTML
 */
function getEventStatusBadge(event) {
    const now = new Date();
    const eventDate = new Date(event.date);
    
    if (eventDate > now) {
        return '<span class="badge bg-primary">Upcoming</span>';
    } else {
        return '<span class="badge bg-success">Completed</span>';
    }
}

/**
 * View event details
 */
function viewEventDetails(eventId) {
    window.open(`event-details.html?id=${eventId}`, '_blank');
}

/**
 * View event attendees
 */
function viewEventAttendees(eventId) {
    // Filter attendees for this event and switch to attendees tab
    const attendeeEventFilter = document.getElementById('attendee-event-filter');
    if (attendeeEventFilter) {
        attendeeEventFilter.value = eventId;
        filterAttendees();
    }
    
    // Switch to attendees tab
    const attendeesTab = document.querySelector('a[href="#attendees"]');
    if (attendeesTab) {
        const tab = new bootstrap.Tab(attendeesTab);
        tab.show();
    }
}

/**
 * Delete event (Super Admin only)
 */
async function deleteEvent(eventId) {
    if (currentUserRole !== 'super_admin') {
        window.showToast('error', 'Only Super Admins can delete events');
        return;
    }

    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
        return;
    }

    try {
        await window.apiCall(`/events/${eventId}`, 'DELETE', null, window.auth.getToken());
        window.showToast('success', 'Event deleted successfully');
        
        // Reload events
        await loadMyEvents();
        if (currentUserRole === 'super_admin') {
            await loadAllEvents();
        }
        
    } catch (error) {
        console.error('Error deleting event:', error);
        window.showToast('error', 'Failed to delete event: ' + (error.message || 'Unknown error'));
    }
}

/**
 * Approve admin (Super Admin only)
 */
async function approveAdmin(adminId) {
    if (currentUserRole !== 'super_admin') return;

    try {
        await window.apiCall(`/users/${adminId}/approve`, 'PATCH', null, window.auth.getToken());
        window.showToast('success', 'Admin approved successfully');
        await loadPendingAdmins();
        
    } catch (error) {
        console.error('Error approving admin:', error);
        window.showToast('error', 'Failed to approve admin: ' + (error.message || 'Unknown error'));
    }
}

/**
 * Reject admin (Super Admin only)
 */
async function rejectAdmin(adminId) {
    if (currentUserRole !== 'super_admin') return;

    if (!confirm('Are you sure you want to reject this admin application?')) {
        return;
    }

    try {
        await window.apiCall(`/users/${adminId}`, 'DELETE', null, window.auth.getToken());
        window.showToast('success', 'Admin application rejected');
        await loadPendingAdmins();
        
    } catch (error) {
        console.error('Error rejecting admin:', error);
        window.showToast('error', 'Failed to reject admin: ' + (error.message || 'Unknown error'));
    }
}

/**
 * Open add pickup station modal (Branch Admin only)
 */
function openAddPickupStationModal() {
    if (currentUserRole !== 'branch_admin') return;
    
    const modal = new bootstrap.Modal(document.getElementById('addPickupStationModal'));
    modal.show();
}

/**
 * Handle create pickup station form submission
 */
async function handleCreatePickupStation(event) {
    event.preventDefault();
    
    if (currentUserRole !== 'branch_admin') return;

    const form = event.target;
    const formData = new FormData(form);
    
    const stationData = {
        location: formData.get('location'),
        zone: formData.get('zone'),
        branchId: currentUserBranch,
        isActive: true
    };

    try {
        await window.apiCall('/pickup-stations', 'POST', stationData, window.auth.getToken());
        window.showToast('success', 'Pickup station created successfully');
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('addPickupStationModal'));
        modal.hide();
        
        // Reset form
        form.reset();
        
        // Reload pickup stations
        await loadPickupStations();
        
    } catch (error) {
        console.error('Error creating pickup station:', error);
        window.showToast('error', 'Failed to create pickup station: ' + (error.message || 'Unknown error'));
    }
}

/**
 * Edit pickup station
 */
async function editPickupStation(stationId) {
    // Implementation for editing pickup station
    // This would open a modal with pre-filled data
    window.showToast('info', 'Edit pickup station functionality coming soon');
}

/**
 * Delete pickup station
 */
async function deletePickupStation(stationId) {
    if (currentUserRole !== 'branch_admin') return;

    if (!confirm('Are you sure you want to delete this pickup station?')) {
        return;
    }

    try {
        await window.apiCall(`/pickup-stations/${stationId}`, 'DELETE', null, window.auth.getToken());
        window.showToast('success', 'Pickup station deleted successfully');
        await loadPickupStations();
        
    } catch (error) {
        console.error('Error deleting pickup station:', error);
        window.showToast('error', 'Failed to delete pickup station: ' + (error.message || 'Unknown error'));
    }
}

// Export functions for global access
window.openBranchSelectionModal = openBranchSelectionModal;
window.confirmBranchSelection = confirmBranchSelection;
window.viewEventDetails = viewEventDetails;
window.viewEventAttendees = viewEventAttendees;
window.deleteEvent = deleteEvent;
window.approveAdmin = approveAdmin;
window.rejectAdmin = rejectAdmin;
window.openAddPickupStationModal = openAddPickupStationModal;
window.editPickupStation = editPickupStation;
window.deletePickupStation = deletePickupStation;
