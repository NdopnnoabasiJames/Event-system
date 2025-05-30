// Events Management Module
// This module handles all event-related functionality for the admin dashboard

// Import form utility functions
import { getFormDataAsObject, toFullISOString } from '../utils/form-utils.js';

/**
 * Load and display events data in the admin dashboard
 */
export async function loadEventsData() {
    try {
        console.log('Fetching events from server...');
        
        // Get user role to determine which endpoint to use
        const user = auth.getUser();
        const userRole = user?.role;
        
        let response;
        if (userRole === 'super_admin' || userRole === 'state_admin' || userRole === 'branch_admin') {
            // Use hierarchical endpoint for role-based event fetching
            response = await apiCall('/events/hierarchical/my-events', 'GET', null, auth.getToken());
        } else {
            // Fallback to regular events API for other roles
            response = await eventsApi.getAllEvents();
        }
        
        console.log('Events response from server:', response);
        
        const events = Array.isArray(response) ? response : (response.data || []);
        console.log('Processed events array:', events);
        
        const tableBody = document.getElementById('events-table-body');
        
        tableBody.innerHTML = '';
        
        if (!events || events.length === 0) {
            console.log('No events found');
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No events found</td></tr>';
            return;
        }
          // Get all attendees to calculate counts
        const attendeesResponse = await apiCall('/attendees', 'GET', null, auth.getToken());
        const allAttendees = Array.isArray(attendeesResponse) ? 
                            attendeesResponse : 
                            (attendeesResponse.data || []);
        
        // Create a map to count attendees per event
        const attendeesCountMap = {};
        allAttendees.forEach(attendee => {
            const eventId = attendee.event?._id || (typeof attendee.event === 'string' ? attendee.event : null);
            if (eventId) {
                if (!attendeesCountMap[eventId]) {
                    attendeesCountMap[eventId] = 0;
                }
                attendeesCountMap[eventId]++;
            }
        });
        
        for (const event of events) {
            const row = document.createElement('tr');
            const eventId = event._id || event.id;
            
            // Calculate actual attendee count
            const attendeeCount = attendeesCountMap[eventId] || 0;
            
            // Get accurate marketers count
            const marketersCount = Array.isArray(event.marketers) ? event.marketers.length : 0;
            
            // Format date
            const eventDate = new Date(event.date);
            const formattedDate = eventDate.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
            
            // Determine status
            let statusBadge;
            if (new Date() > eventDate) {
                statusBadge = '<span class="badge bg-secondary">Past</span>';
            } else if (event.status === 'cancelled') {
                statusBadge = '<span class="badge bg-danger">Cancelled</span>';
            } else {
                statusBadge = '<span class="badge bg-success">Active</span>';
            }
              row.innerHTML = `
                <td>${event.name}</td>
                <td>${formattedDate}</td>
                <td>${statusBadge}</td>
                <td>${attendeeCount}</td>
                <td>${marketersCount}</td>
                <td>
                    <div class="btn-group">
                        <a href="event-details.html?id=${eventId}" class="btn btn-sm btn-primary">
                            <i class="bi bi-eye"></i> View
                        </a>
                        <button class="btn btn-sm btn-danger delete-event" data-event-id="${eventId}" data-event-name="${event.name}">
                            <i class="bi bi-trash"></i> Delete
                        </button>
                    </div>
                </td>
            `;
              tableBody.appendChild(row);
        }
        
        // Add event listeners for delete buttons
        document.querySelectorAll('.delete-event').forEach(button => {
            button.addEventListener('click', async (event) => {
                const eventId = event.currentTarget.getAttribute('data-event-id');
                const eventName = event.currentTarget.getAttribute('data-event-name');
                
                if (confirm(`Are you sure you want to delete the event "${eventName}"? This action cannot be undone.`)) {
                    try {
                        await eventsApi.deleteEvent(eventId);
                        showToast('success', `Event "${eventName}" deleted successfully`);
                        // Reload the events data
                        await loadEventsData();
                    } catch (error) {
                        showToast('error', `Failed to delete event: ${error.message}`);
                    }
                }
            });
        });
    } catch (error) {
        showToast('error', 'Failed to load events data');
    }
}

/**
 * Setup event filter dropdown for filtering attendees by event
 */
export async function setupEventFilter() {
    try {
        const response = await eventsApi.getAllEvents();
        const events = Array.isArray(response) ? response : (response.data || []);
        
        const selectElement = document.getElementById('event-filter');
        
        // Clear existing options except the first one
        while (selectElement.options.length > 1) {
            selectElement.remove(1);
        }
        
        if (!events || events.length === 0) {
            return;
        }
        
        // Sort events by date (newest first)
        events.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Add event options
        events.forEach(event => {
            const option = document.createElement('option');
            option.value = event._id;
            option.textContent = event.name;
            selectElement.appendChild(option);
        });    } catch (error) {
        // Silently handle event filter setup errors
    }
}

