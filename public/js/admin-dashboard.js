// Admin Dashboard JavaScript

// Import marketer management functions
import { loadTopMarketers, showMarketerDetails, setupMarketerFilter } from './modules/marketer-manager.js';

// Define states and branches data structure
const statesAndBranches = {
    'Lagos': ['Lagos Island', 'Lagos Mainland', 'Ikeja', 'Lekki', 'Ajah', 'Ikorodu', 'Epe'],
    'Abuja': ['Central Area', 'Maitama', 'Wuse', 'Garki', 'Asokoro', 'Gwarinpa'],
    'Rivers': ['Port Harcourt', 'Obio/Akpor', 'Eleme', 'Oyigbo'],
    'Kano': ['Kano Municipal', 'Fagge', 'Dala', 'Gwale'],
    'Oyo': ['Ibadan North', 'Ibadan South', 'Ogbomosho', 'Oyo East'],
    'Kaduna': ['Kaduna North', 'Kaduna South', 'Zaria', 'Kafanchan'],
    'Delta': ['Warri', 'Asaba', 'Ughelli', 'Sapele'],
    'Enugu': ['Enugu North', 'Enugu South', 'Nsukka', 'Udi'],
    'Anambra': ['Awka', 'Onitsha', 'Nnewi', 'Ekwulobia'],
    'Imo': ['Owerri', 'Orlu', 'Okigwe', 'Mbaise']
};

document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is authenticated
    if (!auth.isAuthenticated()) {
        showToast('error', 'Please login to access the admin dashboard');
        window.location.href = 'login.html';
        return;
    }

    // Check if user is an admin
    const user = auth.getUser();
      if (user.role !== 'admin') {
        showToast('error', 'Only administrators can access this page');
        
        // Redirect to appropriate dashboard based on role
        if (user.role === 'marketer') {
            window.location.href = 'marketer-dashboard.html';
        } else {
            window.location.href = '../index.html';
        }
        return;
    }    try {
        // Update auth state
        updateAuthState();
        
        // Load top marketers
        await loadTopMarketers();
        
        // Load events data
        await loadEventsData();
        
        // Setup event filter
        await setupEventFilter();
        
        // Load initial attendees data
        await loadAttendeesData();

        // Load concierge data
        await loadConciergeRequests();
        await loadApprovedConcierges();
          
        // Add event listener for event filter
        const eventFilter = document.getElementById('event-filter');
        if (eventFilter) {
            eventFilter.addEventListener('change', loadAttendeesData);
        }

        // Populate and add event listener for marketer filter
        await setupMarketerFilter();
        const marketerFilter = document.getElementById('marketer-filter');
        if (marketerFilter) {
            marketerFilter.addEventListener('change', loadAttendeesData);
        }
          
        // Setup event creation handlers with better error handling
        try {
            await setupEventCreationHandlers();
        } catch (error) {
            // We don't need to show another toast here since setupEventCreationHandlers already does
        }    } catch (error) {
        showToast('error', 'Failed to load dashboard data');
    }
});

