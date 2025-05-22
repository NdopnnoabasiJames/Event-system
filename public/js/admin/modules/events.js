import { getFormDataAsObject, toFullISOString } from './utils.js';
// Event-related functions for admin dashboard

// Load events data
async function loadEventsData() {
    try {
        const response = await eventsApi.getAllEvents();
        const events = Array.isArray(response) ? response : (response.data || []);
        
        const tableBody = document.getElementById('events-table-body');
        
        tableBody.innerHTML = '';
        
        if (!events || events.length === 0) {
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
                attendeesCountMap[eventId] = (attendeesCountMap[eventId] || 0) + 1;
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
            } else {
                statusBadge = '<span class="badge bg-success">Upcoming</span>';
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
                const eventId = button.getAttribute('data-event-id');
                const eventName = button.getAttribute('data-event-name');
                
                if (confirm(`Are you sure you want to delete the event "${eventName}"? This action cannot be undone.`)) {
                    try {
                        await eventsApi.deleteEvent(eventId);
                        showToast('success', `Event "${eventName}" deleted successfully`);
                        await loadEventsData();
                    } catch (error) {
                        showToast('error', `Failed to delete event: ${error.message || 'Unknown error'}`);
                    }
                }
            });
        });
    } catch (error) {
        showToast('error', 'Failed to load events data');
    }
}

// Setup event filter
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
        });
    } catch (error) {
        // Silently handle event filter setup errors
    }
}

