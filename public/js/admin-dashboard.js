// Admin Dashboard JavaScript
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
    }

    try {
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
          // Add event listener for event filter
        const eventFilter = document.getElementById('event-filter');
        if (eventFilter) {
            eventFilter.addEventListener('change', loadAttendeesData);
        }
          // Setup event creation handlers with better error handling
        try {
            await setupEventCreationHandlers();
        } catch (error) {
            // We don't need to show another toast here since setupEventCreationHandlers already does
        }
    } catch (error) {
        showToast('error', 'Failed to load dashboard data');
    }
});

async function loadTopMarketers() {
    try {
        const response = await marketersApi.getTopMarketers();        const marketers = Array.isArray(response) ? response : (response.data || []);
        
        const tableBody = document.getElementById('marketers-table-body');
        const noMarketersMessage = document.getElementById('no-marketers');
        
        if (!marketers || marketers.length === 0) {
            tableBody.innerHTML = '';
            noMarketersMessage.classList.remove('d-none');
            return;
        }
        
        noMarketersMessage.classList.add('d-none');
        tableBody.innerHTML = '';
        
        marketers.forEach((item, index) => {
            // Ensure we have the marketer ID
            const marketerId = item.marketer.id || item.marketer._id;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${item.marketer.name}</td>
                <td>${item.marketer.email}</td>
                <td>${item.stats.totalAttendeesRegistered}</td>
                <td>${item.stats.eventsParticipated}</td>
                <td>
                    <button class="btn btn-sm btn-info view-marketer" data-marketer-id="${marketerId}">
                        <i class="bi bi-info-circle"></i> Details
                    </button>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
          // Add event listeners for marketer detail buttons
        document.querySelectorAll('.view-marketer').forEach(button => {
            button.addEventListener('click', (e) => {
                const marketerId = e.currentTarget.getAttribute('data-marketer-id');
                showMarketerDetails(marketerId);
            });
        });
    } catch (error) {
        showToast('error', 'Failed to load marketers data');
    }
}

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
                    <a href="event-details.html?id=${eventId}" class="btn btn-sm btn-primary">
                        <i class="bi bi-eye"></i> View
                    </a>
                </td>
            `;
            
            tableBody.appendChild(row);
        }    } catch (error) {
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
              row.innerHTML = `
                <td>${attendee.name}</td>
                <td>${attendee.phone || 'Not provided'}</td>
                <td>${attendee.event.name}</td>
                <td>${marketerName}</td>
                <td>${attendee.transportPreference === 'bus' ? 
                    `<span class="badge bg-success">Bus (${attendee.busPickup?.location || 'N/A'})</span>` : 
                    '<span class="badge bg-secondary">Private</span>'}
                </td>
                <td>${formattedDate}</td>
            `;
            
            tableBody.appendChild(row);
        }    } catch (error) {
        showToast('error', 'Failed to load attendees data');
    }
}

async function showMarketerDetails(marketerId) {
    try {
        // Get marketer user info
        const marketerResponse = await apiCall(`/users/${marketerId}`, 'GET', null, auth.getToken());
        
        // Handle different response formats
        const marketer = marketerResponse.data || marketerResponse;
        
        if (!marketer) {
            throw new Error('Could not retrieve marketer information');
        }
          // Get marketer performance stats
        const statsResponse = await apiCall(`/marketers/analytics/performance?marketerId=${marketerId}`, 'GET', null, auth.getToken());
        
        // Handle different response formats
        const stats = statsResponse.data || statsResponse;
        
        // Update modal content with marketer info and stats
        document.getElementById('marketer-name').textContent = marketer.name || 'No name available';
        document.getElementById('marketer-email').textContent = marketer.email || 'No email available';
        document.getElementById('marketer-total-attendees').textContent = stats?.totalAttendeesRegistered || 0;
        document.getElementById('marketer-events').textContent = stats?.eventsParticipated || 0;
          // Get marketer events
        const eventsResponse = await apiCall(`/marketers/events/my?marketerId=${marketerId}`, 'GET', null, auth.getToken());
        
        // Extract events data handling different response formats
        // First check if response is an array directly
        let eventsArray = Array.isArray(eventsResponse) ? eventsResponse : null;
        
        // If not an array directly, check for data property that might be an array
        if (!eventsArray && eventsResponse && eventsResponse.data) {
            eventsArray = Array.isArray(eventsResponse.data) ? eventsResponse.data : null;
        }
        
        // If we still don't have an array, check for events property
        if (!eventsArray && eventsResponse && eventsResponse.events) {
            eventsArray = Array.isArray(eventsResponse.events) ? eventsResponse.events : null;
        }
        
        // Final fallback - if we still don't have an array, create an empty one
        if (!eventsArray) {
            eventsArray = [];
        }
        
        // Populate events table
        const eventsTable = document.getElementById('marketer-events-table');
        eventsTable.innerHTML = '';
        
        if (eventsArray.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="3" class="text-center">No events found</td>';
            eventsTable.appendChild(row);
        } else {
            for (const event of eventsArray) {
                try {                    // Make sure event has an _id property
                    const eventId = event._id || event.id;
                    
                    if (!eventId) {
                        continue;
                    }
                    
                    // Get attendee count for this event and marketer
                    const eventStatsResponse = await apiCall(
                        `/marketers/analytics/event/${eventId}?marketerId=${marketerId}`,
                        'GET', 
                        null, 
                        auth.getToken()
                    );
                    
                    const eventStats = eventStatsResponse.data || eventStatsResponse;
                    
                    const row = document.createElement('tr');
                    
                    // Format date safely
                    let formattedDate = 'Date not available';
                    try {
                        if (event.date) {
                            const eventDate = new Date(event.date);
                            formattedDate = eventDate.toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                            });
                        }                    } catch (dateError) {
                        // Silently handle date formatting errors
                    }
                    
                    row.innerHTML = `
                        <td>${event.name || 'Unnamed event'}</td>
                        <td>${formattedDate}</td>
                        <td>${eventStats?.attendeesCount || 0}</td>
                    `;
                    
                    eventsTable.appendChild(row);                } catch (eventError) {
                    // Still create a row with available information
                    const row = document.createElement('tr');
                    let eventName = 'Unknown event';
                    let formattedDate = 'Date not available';
                    
                    try {
                        if (event.name) eventName = event.name;
                        if (event.date) {
                            const eventDate = new Date(event.date);
                            formattedDate = eventDate.toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                            });
                        }                    } catch (formatError) {
                        // Silently handle formatting errors
                    }
                    
                    row.innerHTML = `
                        <td>${eventName}</td>
                        <td>${formattedDate}</td>
                        <td>Error loading data</td>
                    `;
                    
                    eventsTable.appendChild(row);
                }
            }
        }
        
        // Show modal - Make sure we're using the right Bootstrap version API
        const modalElement = document.getElementById('marketerDetailModal');
        if (!modalElement) {
            throw new Error('Modal element not found');
        }
          try {
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        } catch (modalError) {
            // Fallback method if the bootstrap.Modal constructor fails
            // This uses jQuery if available, otherwise falls back to setting display styles
            if (window.$) {
                window.$(modalElement).modal('show');
            } else {
                modalElement.style.display = 'block';
                modalElement.classList.add('show');
                document.body.classList.add('modal-open');
                
                // Add backdrop if it doesn't exist
                let backdrop = document.querySelector('.modal-backdrop');
                if (!backdrop) {
                    backdrop = document.createElement('div');
                    backdrop.className = 'modal-backdrop fade show';
                    document.body.appendChild(backdrop);
                }
            }
        }
          } catch (error) {
        showToast('error', 'Failed to load marketer details: ' + (error.message || 'Unknown error'));
    }
}

async function setupEventCreationHandlers() {
    try {
        // Add Branch button handler
        const addBranchBtn = document.getElementById('addBranchBtn');
        if (!addBranchBtn) {
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
        });
          // Form submission handler
        const saveEventBtn = document.getElementById('saveEventBtn');
        if (!saveEventBtn) {
            return;
        }        saveEventBtn.addEventListener('click', async () => {
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
                        uploadFormData.append('image', bannerFile);                        // Don't set Content-Type header for FormData uploads
                        const token = auth.getToken();
                        
                        // Use the apiCall utility for consistency, but we need direct fetch for FormData
                        const uploadUrl = `${API_BASE_URL}/upload/event-banner`;
                        console.log('Uploading to:', uploadUrl);
                        
                        // Log FormData contents (for debugging)
                        console.log('FormData has image:', uploadFormData.has('image'));
                        
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
                            console.error('Upload error response:', response.status, errorText);
                            throw new Error(`Failed to upload banner image: ${response.status} ${response.statusText}`);
                        }
                        
                        const result = await response.json();
                        console.log('Upload success response:', result);
                        bannerImageName = result.filename;
                    } catch (uploadError) {
                        console.error('Upload error:', uploadError);
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
                }if (formData.busPickups && Array.isArray(formData.busPickups)) {
                    formData.busPickups.forEach((pickup, idx) => {
                        const isoPickup = toFullISOString(pickup.departureTime);
                        if (!isoPickup) {
                            showToast('error', `Bus pickup ${idx + 1} departure time is missing or invalid. Please select a valid date and time.`);
                            hasInvalidDate = true;
                        }
                    });
                }                if (hasInvalidDate) return;
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
                        }                    }
                }
                // Create the event
                await eventsApi.createEvent(eventData);
                
                // Show success message
                showToast('success', 'Event created successfully!');
                
                // Close the modal and reload events data
                const modalElement = document.getElementById('createEventModal');
                if (modalElement) {
                    const modal = bootstrap.Modal.getInstance(modalElement);                    if (modal) {
                        modal.hide();
                    }
                }
                
                // Reset the form
                form.reset();
                
                // Reload events data
                await loadEventsData();
                await setupEventFilter();            } catch (error) {
                showToast('error', 'Failed to create event: ' + (error.message || 'Unknown error'));
            }
        });    } catch (error) {
        showToast('error', 'Failed to set up event creation functionality');
    }
}

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
        state: formData.state,
        maxAttendees: formData.maxAttendees ? parseInt(formData.maxAttendees) : undefined,
        isActive: formData.isActive === 'true',
        branches: formData.branches || [],
        busPickups: []
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