async function loadEventsData() {
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

async function setupEventFilter() {
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

async function loadAttendeesData() {
    try {
        // Get filter values
        const eventId = document.getElementById('event-filter').value;
        const marketerId = document.getElementById('marketer-filter').value;
        
        // Construct the endpoint with query parameters
        let endpoint = '/attendees';
        const queryParams = [];
        
        if (eventId) {
            queryParams.push(`eventId=${eventId}`);
        }
        
        if (queryParams.length > 0) {
            endpoint += '?' + queryParams.join('&');
        }
        
        const response = await apiCall(endpoint, 'GET', null, auth.getToken());
        const attendees = Array.isArray(response) ? response : (response.data || []);
        
        const tableBody = document.getElementById('attendees-table-body');
        
        tableBody.innerHTML = '';
        
        if (!attendees || attendees.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No attendees found</td></tr>';
            return;
        }
        
        // Filter by marketer if selected
        let filteredAttendees = attendees;
        if (marketerId) {
            filteredAttendees = attendees.filter(attendee => {
                // Check if registeredBy exists and matches the selected marketer ID
                const attendeeMarketerId = attendee.registeredBy?._id || 
                                          (typeof attendee.registeredBy === 'string' ? attendee.registeredBy : null);
                return attendeeMarketerId === marketerId;
            });
            
            // Update the table if no attendees match the marketer filter
            if (filteredAttendees.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No attendees found for this marketer</td></tr>';
                return;
            }
        }
        
        // Sort attendees by registration date (newest first)
        filteredAttendees.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          for (const attendee of filteredAttendees) {
            const row = document.createElement('tr');
            
            // Format date
            const registrationDate = new Date(attendee.createdAt);
            const formattedDate = registrationDate.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
            
            // Get marketer name
            const marketerName = attendee.registeredBy?.name || 'System';            // Get event name, handling both populated objects and string IDs
            let eventName = 'Unknown Event';
            if (attendee.event) {
                if (typeof attendee.event === 'object' && attendee.event.name) {
                    eventName = attendee.event.name;
                } else if (typeof attendee.event === 'string') {
                    eventName = 'Event ID: ' + attendee.event;
                }
            }
            
            row.innerHTML = `
                <td>${attendee.name}</td>
                <td>${attendee.phone || 'Not provided'}</td>
                <td>${eventName}</td>
                <td>${marketerName}</td>
                <td>${attendee.transportPreference === 'bus' ? 
                    `<span class="badge bg-success">Bus (${attendee.busPickup?.location || 'N/A'})</span>` : 
                    '<span class="badge bg-secondary">Private</span>'}
                </td>
                <td>${formattedDate}</td>
                <td>${attendee.checkedIn ? 
                    '<span class="badge bg-success">Checked In</span>' : 
                    '<span class="badge bg-warning text-dark">Not Checked In</span>'}
                </td>
            `;
            
            tableBody.appendChild(row);
        }    } catch (error) {
        showToast('error', 'Failed to load attendees data');
    }
}

async function setupEventCreationHandlers() {
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

async function loadConciergeRequests() {
    try {
        const response = await apiCall('/events/concierge-requests/pending', 'GET', null, auth.getToken());
        const requests = Array.isArray(response) ? response : (response.data || []);
        const tableBody = document.getElementById('concierge-requests-table-body');
        tableBody.innerHTML = '';
        if (!requests.length) {
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No pending requests.</td></tr>';
            return;
        }
        for (const req of requests) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${req.eventName}</td>
                <td>${new Date(req.eventDate).toLocaleDateString()}</td>
                <td>${req.user?.name || 'N/A'}</td>
                <td>${req.user?.email || 'N/A'}</td>
                <td>${req.user?.phone || 'N/A'}</td>
                <td>${new Date(req.requestedAt).toLocaleString()}</td>
                <td>
                    <button class="btn btn-success btn-sm approve-concierge" data-event-id="${req.eventId}" data-request-id="${req.requestId}">Approve</button>
                    <button class="btn btn-danger btn-sm reject-concierge" data-event-id="${req.eventId}" data-request-id="${req.requestId}">Reject</button>
                </td>
            `;
            tableBody.appendChild(row);
        }
        document.querySelectorAll('.approve-concierge').forEach(btn => {
            btn.addEventListener('click', () => reviewConciergeRequest(btn, true));
        });
        document.querySelectorAll('.reject-concierge').forEach(btn => {
            btn.addEventListener('click', () => reviewConciergeRequest(btn, false));
        });
    } catch (error) {
        showToast('error', 'Failed to load concierge requests');
    }
}

async function reviewConciergeRequest(btn, approve) {
    const eventId = btn.getAttribute('data-event-id');
    const requestId = btn.getAttribute('data-request-id');
    try {
        await apiCall(`/events/${eventId}/concierge-requests/${requestId}/review`, 'POST', { approve }, auth.getToken());
        showToast('success', `Request ${approve ? 'approved' : 'rejected'}`);
        await loadConciergeRequests();
    } catch (error) {
        showToast('error', 'Failed to review request');
    }
}

// New function to load approved concierges
async function loadApprovedConcierges() {
    try {
        const response = await apiCall('/events/concierge-requests/approved', 'GET', null, auth.getToken());
        const approved = Array.isArray(response) ? response : (response.data || []);
        const tableBody = document.getElementById('approved-concierges-table-body');
        tableBody.innerHTML = '';
        if (!approved.length) {
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No approved concierges.</td></tr>';
            return;
        }
        // Deduplicate by eventId + userId (concierge)
        const deduped = new Set();
        for (const item of approved) {
            // Use eventId and userId as the unique key
            const eventId = item.eventId?.toString() || '';
            const userId = item.user?._id?.toString() || item.user?.id?.toString() || '';
            const key = eventId + '|' + userId;
            if (deduped.has(key)) continue;
            deduped.add(key);
            const row = document.createElement('tr');
            const link = `concierge-checkins.html?eventId=${encodeURIComponent(eventId)}&conciergeId=${encodeURIComponent(userId)}`;
            row.innerHTML = `
                <td>${item.eventName}</td>
                <td>${new Date(item.eventDate).toLocaleDateString()}</td>
                <td>${item.user?.name || 'N/A'}</td>
                <td>${item.user?.email || 'N/A'}</td>
                <td>${item.reviewedAt ? new Date(item.reviewedAt).toLocaleString() : ''}</td>
            `;
            row.classList.add('table-row-link');
            row.style.cursor = 'pointer';
            row.addEventListener('click', () => {
                window.location.href = link;
            });            // Add row styling to indicate it's clickable
            row.classList.add('approved-concierge-row');
            tableBody.appendChild(row);
        }
    } catch (error) {
        showToast('error', 'Failed to load approved concierges');
    }
}

// Load both pending and approved when tab is shown
const conciergeTab = document.getElementById('concierge-requests-tab');
if (conciergeTab) {
    conciergeTab.addEventListener('shown.bs.tab', () => {
        loadConciergeRequests();
        loadApprovedConcierges();
    });
}

// Check if we need to activate the concierge tab on load (coming back from concierge-checkins.html)
document.addEventListener('DOMContentLoaded', () => {
    const activeTab = sessionStorage.getItem('activeAdminTab');
    if (activeTab === 'concierge-requests') {
        const conciergeTab = document.getElementById('concierge-requests-tab');
        if (conciergeTab) {
            const tabTrigger = new bootstrap.Tab(conciergeTab);
            tabTrigger.show();
            sessionStorage.removeItem('activeAdminTab'); // Clear after use
        }
    }
});

// Helper function to validate dates
function isValidDate(dateString) {
    if (!dateString) return false;
    
    try {
        const date = new Date(dateString);
        return !isNaN(date.getTime());
    } catch (error) {
        return false;
    }
}

function getFormDataAsObject(form) {
    const formData = new FormData(form);
    const data = {};
    
    for (const [key, value] of formData.entries()) {
        // Handle nested properties using bracket notation (e.g., branches[0].name)
        if (key.includes('[') && key.includes('].')) {
            const mainKey = key.substring(0, key.indexOf('['));
            const index = parseInt(key.substring(key.indexOf('[') + 1, key.indexOf(']')));
            const subKey = key.substring(key.indexOf('].') + 2);
            
            if (!data[mainKey]) {
                data[mainKey] = [];
            }
            
            if (!data[mainKey][index]) {
                data[mainKey][index] = {};
            }
            
            data[mainKey][index][subKey] = value;
        } else {
            data[key] = value;
        }
    }
    
    return data;
}

// Helper to convert any value to full ISO 8601 string (yyyy-mm-ddTHH:MM:SS.sssZ)
function toFullISOString(val) {
    if (!val) return undefined;
    // If format is dd/mm/yyyy, convert to yyyy-mm-dd
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
        const [day, month, year] = val.split('/');
        val = `${year}-${month}-${day}`;
    }
    // If format is yyyy-mm-ddTHH:MM (from datetime-local), treat as local and convert to ISO
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)) {
        // To ensure local time, split and use Date parts
        const [datePart, timePart] = val.split('T');
        const [year, month, day] = datePart.split('-');
        const [hour, minute] = timePart.split(':');
        const d = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
        return d.toISOString();
    }
    // Fallback: try to parse and format as ISO string
    const d = new Date(val);
    if (isNaN(d.getTime())) return undefined;
    return d.toISOString();
}

// Helper to convert any value to ISO date string (YYYY-MM-DD)
function toISODateString(val) {
    if (!val) return undefined;
    // If format is dd/mm/yyyy, convert to yyyy-mm-dd
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
        const [day, month, year] = val.split('/');
        return `${year}-${month}-${day}`;
    }
    // If format is yyyy-mm-ddTHH:MM (from datetime-local), extract date part
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)) {
        return val.split('T')[0];
    }
    // If already yyyy-mm-dd, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
        return val;
    }
    // Fallback: try to parse and format as yyyy-mm-dd
    const d = new Date(val);
    if (isNaN(d.getTime())) return undefined;
    return d.toISOString().split('T')[0];
}

function formatEventData(formData) {
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
    }    return eventData;
}