// Format event data for API submission
function formatEventData(formData) {
    const eventData = {
        name: formData.name,
        date: toFullISOString(formData.date), // Use full ISO string
        state: formData.state,
        maxAttendees: formData.maxAttendees ? parseInt(formData.maxAttendees) : undefined,
        isActive: formData.isActive === 'true',
        branches: formData.branches || [],
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

// Load attendees data
async function loadAttendeesData() {
    try {
        const eventId = document.getElementById('event-filter').value;
        const endpoint = eventId ? `/attendees?eventId=${eventId}` : '/attendees';
        
        const response = await apiCall(endpoint, 'GET', null, auth.getToken());
        const attendees = Array.isArray(response) ? response : (response.data || []);
        
        const tableBody = document.getElementById('attendees-table-body');
        
        tableBody.innerHTML = '';
        
        if (!attendees || attendees.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No attendees found</td></tr>';
            return;
        }
        
        // Sort attendees by registration date (newest first)
        attendees.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        for (const attendee of attendees) {
            const row = document.createElement('tr');
            
            // Format date
            const registrationDate = new Date(attendee.createdAt);
            const formattedDate = registrationDate.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
            
            // Get marketer name
            const marketerName = attendee.registeredBy?.name || 'System';            
            
            // Get event name, handling both populated objects and string IDs
            let eventName = 'Unknown Event';
            if (attendee.event) {
                if (typeof attendee.event === 'object' && attendee.event.name) {
                    eventName = attendee.event.name;
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
        }
    } catch (error) {
        showToast('error', 'Failed to load attendees data');
    }
}

// Setup event creation handlers
async function setupEventCreationHandlers() {
    try {
        console.log('Setting up event creation handlers');
        // Setup banner image preview functionality
        const eventBanner = document.getElementById('eventBanner');
        const bannerPreviewContainer = document.getElementById('bannerPreviewContainer');
        const bannerPreview = document.getElementById('bannerPreview');
        const removeBannerBtn = document.getElementById('removeBannerBtn');
        
        if (eventBanner && bannerPreviewContainer && bannerPreview && removeBannerBtn) {
            console.log('Setting up banner preview functionality');
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

        // Call helper functions that handle specific parts of the form setup
        console.log('Setting up branch handlers');
        setupBranchHandlers();
        
        console.log('Setting up bus pickup handlers');
        setupBusPickupHandlers();
        
        console.log('Setting up event form submission');
        setupEventFormSubmission();
    } catch (error) {
        console.error('Error in setupEventCreationHandlers:', error);
        showToast('error', 'Failed to set up event creation functionality');
    }
}

// Initialization flags to prevent duplicate event listeners
let branchHandlerInitialized = false;
let busPickupHandlerInitialized = false;
let eventFormHandlerInitialized = false;

// Setup branch handlers
function setupBranchHandlers() {
    if (branchHandlerInitialized) return;
    branchHandlerInitialized = true;
    
    // Add Branch button handler
    const addBranchBtn = document.getElementById('addBranchBtn');
    console.log('Add Branch button found:', !!addBranchBtn);
    if (!addBranchBtn) {
        console.warn('Add Branch button not found');
        return;
    }
    
    let branchCount = 1;
      
    addBranchBtn.addEventListener('click', () => {
        const branchesContainer = document.getElementById('branchesContainer');
        if (!branchesContainer) {
            return;
        }
        
        const newBranch = document.createElement('div');
        newBranch.className = 'branch-entry mb-3 p-3 border rounded';
        newBranch.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <h6 class="mb-0">Branch ${branchCount + 1}</h6>
                <button type="button" class="btn btn-sm btn-outline-danger remove-branch">
                    <i class="bi bi-trash"></i> Remove
                </button>
            </div>
            <div class="mb-2">
                <label class="form-label">Branch Name*</label>
                <input type="text" class="form-control" name="branches[${branchCount}].name" required>
            </div>
            <div class="mb-2">
                <label class="form-label">Location*</label>
                <input type="text" class="form-control" name="branches[${branchCount}].location" required>
            </div>
            <div class="mb-2">
                <label class="form-label">Manager Name</label>
                <input type="text" class="form-control" name="branches[${branchCount}].manager">
            </div>
            <div class="mb-2">
                <label class="form-label">Contact</label>
                <input type="tel" class="form-control" name="branches[${branchCount}].contact">
            </div>
        `;
        
        branchesContainer.appendChild(newBranch);
        branchCount++;
        
        // Add event listener to remove button
        const removeBtn = newBranch.querySelector('.remove-branch');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                branchesContainer.removeChild(newBranch);
            });
        }
    });
}

// Setup bus pickup handlers
function setupBusPickupHandlers() {
    if (busPickupHandlerInitialized) return;
    busPickupHandlerInitialized = true;
    
    // Add Bus Pickup button handler
    const addBusPickupBtn = document.getElementById('addBusPickupBtn');
    console.log('Add Bus Pickup button found:', !!addBusPickupBtn);
    if (!addBusPickupBtn) {
        console.warn('Add Bus Pickup button not found');
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
    });
}

// Setup event form submission
function setupEventFormSubmission() {
    if (eventFormHandlerInitialized) return;
    eventFormHandlerInitialized = true;
    
    // Form submission handler
    const saveEventBtn = document.getElementById('saveEventBtn');
    if (!saveEventBtn) {
        return;
    }
    
    saveEventBtn.addEventListener('click', async () => {
        try {
            const form = document.getElementById('createEventForm');
            if (!form) {
                return;
            }
            
            // Basic validation
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }
            
            // Handle banner image upload
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
                    // Don't set Content-Type header for FormData uploads
                    const token = auth.getToken();
                    
                    // Use the apiCall utility for consistency, but we need direct fetch for FormData
                    const uploadUrl = `${API_BASE_URL}/upload/event-banner`;
                    
                    const response = await fetch(uploadUrl, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        },
                        body: uploadFormData,
                        // Include credentials for cross-origin requests
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
              
            // Get form data and convert to appropriate format
            const formData = getFormDataAsObject(form);
            if (bannerImageName) {
                formData.bannerImage = bannerImageName;
            }
            
            const isoEventDate = toFullISOString(formData.date);
            let hasInvalidDate = false;
            if (!isoEventDate) {
                showToast('error', 'Event date is missing or invalid. Please select a valid date and time.');
                hasInvalidDate = true;
            }
            
            if (formData.busPickups && Array.isArray(formData.busPickups)) {
                formData.busPickups.forEach((pickup, idx) => {
                    const isoPickup = toFullISOString(pickup.departureTime);
                    if (!isoPickup) {
                        showToast('error', `Bus pickup ${idx + 1} departure time is missing or invalid. Please select a valid date and time.`);
                        hasInvalidDate = true;
                    }
                });
            }
            
            if (hasInvalidDate) return;
            const eventData = formatEventData(formData);

            // Defensive validation for ISO 8601 strings
            if (!eventData.date || isNaN(Date.parse(eventData.date))) {
                showToast('error', 'Event date is missing or invalid. Please select a valid date and time.');
                return;
            }
            if (eventData.busPickups && Array.isArray(eventData.busPickups)) {
                for (let i = 0; i < eventData.busPickups.length; i++) {
                    const pickup = eventData.busPickups[i];
                    if (!pickup.departureTime || isNaN(Date.parse(pickup.departureTime))) {
                        showToast('error', `Bus pickup ${i + 1} departure time is missing or invalid. Please select a valid date and time.`);
                        return;
                    }
                }
            }
            
            // Create the event
            await eventsApi.createEvent(eventData);
            
            // Show success message
            showToast('success', 'Event created successfully!');
            
            // Close the modal and reload events data
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
}

// Export all functions that are used elsewhere
export {
  loadEventsData,
  setupEventFilter,
  loadAttendeesData,
  setupEventCreationHandlers,
  formatEventData,
  setupBranchHandlers,
  setupBusPickupHandlers,
  setupEventFormSubmission
};
