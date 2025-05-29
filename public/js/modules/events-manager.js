// Events Management Module
// This module handles all event-related functionality for the admin dashboard

// Import form utility functions
import { getFormDataAsObject, toFullISOString } from '../utils/form-utils.js';

/**
 * Load and display events data in the admin dashboard
 */
export async function loadEventsData() {
    try {
        console.log('Fetching events from server...');        const response = await eventsApi.getAllEvents();
        console.log('Events response from server:', response);
        
        const events = response.data || response || [];
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
    try {        const response = await eventsApi.getAllEvents();
        const events = response.data || response || [];
        
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
        }        
          // Setup state selection
        const stateSelectionContainer = document.getElementById('stateSelectionContainer');
        if (stateSelectionContainer) {
            // Clear existing content
            stateSelectionContainer.innerHTML = '';
              // Load states from API and create state checkboxes
            try {
                const response = await statesApi.getAllStates();
                console.log('States API response:', response);
                  // Handle the TransformInterceptor format: { data: [...], timestamp: ..., path: ... }
                const states = response.data || response || [];
                console.log('Processed states array:', states);
                
                if (!Array.isArray(states) || states.length === 0) {
                    throw new Error('No states found or invalid response format');
                }
                
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
                stateSelectionContainer.appendChild(stateCheckboxesDiv);

                // Create branch selection container
                const branchSelectionDiv = document.createElement('div');
                branchSelectionDiv.id = 'branchSelectionContainer';
                branchSelectionDiv.className = 'branch-selection mb-3';
                branchSelectionDiv.innerHTML = '<label class="form-label fw-bold mb-2">Select Branches for Event*</label><div id="branchCheckboxes" class="branch-checkboxes"></div>';
                stateSelectionContainer.appendChild(branchSelectionDiv);
                
                // Add event listener for state checkboxes
                const stateCheckboxes = document.querySelectorAll('.state-checkbox');
                stateCheckboxes.forEach(checkbox => {
                    checkbox.addEventListener('change', updateBranchSelection);
                });
            } catch (error) {
                console.error('Failed to load states:', error);
                showToast('error', 'Failed to load states for event creation');
            }
        }
          // Function to update branch selection based on selected states
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
            for (const state of selectedStates) {                try {
                    // Load branches for this state from API
                    const response = await branchesApi.getBranchesByState(state.id);                    console.log(`Branches API response for state ${state.name}:`, response);
                    
                    // Handle the TransformInterceptor format: { data: [...], timestamp: ..., path: ... }
                    const branches = response.data || response || [];
                    console.log(`Processed branches for state ${state.name}:`, branches);
                    
                    if (Array.isArray(branches) && branches.length > 0) {
                        // Add state header
                        const stateHeader = document.createElement('h6');
                        stateHeader.className = 'mt-3 mb-2';
                        stateHeader.textContent = state.name;
                        branchCheckboxes.appendChild(stateHeader);
                          // Add branch checkboxes
                        branches.forEach(branch => {
                            const branchId = `branch-${branch._id}`;
                            const checkboxDiv = document.createElement('div');
                            checkboxDiv.className = 'form-check';
                            checkboxDiv.innerHTML = `
                                <input class="form-check-input branch-checkbox" type="checkbox" value="${branch._id}" 
                                    id="${branchId}" name="branches" data-state="${state.id}" data-branch-name="${branch.name}">
                                <label class="form-check-label" for="${branchId}">
                                    ${branch.name}
                                </label>
                            `;
                            branchCheckboxes.appendChild(checkboxDiv);                            // Add event listener to update bus pickup sections when branch selection changes
                            const checkbox = checkboxDiv.querySelector('.branch-checkbox');
                            checkbox.addEventListener('change', updateBusPickupSections);
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
            }            // Update bus pickup sections when branches change
            await updateBusPickupSections();
        }// Function to load pickup stations for a specific container
        async function loadPickupStationsForContainer(containerElement, selectedBranches, pickupIndex) {
            if (!containerElement || !selectedBranches || selectedBranches.length === 0) {
                containerElement.innerHTML = '<div class="text-muted text-center py-2">No branches selected</div>';
                return;
            }

            try {
                // Show loading state
                const loadingDiv = containerElement.querySelector('.pickup-stations-loading');
                if (loadingDiv) {
                    loadingDiv.style.display = 'block';
                }
                
                // Get all pickup stations for selected branches
                const allPickupStations = [];
                for (const branch of selectedBranches) {
                    try {
                        const response = await pickupStationsApi.getPickupStationsByBranch(branch.id);
                        const pickupStations = response.data || response || [];
                        
                        // Add branch name to each pickup station for display
                        pickupStations.forEach(station => {
                            station.branchName = branch.name;
                            allPickupStations.push(station);
                        });
                    } catch (error) {
                        console.error(`Failed to load pickup stations for branch ${branch.name}:`, error);
                    }
                }

                // Clear the container and populate with checkboxes
                containerElement.innerHTML = '';
                
                if (allPickupStations.length === 0) {
                    containerElement.innerHTML = `
                        <div class="text-muted text-center py-2">
                            <p class="mb-2">No pickup stations available</p>
                            <button type="button" class="btn btn-sm btn-outline-primary create-pickup-station" data-pickup-index="${pickupIndex}">
                                <i class="bi bi-plus"></i> Create New Pickup Station
                            </button>
                        </div>
                    `;
                    
                    // Add event listener for create button
                    const createBtn = containerElement.querySelector('.create-pickup-station');
                    if (createBtn) {
                        createBtn.addEventListener('click', () => {
                            handleCreateNewPickupStation(containerElement, selectedBranches, pickupIndex);
                        });
                    }
                } else {
                    // Group by branch for better UX
                    const branchGroups = {};
                    allPickupStations.forEach(station => {
                        const branchName = station.branchName || 'Unknown Branch';
                        if (!branchGroups[branchName]) {
                            branchGroups[branchName] = [];
                        }
                        branchGroups[branchName].push(station);
                    });

                    // Add checkboxes grouped by branch
                    Object.keys(branchGroups).forEach(branchName => {
                        if (Object.keys(branchGroups).length > 1) {
                            // Add branch header if multiple branches
                            const branchHeader = document.createElement('div');
                            branchHeader.className = 'fw-bold text-primary mt-2 mb-1';
                            branchHeader.textContent = branchName;
                            containerElement.appendChild(branchHeader);
                        }
                        
                        branchGroups[branchName].forEach(station => {
                            const checkboxDiv = document.createElement('div');
                            checkboxDiv.className = 'form-check';
                            checkboxDiv.innerHTML = `
                                <input class="form-check-input pickup-station-checkbox" type="checkbox" 
                                       value="${station._id}" id="pickup_${pickupIndex}_${station._id}" 
                                       name="busPickups[${pickupIndex}].stations">
                                <label class="form-check-label" for="pickup_${pickupIndex}_${station._id}">
                                    ${station.location}
                                </label>
                            `;
                            containerElement.appendChild(checkboxDiv);
                        });
                    });
                    
                    // Add option to create new pickup station
                    const createDiv = document.createElement('div');
                    createDiv.className = 'mt-2 pt-2 border-top';
                    createDiv.innerHTML = `
                        <button type="button" class="btn btn-sm btn-outline-primary create-pickup-station" data-pickup-index="${pickupIndex}">
                            <i class="bi bi-plus"></i> Create New Pickup Station
                        </button>
                    `;
                    containerElement.appendChild(createDiv);
                    
                    // Add event listener for create button
                    const createBtn = createDiv.querySelector('.create-pickup-station');
                    if (createBtn) {
                        createBtn.addEventListener('click', () => {
                            handleCreateNewPickupStation(containerElement, selectedBranches, pickupIndex);
                        });
                    }
                }

            } catch (error) {
                console.error('Failed to load pickup stations:', error);
                containerElement.innerHTML = '<div class="text-danger text-center py-2">Error loading pickup stations</div>';
                showToast('error', 'Failed to load pickup stations');
            }
        }        // Function to update bus pickup sections based on selected branches
        async function updateBusPickupSections() {
            const selectedBranches = [];
            document.querySelectorAll('.branch-checkbox:checked').forEach(checkbox => {
                selectedBranches.push({
                    id: checkbox.value,
                    name: checkbox.getAttribute('data-branch-name')
                });
            });

            const busPickupsContainer = document.getElementById('busPickupsContainer');
            if (!busPickupsContainer) return;

            // Clear existing pickup sections
            busPickupsContainer.innerHTML = '';

            if (selectedBranches.length === 0) {
                busPickupsContainer.innerHTML = '<div class="text-muted text-center py-3">Select branches to see pickup stations</div>';
                return;
            }

            // Create a pickup section for each selected branch
            for (let i = 0; i < selectedBranches.length; i++) {
                const branch = selectedBranches[i];
                await createBranchPickupSection(branch, i, busPickupsContainer);
            }
        }

        // Function to create a pickup section for a specific branch
        async function createBranchPickupSection(branch, index, container) {
            const pickupSection = document.createElement('div');
            pickupSection.className = 'branch-pickup-section mb-4 p-3 border rounded';
            pickupSection.innerHTML = `
                <div class="mb-3">
                    <h6 class="mb-2 text-primary">
                        <i class="bi bi-geo-alt"></i> ${branch.name} - Bus Pickup
                    </h6>
                    <p class="text-muted small mb-0">Select pickup stations and set departure details for this branch</p>
                </div>
                <div class="mb-3">
                    <label class="form-label">Pickup Stations* (Select multiple stations where buses will be available)</label>
                    <div class="pickup-stations-container border rounded p-2" style="max-height: 200px; overflow-y: auto;">
                        <div class="pickup-stations-loading text-center py-2">
                            <small class="text-muted">Loading pickup stations for ${branch.name}...</small>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label">Departure Time*</label>
                        <input type="datetime-local" class="form-control" name="branchPickups[${index}].departureTime" required>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label">Maximum Capacity (Total for all selected stations)</label>
                        <input type="number" class="form-control" name="branchPickups[${index}].maxCapacity" min="1" value="50">
                    </div>
                </div>
                <input type="hidden" name="branchPickups[${index}].branchId" value="${branch.id}">
                <input type="hidden" name="branchPickups[${index}].branchName" value="${branch.name}">
            `;

            container.appendChild(pickupSection);

            // Load pickup stations for this branch
            const pickupContainer = pickupSection.querySelector('.pickup-stations-container');
            await loadPickupStationsForBranch(pickupContainer, branch, index);

            // Prevent Enter key from submitting in new inputs
            const newInputs = pickupSection.querySelectorAll('input');
            newInputs.forEach(input => {
                input.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
                        e.preventDefault();
                        return false;
                    }
                });
            });
        }

        // Function to load pickup stations for a specific branch
        async function loadPickupStationsForBranch(containerElement, branch, branchIndex) {
            if (!containerElement || !branch) {
                containerElement.innerHTML = '<div class="text-muted text-center py-2">No branch selected</div>';
                return;
            }

            try {
                // Show loading state
                const loadingDiv = containerElement.querySelector('.pickup-stations-loading');
                if (loadingDiv) {
                    loadingDiv.style.display = 'block';
                }

                // Get pickup stations for this branch
                const response = await pickupStationsApi.getPickupStationsByBranch(branch.id);
                const pickupStations = response.data || response || [];

                // Clear the container and populate with checkboxes
                containerElement.innerHTML = '';

                if (pickupStations.length === 0) {
                    containerElement.innerHTML = `
                        <div class="text-muted text-center py-2">
                            <p class="mb-2">No pickup stations available for ${branch.name}</p>
                            <button type="button" class="btn btn-sm btn-outline-primary create-pickup-station" data-branch-id="${branch.id}" data-branch-name="${branch.name}" data-branch-index="${branchIndex}">
                                <i class="bi bi-plus"></i> Create New Pickup Station
                            </button>
                        </div>
                    `;

                    // Add event listener for create button
                    const createBtn = containerElement.querySelector('.create-pickup-station');
                    if (createBtn) {
                        createBtn.addEventListener('click', () => {
                            handleCreateNewPickupStationForBranch(containerElement, branch, branchIndex);
                        });
                    }
                } else {
                    // Add checkboxes for each pickup station
                    pickupStations.forEach(station => {
                        const checkboxDiv = document.createElement('div');
                        checkboxDiv.className = 'form-check';
                        checkboxDiv.innerHTML = `
                            <input class="form-check-input pickup-station-checkbox" type="checkbox" 
                                   value="${station._id}" id="branch_${branchIndex}_station_${station._id}" 
                                   name="branchPickups[${branchIndex}].stations">
                            <label class="form-check-label" for="branch_${branchIndex}_station_${station._id}">
                                ${station.location}
                            </label>
                        `;
                        containerElement.appendChild(checkboxDiv);
                    });

                    // Add option to create new pickup station
                    const createDiv = document.createElement('div');
                    createDiv.className = 'mt-2 pt-2 border-top';
                    createDiv.innerHTML = `
                        <button type="button" class="btn btn-sm btn-outline-primary create-pickup-station" data-branch-id="${branch.id}" data-branch-name="${branch.name}" data-branch-index="${branchIndex}">
                            <i class="bi bi-plus"></i> Create New Pickup Station
                        </button>
                    `;
                    containerElement.appendChild(createDiv);

                    // Add event listener for create button
                    const createBtn = createDiv.querySelector('.create-pickup-station');
                    if (createBtn) {
                        createBtn.addEventListener('click', () => {
                            handleCreateNewPickupStationForBranch(containerElement, branch, branchIndex);
                        });
                    }
                }

            } catch (error) {
                console.error(`Failed to load pickup stations for branch ${branch.name}:`, error);
                containerElement.innerHTML = '<div class="text-danger text-center py-2">Error loading pickup stations</div>';
                showToast('error', `Failed to load pickup stations for ${branch.name}`);
            }
        }
            // Initialize bus pickups container
        const busPickupsContainer = document.getElementById('busPickupsContainer');
        if (busPickupsContainer) {
            busPickupsContainer.innerHTML = '<div class="text-muted text-center py-3">Select branches to see pickup stations</div>';
        }
        
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
                  // Validate states and branches
                if (selectedStates.length === 0) {
                    validationErrors.push('Please select at least one state for the event');
                }
                
                if (selectedBranches.length === 0) {
                    validationErrors.push('Please select at least one branch for the event');
                }
                  // Validate date fields
                const isoEventDate = toFullISOString(formData.date);
                if (!isoEventDate) {
                    validationErrors.push('Event date is missing or invalid. Please select a valid date and time.');
                }
                
                // Validate pickup departure times for both old and new formats
                if (formData.branchPickups && Array.isArray(formData.branchPickups)) {
                    formData.branchPickups.forEach((pickup, idx) => {
                        const isoPickup = toFullISOString(pickup.departureTime);
                        if (!isoPickup) {
                            validationErrors.push(`Branch pickup ${idx + 1} departure time is missing or invalid. Please select a valid date and time.`);
                        }
                    });
                } else if (formData.busPickups && Array.isArray(formData.busPickups)) {
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
                        
                        // Handle both old and new response formats
                        if (result.data && result.data.publicId) {
                            // New Cloudinary format
                            bannerImageName = result.data.publicId;
                        } else if (result.filename) {
                            // Legacy format or backward compatibility
                            bannerImageName = result.filename;
                        } else {
                            throw new Error('Invalid response format from upload endpoint');
                        }
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
                const eventData = formatEventData(formData);
                
                // Step 7: Submit the event data to the server
                const createdEvent = await eventsApi.createEvent(eventData);
                
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
        pickupStations: [],
        bannerImage: formData.bannerImage || null
    };    // Handle both old busPickups format and new branchPickups format
    if (formData.branchPickups && Array.isArray(formData.branchPickups)) {
        eventData.pickupStations = [];
        
        formData.branchPickups.forEach(branchPickup => {
            // Get all selected stations for this branch pickup
            const selectedStations = branchPickup.stations || [];
            
            // Create a pickup station entry for each selected station
            selectedStations.forEach(stationId => {
                eventData.pickupStations.push({
                    pickupStationId: stationId,
                    departureTime: toFullISOString(branchPickup.departureTime),
                    maxCapacity: branchPickup.maxCapacity ? parseInt(branchPickup.maxCapacity) : undefined,
                    currentCount: 0
                });
            });
        });
    } else if (formData.busPickups && Array.isArray(formData.busPickups)) {
        // Fallback for old format
        eventData.pickupStations = [];
        
        formData.busPickups.forEach(pickup => {
            // Get all selected stations for this pickup
            const selectedStations = pickup.stations || [];
            
            // Create a pickup station entry for each selected station
            selectedStations.forEach(stationId => {
                eventData.pickupStations.push({
                    pickupStationId: stationId,
                    departureTime: toFullISOString(pickup.departureTime),
                    maxCapacity: pickup.maxCapacity ? parseInt(pickup.maxCapacity) : undefined,
                    currentCount: 0
                });
            });
        });
    }

    return eventData;
}

// Function to handle creating new pickup stations
        async function handleCreateNewPickupStation(containerElement, selectedBranches, pickupIndex) {
            try {
                // Show prompt for new pickup station location
                const location = prompt('Enter the new pickup station location:');
                if (!location || location.trim() === '') {
                    return;
                }

                // Show branch selection if multiple branches
                let selectedBranchId;
                if (selectedBranches.length === 1) {
                    selectedBranchId = selectedBranches[0].id;
                } else {
                    const branchNames = selectedBranches.map(b => `${b.name} (${b.id})`).join('\n');
                    const branchChoice = prompt(`Multiple branches selected. Enter the branch ID where you want to create this pickup station:\n\n${branchNames}\n\nEnter branch ID:`);
                    
                    const matchingBranch = selectedBranches.find(b => b.id === branchChoice || b.name === branchChoice);
                    if (!matchingBranch) {
                        showToast('error', 'Invalid branch selection');
                        return;
                    }
                    selectedBranchId = matchingBranch.id;
                }

                // Create the pickup station
                const newPickupStationData = {
                    location: location.trim(),
                    branchId: selectedBranchId,
                    isActive: true
                };

                showToast('info', 'Creating new pickup station...');
                const response = await pickupStationsApi.createPickupStation(newPickupStationData);
                const newStation = response.data || response;

                showToast('success', 'Pickup station created successfully!');

                // Refresh the container to include the new station
                await loadPickupStationsForContainer(containerElement, selectedBranches, pickupIndex);

            } catch (error) {
                console.error('Failed to create pickup station:', error);
                let errorMessage = 'Failed to create pickup station';
                
                if (error.message && error.message.includes('already exists')) {
                    errorMessage = 'A pickup station with this location already exists in the selected branch';
                } else if (error.response && error.response.data && error.response.data.message) {
                    errorMessage = error.response.data.message;
                }
                
                showToast('error', errorMessage);
            }
        }

        // Function to handle creating new pickup stations for a specific branch
        async function handleCreateNewPickupStationForBranch(containerElement, branch, branchIndex) {
            try {
                // Show prompt for new pickup station location
                const location = prompt(`Enter the new pickup station location for ${branch.name}:`);
                if (!location || location.trim() === '') {
                    return;
                }

                // Create the pickup station for the specific branch
                const newPickupStationData = {
                    location: location.trim(),
                    branchId: branch.id,
                    isActive: true
                };

                showToast('info', 'Creating new pickup station...');
                const response = await pickupStationsApi.createPickupStation(newPickupStationData);
                const newStation = response.data || response;

                showToast('success', 'Pickup station created successfully!');

                // Refresh the container to include the new station
                await loadPickupStationsForBranch(containerElement, branch, branchIndex);

            } catch (error) {
                console.error('Failed to create pickup station:', error);
                let errorMessage = 'Failed to create pickup station';
                
                if (error.message && error.message.includes('already exists')) {
                    errorMessage = 'A pickup station with this location already exists in this branch';
                } else if (error.response && error.response.data && error.response.data.message) {
                    errorMessage = error.response.data.message;
                }
                
                showToast('error', errorMessage);
            }
        }