/**
 * Setup all event creation handlers including form submission, image upload, state/branch selection
 */
export async function setupEventCreationHandlers() {
    try {
        // First, properly prevent default submission
        const form = document.getElementById('createEventForm');
        if (form) {
            form.addEventListener('submit', function(e) {
                // Always prevent the default form submission
                e.preventDefault();
                // Form submission will be handled by the saveEventBtn click handler
                return false;
            });
            
            // Add event listeners to all form inputs to prevent Enter key from submitting
            const formInputs = form.querySelectorAll('input, select, textarea');
            formInputs.forEach(input => {
                input.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
                        e.preventDefault();
                        return false;
                    }
                });
            });
        }
        
        // Setup banner image preview functionality
        const eventBanner = document.getElementById('eventBanner');
        const bannerPreviewContainer = document.getElementById('bannerPreviewContainer');
        const bannerPreview = document.getElementById('bannerPreview');
        const removeBannerBtn = document.getElementById('removeBannerBtn');
        
        if (eventBanner && bannerPreviewContainer && bannerPreview && removeBannerBtn) {
            // Show preview when file is selected
            eventBanner.addEventListener('change', function() {
                if (this.files && this.files[0]) {
                    const file = this.files[0];
                    
                    // Validate file size and type
                    if (file.size > 2 * 1024 * 1024) {
                        showToast('error', 'Image size should not exceed 2MB');
                        eventBanner.value = '';
                        return;
                    }
                    
                    if (!['image/jpeg', 'image/png', 'image/jpg', 'image/gif'].includes(file.type)) {
                        showToast('error', 'Please select a valid image file (JPG, PNG, or GIF)');
                        eventBanner.value = '';
                        return;
                    }
                    
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        bannerPreview.src = e.target.result;
                        bannerPreviewContainer.classList.remove('d-none');
                    }
                    reader.readAsDataURL(file);
                }
            });
            
            // Remove preview when button is clicked
            removeBannerBtn.addEventListener('click', function() {
                eventBanner.value = '';
                bannerPreviewContainer.classList.add('d-none');
            });
        }          // Setup state selection based on user role
        const stateSelectionContainer = document.getElementById('stateSelectionContainer');
        if (stateSelectionContainer) {
            // Clear existing content
            stateSelectionContainer.innerHTML = '';

            // Get current user info
            const user = auth.getUser();
            const userRole = user.role;

            // Role-based state/branch selection setup
            if (userRole === 'super_admin') {
                await setupSuperAdminStateSelection(stateSelectionContainer);
            } else if (userRole === 'state_admin') {
                await setupStateAdminBranchSelection(stateSelectionContainer, user);
            } else if (userRole === 'branch_admin') {
                setupBranchAdminSelection(stateSelectionContainer, user);
            }
        }        // Helper function for Super Admin state selection
        async function setupSuperAdminStateSelection(container) {
            try {
                // Load states from API
                const statesResponse = await apiCall('/states', 'GET', null, auth.getToken());
                const states = Array.isArray(statesResponse) ? statesResponse : (statesResponse.data || []);
                
                // Create state checkboxes
                const stateCheckboxesDiv = document.createElement('div');
                stateCheckboxesDiv.className = 'state-checkboxes mb-3';
                stateCheckboxesDiv.innerHTML = '<label class="form-label fw-bold mb-2">Select States for Event*</label>';
                
                // Add checkboxes for each state
                states.forEach(state => {
                    const checkboxDiv = document.createElement('div');
                    checkboxDiv.className = 'form-check';
                    checkboxDiv.innerHTML = `
                        <input class="form-check-input state-checkbox" type="checkbox" value="${state._id}" 
                               data-state-name="${state.name}" id="state-${state._id}" name="selectedStates">
                        <label class="form-check-label" for="state-${state._id}">
                            ${state.name}
                        </label>
                    `;
                    stateCheckboxesDiv.appendChild(checkboxDiv);
                });
                container.appendChild(stateCheckboxesDiv);

                // Create branch selection container
                const branchSelectionDiv = document.createElement('div');
                branchSelectionDiv.id = 'branchSelectionContainer';
                branchSelectionDiv.className = 'branch-selection mb-3';
                branchSelectionDiv.innerHTML = '<label class="form-label fw-bold mb-2">Select Branches for Event*</label><div id="branchCheckboxes" class="branch-checkboxes"></div>';
                container.appendChild(branchSelectionDiv);
                
                // Add event listener for state checkboxes
                const stateCheckboxes = document.querySelectorAll('.state-checkbox');
                stateCheckboxes.forEach(checkbox => {
                    checkbox.addEventListener('change', updateBranchSelection);
                });
            } catch (error) {
                console.error('Failed to load states:', error);
                showToast('error', 'Failed to load states');
            }
        }

        // Helper function for State Admin branch selection
        async function setupStateAdminBranchSelection(container, user) {
            try {
                // State Admin can only create events for their assigned state
                const userState = user.state;
                if (!userState) {
                    container.innerHTML = '<div class="alert alert-warning">No state assigned to your account. Please contact administrator.</div>';
                    return;
                }

                // Display state info
                const stateInfoDiv = document.createElement('div');
                stateInfoDiv.className = 'alert alert-info mb-3';
                stateInfoDiv.innerHTML = `<strong>Creating event for state:</strong> ${userState.name}`;
                container.appendChild(stateInfoDiv);

                // Hidden input to store the state
                const hiddenStateInput = document.createElement('input');
                hiddenStateInput.type = 'hidden';
                hiddenStateInput.name = 'selectedStates';
                hiddenStateInput.value = userState._id;
                hiddenStateInput.className = 'state-checkbox';
                hiddenStateInput.checked = true;
                container.appendChild(hiddenStateInput);

                // Load branches for this state
                const branchesResponse = await apiCall(`/branches/by-state/${userState._id}`, 'GET', null, auth.getToken());
                const branches = Array.isArray(branchesResponse) ? branchesResponse : (branchesResponse.data || []);
                
                if (branches.length === 0) {
                    container.innerHTML += '<div class="alert alert-warning">No branches found for your state. Please contact administrator.</div>';
                    return;
                }

                // Create branch selection
                const branchSelectionDiv = document.createElement('div');
                branchSelectionDiv.className = 'branch-selection mb-3';
                branchSelectionDiv.innerHTML = '<label class="form-label fw-bold mb-2">Select Branches for Event*</label>';
                
                const branchCheckboxesDiv = document.createElement('div');
                branchCheckboxesDiv.className = 'branch-checkboxes';
                
                // Add branch checkboxes
                branches.forEach((branch, branchIndex) => {
                    const checkboxDiv = document.createElement('div');
                    checkboxDiv.className = 'form-check mb-3';
                    checkboxDiv.innerHTML = `
                        <input class="form-check-input branch-checkbox" type="checkbox" value="${branch._id}" 
                            id="branch-${branch._id}" name="branches" data-state="${userState._id}" data-branch-name="${branch.name}">
                        <label class="form-check-label" for="branch-${branch._id}">
                            ${branch.name}
                        </label>
                        <div class="pickup-stations-container mt-2 d-none" id="pickup-container-${branch._id}">
                            <div class="card">
                                <div class="card-header">
                                    <small class="text-muted">Pickup Stations for ${branch.name}</small>
                                </div>
                                <div class="card-body">
                                    <div id="pickup-stations-${branch._id}">
                                        <!-- Pickup stations will be loaded here -->
                                    </div>
                                    <button type="button" class="btn btn-sm btn-outline-primary mt-2" 
                                            onclick="handleCreateNewPickupStationForBranch(this.closest('.pickup-stations-container'), '${branch._id}', '${branchIndex}')">
                                        <i class="bi bi-plus"></i> Add New Pickup Station
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                    branchCheckboxesDiv.appendChild(checkboxDiv);
                    
                    // Add event listener to show/hide pickup stations when branch is selected
                    const branchCheckbox = checkboxDiv.querySelector('.branch-checkbox');
                    branchCheckbox.addEventListener('change', async function() {
                        const pickupContainer = document.getElementById(`pickup-container-${branch._id}`);
                        if (this.checked) {
                            pickupContainer.classList.remove('d-none');
                            await loadPickupStationsForBranch(pickupContainer, branch, branchIndex);
                        } else {
                            pickupContainer.classList.add('d-none');
                        }
                    });
                });

                branchSelectionDiv.appendChild(branchCheckboxesDiv);
                container.appendChild(branchSelectionDiv);

            } catch (error) {
                console.error('Failed to load branches for state admin:', error);
                showToast('error', 'Failed to load branches');
                container.innerHTML = '<div class="alert alert-danger">Failed to load branches. Please try again.</div>';
            }
        }

        // Helper function for Branch Admin selection
        function setupBranchAdminSelection(container, user) {
            try {
                const userState = user.state;
                const userBranch = user.branch;

                if (!userState || !userBranch) {
                    container.innerHTML = '<div class="alert alert-warning">No state or branch assigned to your account. Please contact administrator.</div>';
                    return;
                }

                // Display state and branch info
                const infoDiv = document.createElement('div');
                infoDiv.className = 'alert alert-info mb-3';
                infoDiv.innerHTML = `
                    <strong>Creating event for:</strong><br>
                    State: ${userState.name}<br>
                    Branch: ${userBranch.name}
                `;
                container.appendChild(infoDiv);

                // Hidden inputs to store the state and branch
                const hiddenStateInput = document.createElement('input');
                hiddenStateInput.type = 'hidden';
                hiddenStateInput.name = 'selectedStates';
                hiddenStateInput.value = userState._id;
                hiddenStateInput.className = 'state-checkbox';
                hiddenStateInput.checked = true;
                container.appendChild(hiddenStateInput);

                const hiddenBranchInput = document.createElement('input');
                hiddenBranchInput.type = 'hidden';
                hiddenBranchInput.name = 'branches';
                hiddenBranchInput.value = userBranch._id;
                hiddenBranchInput.className = 'branch-checkbox';
                hiddenBranchInput.checked = true;
                hiddenBranchInput.setAttribute('data-state', userState._id);
                hiddenBranchInput.setAttribute('data-branch-name', userBranch.name);
                container.appendChild(hiddenBranchInput);

                // Create pickup stations section for the branch
                const pickupStationsDiv = document.createElement('div');
                pickupStationsDiv.className = 'pickup-stations-section mb-3';
                pickupStationsDiv.innerHTML = `
                    <label class="form-label fw-bold mb-2">Manage Pickup Stations</label>
                    <div class="pickup-stations-container" id="pickup-container-${userBranch._id}">
                        <div class="card">
                            <div class="card-header">
                                <small class="text-muted">Pickup Stations for ${userBranch.name}</small>
                            </div>
                            <div class="card-body">
                                <div id="pickup-stations-${userBranch._id}">
                                    <!-- Pickup stations will be loaded here -->
                                </div>
                                <button type="button" class="btn btn-sm btn-outline-primary mt-2" 
                                        onclick="handleCreateNewPickupStationForBranch(this.closest('.pickup-stations-container'), '${userBranch._id}', '0')">
                                    <i class="bi bi-plus"></i> Add New Pickup Station
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                container.appendChild(pickupStationsDiv);

                // Auto-load pickup stations for the branch
                const pickupContainer = document.getElementById(`pickup-container-${userBranch._id}`);
                if (pickupContainer) {
                    loadPickupStationsForBranch(pickupContainer, userBranch, 0);
                }

            } catch (error) {
                console.error('Failed to setup branch admin selection:', error);
                showToast('error', 'Failed to setup branch admin selection');
                container.innerHTML = '<div class="alert alert-danger">Failed to setup branch selection. Please try again.</div>';
            }
        }// Function to update branch selection based on selected states
        async function updateBranchSelection() {
            const selectedStates = [];
            const stateCheckboxes = document.querySelectorAll('.state-checkbox:checked');
            stateCheckboxes.forEach(checkbox => {
                selectedStates.push({
                    id: checkbox.value,
                    name: checkbox.getAttribute('data-state-name')
                });
            });
            
            const branchCheckboxes = document.getElementById('branchCheckboxes');
            if (!branchCheckboxes) return;
            
            // Clear existing branch checkboxes
            branchCheckboxes.innerHTML = '';
            
            // Create branch checkboxes for each selected state
            for (const state of selectedStates) {
                try {
                    // Load branches for this state from API
                    const branchesResponse = await apiCall(`/branches/by-state/${state.id}`, 'GET', null, auth.getToken());
                    const branches = Array.isArray(branchesResponse) ? branchesResponse : (branchesResponse.data || []);
                    
                    if (branches.length > 0) {
                        // Add state header
                        const stateHeader = document.createElement('h6');
                        stateHeader.className = 'mt-3 mb-2';
                        stateHeader.textContent = state.name;
                        branchCheckboxes.appendChild(stateHeader);
                        
                        // Add branch checkboxes
                        branches.forEach((branch, branchIndex) => {
                            const branchId = `branch-${branch._id}`;
                            const checkboxDiv = document.createElement('div');
                            checkboxDiv.className = 'form-check mb-3';
                            checkboxDiv.innerHTML = `
                                <input class="form-check-input branch-checkbox" type="checkbox" value="${branch._id}" 
                                    id="${branchId}" name="branches" data-state="${state.id}" data-branch-name="${branch.name}">
                                <label class="form-check-label" for="${branchId}">
                                    ${branch.name}
                                </label>
                                <div class="pickup-stations-container mt-2 d-none" id="pickup-container-${branch._id}">
                                    <div class="card">
                                        <div class="card-header">
                                            <small class="text-muted">Pickup Stations for ${branch.name}</small>
                                        </div>
                                        <div class="card-body">
                                            <div id="pickup-stations-${branch._id}">
                                                <!-- Pickup stations will be loaded here -->
                                            </div>
                                            <button type="button" class="btn btn-sm btn-outline-primary mt-2" 
                                                    onclick="handleCreateNewPickupStationForBranch(this.closest('.pickup-stations-container'), '${branch._id}', '${branchIndex}')">
                                                <i class="bi bi-plus"></i> Add New Pickup Station
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            `;
                            branchCheckboxes.appendChild(checkboxDiv);
                            
                            // Add event listener to show/hide pickup stations when branch is selected
                            const branchCheckbox = checkboxDiv.querySelector('.branch-checkbox');
                            branchCheckbox.addEventListener('change', async function() {
                                const pickupContainer = document.getElementById(`pickup-container-${branch._id}`);
                                if (this.checked) {
                                    pickupContainer.classList.remove('d-none');
                                    await loadPickupStationsForBranch(pickupContainer, branch, branchIndex);
                                } else {
                                    pickupContainer.classList.add('d-none');
                                }
                            });
                        });
                    }
                } catch (error) {
                    console.error(`Failed to load branches for state ${state.name}:`, error);
                }
            }
            
            // Show or hide branch selection container based on whether states are selected
            const branchSelectionContainer = document.getElementById('branchSelectionContainer');
            if (branchSelectionContainer) {
                if (selectedStates.length > 0) {
                    branchSelectionContainer.classList.remove('d-none');
                } else {
                    branchSelectionContainer.classList.add('d-none');
                }
            }
        }        // Function to load pickup stations for a branch
        async function loadPickupStationsForBranch(containerElement, branch, branchIndex) {
            try {                const pickupStationsContainer = containerElement.querySelector(`#pickup-stations-${branch._id}`);
                if (!pickupStationsContainer) return;
                
                // Load existing pickup stations for this branch
                const response = await apiCall(`/pickup-stations/by-branch/${branch._id}`, 'GET', null, auth.getToken());
                const pickupStations = Array.isArray(response) ? response : (response.data || []);
                
                // Clear existing content
                pickupStationsContainer.innerHTML = '';
                
                if (pickupStations.length === 0) {
                    pickupStationsContainer.innerHTML = '<p class="text-muted mb-2"><small>No pickup stations found. Create one below.</small></p>';
                } else {
                    pickupStations.forEach((station, stationIndex) => {
                        const stationDiv = document.createElement('div');
                        stationDiv.className = 'pickup-station-entry mb-2 p-2 border rounded';
                        stationDiv.innerHTML = `
                            <div class="form-check">
                                <input class="form-check-input pickup-station-checkbox" type="checkbox" 
                                       value="${station._id}" id="station-${station._id}"
                                       data-branch="${branch._id}" data-station-name="${station.location || station.name}">
                                <label class="form-check-label" for="station-${station._id}">
                                    ${station.location || station.name}
                                </label>
                            </div>
                            <div class="departure-time-container mt-2 d-none">
                                <label class="form-label small">Departure Time*</label>
                                <input type="datetime-local" class="form-control form-control-sm" 
                                       name="pickupStations[${branchIndex}][${stationIndex}].departureTime" required>
                            </div>
                        `;
                        pickupStationsContainer.appendChild(stationDiv);
                        
                        // Add event listener to show/hide departure time when station is selected
                        const stationCheckbox = stationDiv.querySelector('.pickup-station-checkbox');
                        const departureTimeContainer = stationDiv.querySelector('.departure-time-container');
                        stationCheckbox.addEventListener('change', function() {
                            if (this.checked) {
                                departureTimeContainer.classList.remove('d-none');
                            } else {
                                departureTimeContainer.classList.add('d-none');
                            }
                        });
                    });
                }
            } catch (error) {
                console.error(`Failed to load pickup stations for branch ${branch.name}:`, error);
                const pickupStationsContainer = containerElement.querySelector(`#pickup-stations-${branch._id}`);
                if (pickupStationsContainer) {
                    // Handle specific error cases more gracefully
                    if (error.response?.status === 404) {
                        // 404 means no pickup stations exist - treat as empty result
                        pickupStationsContainer.innerHTML = '<p class="text-muted mb-2"><small>No pickup stations found. Create one below.</small></p>';
                    } else {
                        // Other errors show error message
                        pickupStationsContainer.innerHTML = '<p class="text-danger mb-2"><small>Failed to load pickup stations. Please try again.</small></p>';
                    }
                }
            }
        }        // Function to handle creating new pickup station for a branch
        async function handleCreateNewPickupStationForBranch(containerElement, branchId, branchIndex) {
            try {
                const stationLocation = prompt('Enter the location/address for the new pickup station:');
                if (!stationLocation || stationLocation.trim() === '') {
                    return;
                }

                // Create the new pickup station (only location, branchId, and isActive)
                const createData = {
                    location: stationLocation.trim(),
                    branchId: branchId,
                    isActive: true
                };

                const newStation = await apiCall('/pickup-stations', 'POST', createData, auth.getToken());
                
                showToast('success', `Pickup station "${stationLocation}" created successfully`);
                
                // Find the branch data to reload pickup stations
                const branchCheckbox = document.querySelector(`#branch-${branchId}`);
                if (branchCheckbox) {
                    const branchName = branchCheckbox.getAttribute('data-branch-name');
                    const branch = { _id: branchId, name: branchName };
                    await loadPickupStationsForBranch(containerElement, branch, branchIndex);
                }
            } catch (error) {
                console.error('Failed to create pickup station:', error);
                showToast('error', 'Failed to create pickup station: ' + (error.message || 'Unknown error'));
            }
        }

        // Make the function globally available for onclick handlers
        window.handleCreateNewPickupStationForBranch = handleCreateNewPickupStationForBranch;
          
        // Add Bus Pickup button handler
        const addBusPickupBtn = document.getElementById('addBusPickupBtn');
        if (!addBusPickupBtn) {
            return;
        }
        
        let pickupCount = 1;
          
        addBusPickupBtn.addEventListener('click', () => {
            const busPickupsContainer = document.getElementById('busPickupsContainer');
            if (!busPickupsContainer) {
                return;
            }
            
            const newPickup = document.createElement('div');
            newPickup.className = 'bus-pickup-entry mb-3 p-3 border rounded';
            newPickup.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h6 class="mb-0">Pickup ${pickupCount + 1}</h6>
                    <button type="button" class="btn btn-sm btn-outline-danger remove-pickup">
                        <i class="bi bi-trash"></i> Remove
                    </button>
                </div>
                <div class="mb-2">
                    <label class="form-label">Pickup Location*</label>
                    <input type="text" class="form-control" name="busPickups[${pickupCount}].location" required>
                </div>
                <div class="mb-2">
                    <label class="form-label">Departure Time*</label>
                    <input type="datetime-local" class="form-control" name="busPickups[${pickupCount}].departureTime" required>
                </div>
                <div class="mb-2">
                    <label class="form-label">Maximum Capacity</label>
                    <input type="number" class="form-control" name="busPickups[${pickupCount}].maxCapacity" min="1">
                </div>
            `;
            
            busPickupsContainer.appendChild(newPickup);
            pickupCount++;
            
            // Add event listener to remove button
            const removeBtn = newPickup.querySelector('.remove-pickup');
            if (removeBtn) {
                removeBtn.addEventListener('click', () => {
                    busPickupsContainer.removeChild(newPickup);
                });
            }
            
            // Prevent Enter key from submitting in new inputs
            const newInputs = newPickup.querySelectorAll('input');
            newInputs.forEach(input => {
                input.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
                        e.preventDefault();
                        return false;
                    }
                });
            });
        });
        
        // Form submission handler
        const saveEventBtn = document.getElementById('saveEventBtn');
        if (!saveEventBtn) {
            return;
        }
        
        saveEventBtn.addEventListener('click', async (e) => {
            // Always prevent default behavior
            e.preventDefault();
            
            try {
                const form = document.getElementById('createEventForm');
                if (!form) {
                    return;
                }
                
                // Step 1: Collect all form data first
                // Get basic form data
                const formData = getFormDataAsObject(form);
                  // Step 2: Collect selected states and branches
                const selectedStates = [];
                const selectedBranches = [];
                
                document.querySelectorAll('.state-checkbox:checked').forEach(checkbox => {
                    selectedStates.push(checkbox.value); // This is now the state ID
                });
                
                document.querySelectorAll('.branch-checkbox:checked').forEach(checkbox => {
                    selectedBranches.push(checkbox.value); // This is now the branch ID
                });
                
                // Add selections to form data
                formData.selectedStates = selectedStates;
                formData.selectedBranches = selectedBranches;
                  // Step 3: Validate everything and collect errors
                let validationErrors = [];
                
                // Basic form validation
                if (!form.checkValidity()) {
                    form.reportValidity();
                    return;  // Stop here if basic HTML validation fails
                }
                
                // Role-based validation for states and branches
                const user = auth.getUser();
                const userRole = user.role;
                
                if (userRole === 'super_admin') {
                    // Super Admin must select states and branches
                    if (selectedStates.length === 0) {
                        validationErrors.push('Please select at least one state for the event');
                    }
                    if (selectedBranches.length === 0) {
                        validationErrors.push('Please select at least one branch for the event');
                    }
                } else if (userRole === 'state_admin') {
                    // State Admin has predefined state, but must select branches
                    if (selectedBranches.length === 0) {
                        validationErrors.push('Please select at least one branch for the event');
                    }
                } else if (userRole === 'branch_admin') {
                    // Branch Admin has predefined state and branch - no additional validation needed
                    // The state and branch are automatically set from their user profile
                }
                
                // Validate date fields
                const isoEventDate = toFullISOString(formData.date);
                if (!isoEventDate) {
                    validationErrors.push('Event date is missing or invalid. Please select a valid date and time.');
                }
                
                if (formData.busPickups && Array.isArray(formData.busPickups)) {
                    formData.busPickups.forEach((pickup, idx) => {
                        const isoPickup = toFullISOString(pickup.departureTime);
                        if (!isoPickup) {
                            validationErrors.push(`Bus pickup ${idx + 1} departure time is missing or invalid. Please select a valid date and time.`);
                        }
                    });
                }
                
                // Step 4: If there are validation errors, show them and stop here
                if (validationErrors.length > 0) {
                    // Show each error as a toast
                    validationErrors.forEach(errorMsg => {
                        showToast('error', errorMsg);
                    });
                    return; // Stop here - do not continue with form submission
                }
                
                // Step 5: Handle banner image upload
                const bannerInput = document.getElementById('eventBanner');
                let bannerImageName = '';
                
                if (bannerInput && bannerInput.files && bannerInput.files.length > 0) {
                    const bannerFile = bannerInput.files[0];
                    
                    // Validate file size (max 2MB)
                    if (bannerFile.size > 2 * 1024 * 1024) {
                        showToast('error', 'Banner image size should not exceed 2MB');
                        return;
                    }
                    
                    // Validate file type
                    if (!['image/jpeg', 'image/png', 'image/jpg', 'image/gif'].includes(bannerFile.type)) {
                        showToast('error', 'Please select a valid image file (JPG, PNG, or GIF)');
                        return;
                    }
                    
                    // Upload the banner image
                    try {
                        const uploadFormData = new FormData();
                        uploadFormData.append('image', bannerFile);
                        const token = auth.getToken();
                        
                        // Use the apiCall utility for consistency, but we need direct fetch for FormData
                        const uploadUrl = `${API_BASE_URL}/upload/event-banner`;
                        
                        const response = await fetch(uploadUrl, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${token}`
                            },
                            body: uploadFormData,
                            credentials: 'include'
                        });
                        
                        if (!response.ok) {
                            const errorText = await response.text();
                            throw new Error(`Failed to upload banner image: ${response.status} ${response.statusText}`);
                        }
                        
                        const result = await response.json();
                        bannerImageName = result.filename;
                    } catch (uploadError) {
                        showToast('error', 'Failed to upload banner image: ' + (uploadError.message || 'Unknown error'));
                        return;
                    }
                }
                
                // Add banner image to form data if uploaded
                if (bannerImageName) {
                    formData.bannerImage = bannerImageName;
                }
                
                // Step 6: Format event data for API submission
                const eventData = formatEventData(formData);                // Step 7: Submit the event data to the server using role-based endpoint
                let createdEvent;

                if (userRole === 'super_admin') {
                    // Super Admin creates events with full hierarchy
                    createdEvent = await apiCall('/events/hierarchical/super-admin', 'POST', eventData, auth.getToken());
                } else if (userRole === 'state_admin') {
                    // State Admin creates events for their state
                    createdEvent = await apiCall('/events/hierarchical/state-admin', 'POST', eventData, auth.getToken());
                } else if (userRole === 'branch_admin') {
                    // Branch Admin creates events for their branch
                    createdEvent = await apiCall('/events/hierarchical/branch-admin', 'POST', eventData, auth.getToken());
                } else {
                    // Fallback to regular event creation for other roles
                    createdEvent = await eventsApi.createEvent(eventData);
                }
                
                // Step 8: Handle successful creation
                showToast('success', 'Event created successfully!');
                
                // Show alert popup
                alert('Event created successfully!');
                
                // Close the modal
                const modalElement = document.getElementById('createEventModal');
                if (modalElement) {
                    const modal = bootstrap.Modal.getInstance(modalElement);
                    if (modal) {
                        modal.hide();
                    }
                }
                
                // Reset the form
                form.reset();
                
                // Reload events data
                await loadEventsData();
                await setupEventFilter();
            } catch (error) {
                showToast('error', 'Failed to create event: ' + (error.message || 'Unknown error'));
            }
        });
    } catch (error) {
        showToast('error', 'Failed to set up event creation functionality');
    }
}

