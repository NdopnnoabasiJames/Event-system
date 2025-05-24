// Events Management Module
// This module handles all event-related functionality for the admin dashboard

// Import the states and branches data for event creation
import { statesAndBranches } from './states-branches.js';
// Import form utility functions
import { getFormDataAsObject, toFullISOString } from '../utils/form-utils.js';

/**
 * Load and display events data in the admin dashboard
 */
export async function loadEventsData() {
    try {
        console.log('Fetching events from server...');
        const response = await eventsApi.getAllEvents();
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
        }        
        
        // Setup state selection
        const stateSelectionContainer = document.getElementById('stateSelectionContainer');
        if (stateSelectionContainer) {
            // Clear existing content
            stateSelectionContainer.innerHTML = '';
            
            // Create state checkboxes
            const stateCheckboxesDiv = document.createElement('div');
            stateCheckboxesDiv.className = 'state-checkboxes mb-3';
            stateCheckboxesDiv.innerHTML = '<label class="form-label fw-bold mb-2">Select States for Event*</label>';
            
            // Add checkboxes for each state
            for (const state of Object.keys(statesAndBranches)) {
                const checkboxDiv = document.createElement('div');
                checkboxDiv.className = 'form-check';
                checkboxDiv.innerHTML = `
                    <input class="form-check-input state-checkbox" type="checkbox" value="${state}" id="state-${state.toLowerCase().replace(/\s+/g, '-')}" name="selectedStates">
                    <label class="form-check-label" for="state-${state.toLowerCase().replace(/\s+/g, '-')}">
                        ${state}
                    </label>
                `;
                stateCheckboxesDiv.appendChild(checkboxDiv);
            }
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
        }
        
        // Function to update branch selection based on selected states
        function updateBranchSelection() {
            const selectedStates = [];
            const stateCheckboxes = document.querySelectorAll('.state-checkbox:checked');
            stateCheckboxes.forEach(checkbox => {
                selectedStates.push(checkbox.value);
            });
            
            const branchCheckboxes = document.getElementById('branchCheckboxes');
            if (!branchCheckboxes) return;
            
            // Clear existing branch checkboxes
            branchCheckboxes.innerHTML = '';
            
            // Create branch checkboxes for each selected state
            selectedStates.forEach(state => {
                // Add state header
                const stateHeader = document.createElement('h6');
                stateHeader.className = 'mt-3 mb-2';
                stateHeader.textContent = state;
                branchCheckboxes.appendChild(stateHeader);
                
                // Add branch checkboxes
                if (statesAndBranches[state]) {
                    statesAndBranches[state].forEach(branch => {
                        const branchId = `${state}-${branch}`.toLowerCase().replace(/\s+/g, '-');
                        const checkboxDiv = document.createElement('div');
                        checkboxDiv.className = 'form-check';
                        checkboxDiv.innerHTML = `
                            <input class="form-check-input branch-checkbox" type="checkbox" value="${branch}" 
                                id="${branchId}" name="branches" data-state="${state}">
                            <label class="form-check-label" for="${branchId}">
                                ${branch}
                            </label>
                        `;
                        branchCheckboxes.appendChild(checkboxDiv);
                    });
                }
            });
            
            // Show or hide branch selection container based on whether states are selected
            const branchSelectionContainer = document.getElementById('branchSelectionContainer');
            if (branchSelectionContainer) {
                if (selectedStates.length > 0) {
                    branchSelectionContainer.classList.remove('d-none');
                } else {
                    branchSelectionContainer.classList.add('d-none');
                }
            }
        }
          
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
                document.querySelectorAll('.state-checkbox:checked').forEach(checkbox => {
                    selectedStates.push(checkbox.value);
                });
                
                // Group branches by state
                const selectedBranches = {};
                document.querySelectorAll('.branch-checkbox:checked').forEach(checkbox => {
                    const state = checkbox.getAttribute('data-state');
                    const branch = checkbox.value;
                    
                    if (!selectedBranches[state]) {
                        selectedBranches[state] = [];
                    }
                    
                    selectedBranches[state].push(branch);
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
                
                if (Object.keys(selectedBranches).length === 0) {
                    validationErrors.push('Please select at least one branch for the event');
                }
                
                // Validate that each selected state has at least one branch selected
                const statesWithoutBranches = selectedStates.filter(state => 
                    !selectedBranches[state] || selectedBranches[state].length === 0
                );
                
                if (statesWithoutBranches.length > 0) {
                    validationErrors.push(`Please select at least one branch for each selected state: ${statesWithoutBranches.join(', ')}`);
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
        date: toFullISOString(formData.date), // Use full ISO string
        states: formData.selectedStates || [],
        maxAttendees: formData.maxAttendees ? parseInt(formData.maxAttendees) : 100, // Default to 100 if not provided
        isActive: formData.isActive === 'true',
        branches: formData.selectedBranches || {}, // Send branches as object mapping states to branch arrays
        busPickups: [],
        bannerImage: formData.bannerImage || null // Include the banner image
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