/**
 * Format form data into the structure expected by the API
 * @param {Object} formData - The form data collected from the event creation form
 * @returns {Object} Formatted event data for API submission
 */
export function formatEventData(formData) {
    const eventData = {
        name: formData.name,
        description: formData.description || null,
        date: toFullISOString(formData.date),
        states: formData.selectedStates || [], // Array of state IDs
        branches: formData.selectedBranches || [], // Array of branch IDs
        isActive: formData.isActive === 'true',
        busPickups: [],
        bannerImage: formData.bannerImage || null
    };

    if (formData.busPickups && Array.isArray(formData.busPickups)) {
        eventData.busPickups = formData.busPickups.map(pickup => ({
            location: pickup.location,
            departureTime: toFullISOString(pickup.departureTime), // Use full ISO string
            maxCapacity: pickup.maxCapacity ? parseInt(pickup.maxCapacity) : undefined,
            currentCount: 0
        }));
    }

    return eventData;
}

/**
 * Load pickup stations management for Branch Admin events page
 */
export async function loadPickupStationsManagement() {
    try {
        const user = auth.getUser();
        if (user.role !== 'branch_admin' || !user.branch) {
            console.log('Not a branch admin or no branch assigned');
            return;
        }

        const container = document.getElementById('pickupStationsManagement');
        if (!container) return;

        // Load existing pickup stations for the branch
        const response = await apiCall(`/pickup-stations/by-branch/${user.branch._id}`, 'GET', null, auth.getToken());
        const pickupStations = Array.isArray(response) ? response : (response.data || []);

        // Display pickup stations
        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h5>Pickup Stations Management</h5>
                <button type="button" class="btn btn-primary" onclick="createNewPickupStation()">
                    <i class="bi bi-plus"></i> Add New Station
                </button>
            </div>
            <div id="pickupStationsList">
                ${pickupStations.length === 0 ? 
                    '<div class="alert alert-info">No pickup stations found. Create your first station!</div>' :
                    pickupStations.map(station => `
                        <div class="card mb-3" data-station-id="${station._id}">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-start">
                                    <div>
                                        <h6 class="card-title">${station.location || station.name}</h6>
                                        <p class="card-text text-muted">
                                            Status: <span class="badge ${station.isActive ? 'bg-success' : 'bg-secondary'}">${station.isActive ? 'Active' : 'Inactive'}</span>
                                        </p>
                                        ${station.zone ? `<p class="card-text"><small class="text-muted">Zone: ${station.zone}</small></p>` : ''}
                                    </div>
                                    <div class="btn-group">
                                        <button type="button" class="btn btn-sm btn-outline-primary" onclick="editPickupStation('${station._id}')">
                                            <i class="bi bi-pencil"></i> Edit
                                        </button>
                                        <button type="button" class="btn btn-sm btn-outline-danger" onclick="deletePickupStation('${station._id}', '${station.location || station.name}')">
                                            <i class="bi bi-trash"></i> Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')
                }
            </div>
        `;

        // Make functions globally available
        window.createNewPickupStation = createNewPickupStation;
        window.editPickupStation = editPickupStation;
        window.deletePickupStation = deletePickupStation;

    } catch (error) {
        console.error('Failed to load pickup stations:', error);
        const container = document.getElementById('pickupStationsManagement');
        if (container) {
            container.innerHTML = '<div class="alert alert-danger">Failed to load pickup stations. Please try again.</div>';
        }
    }
}

/**
 * Create a new pickup station
 */
async function createNewPickupStation() {
    try {
        const user = auth.getUser();
        if (!user.branch) {
            showToast('error', 'No branch assigned to your account');
            return;
        }

        const location = prompt('Enter the location/address for the new pickup station:');
        if (!location || location.trim() === '') {
            return;
        }

        const zone = prompt('Enter the zone name (optional):');

        const createData = {
            location: location.trim(),
            branchId: user.branch._id,
            zone: zone ? zone.trim() : null,
            isActive: true
        };

        await apiCall('/pickup-stations', 'POST', createData, auth.getToken());
        showToast('success', `Pickup station "${location}" created successfully`);
        
        // Reload the pickup stations list
        await loadPickupStationsManagement();

    } catch (error) {
        console.error('Failed to create pickup station:', error);
        showToast('error', 'Failed to create pickup station: ' + (error.message || 'Unknown error'));
    }
}

/**
 * Edit an existing pickup station
 */
async function editPickupStation(stationId) {
    try {
        // Get current station data
        const station = await apiCall(`/pickup-stations/${stationId}`, 'GET', null, auth.getToken());
        
        const newLocation = prompt('Enter the new location:', station.location || station.name);
        if (newLocation === null) return; // User cancelled
        
        const newZone = prompt('Enter the zone name:', station.zone || '');
        
        const updateData = {
            location: newLocation.trim(),
            zone: newZone ? newZone.trim() : null
        };

        await apiCall(`/pickup-stations/${stationId}`, 'PATCH', updateData, auth.getToken());
        showToast('success', 'Pickup station updated successfully');
        
        // Reload the pickup stations list
        await loadPickupStationsManagement();

    } catch (error) {
        console.error('Failed to update pickup station:', error);
        showToast('error', 'Failed to update pickup station: ' + (error.message || 'Unknown error'));
    }
}

/**
 * Delete a pickup station
 */
async function deletePickupStation(stationId, stationName) {
    try {
        if (!confirm(`Are you sure you want to delete the pickup station "${stationName}"? This action cannot be undone.`)) {
            return;
        }

        await apiCall(`/pickup-stations/${stationId}`, 'DELETE', null, auth.getToken());
        showToast('success', `Pickup station "${stationName}" deleted successfully`);
        
        // Reload the pickup stations list
        await loadPickupStationsManagement();

    } catch (error) {
        console.error('Failed to delete pickup station:', error);
        showToast('error', 'Failed to delete pickup station: ' + (error.message || 'Unknown error'));
    }
}


