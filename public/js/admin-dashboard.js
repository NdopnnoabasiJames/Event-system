// Admin Dashboard JavaScript
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Admin dashboard loading...');
    
    // Check if user is authenticated
    if (!auth.isAuthenticated()) {
        console.log('User not authenticated, redirecting to login');
        showToast('error', 'Please login to access the admin dashboard');
        window.location.href = 'login.html';
        return;
    }

    // Check if user is an admin
    const user = auth.getUser();
    console.log('User role:', user.role);
    
    if (user.role !== 'admin') {
        console.log('User is not an admin, redirecting to home page');
        showToast('error', 'Only administrators can access this page');
        
        // Redirect to appropriate dashboard based on role
        if (user.role === 'marketer') {
            window.location.href = 'marketer-dashboard.html';
        } else {
            window.location.href = '../index.html';
        }
        return;
    }
    
    console.log('Admin authentication confirmed, loading dashboard');

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
            console.error('Error setting up event creation handlers:', error);
            // We don't need to show another toast here since setupEventCreationHandlers already does
        }
    } catch (error) {
        console.error('Error loading admin dashboard:', error);
        showToast('error', 'Failed to load dashboard data');
    }
});

async function loadTopMarketers() {
    try {
        const response = await marketersApi.getTopMarketers();
        const marketers = Array.isArray(response) ? response : (response.data || []);
        
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
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${item.marketer.name}</td>
                <td>${item.marketer.email}</td>
                <td>${item.stats.totalAttendeesRegistered}</td>
                <td>${item.stats.eventsParticipated}</td>
                <td>${item.stats.averageAttendeesPerEvent.toFixed(1)}</td>
                <td>
                    <button class="btn btn-sm btn-info view-marketer" data-marketer-id="${item.marketer.id}">
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
        console.error('Error loading top marketers:', error);
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
        
        for (const event of events) {
            const row = document.createElement('tr');
            
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
                <td>${event.attendeeCount || 0}</td>
                <td>${event.marketers?.length || 0}</td>
                <td>
                    <a href="event-details.html?id=${event._id}" class="btn btn-sm btn-primary">
                        <i class="bi bi-eye"></i> View
                    </a>
                </td>
            `;
            
            tableBody.appendChild(row);
        }
    } catch (error) {
        console.error('Error loading events:', error);
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
        });
    } catch (error) {
        console.error('Error setting up event filter:', error);
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
                <td>${attendee.email}</td>
                <td>${attendee.event.name}</td>
                <td>${marketerName}</td>
                <td>${attendee.transportPreference === 'bus' ? 
                    `<span class="badge bg-success">Bus (${attendee.busPickup?.location || 'N/A'})</span>` : 
                    '<span class="badge bg-secondary">Private</span>'}
                </td>
                <td>${formattedDate}</td>
            `;
            
            tableBody.appendChild(row);
        }
    } catch (error) {
        console.error('Error loading attendees:', error);
        showToast('error', 'Failed to load attendees data');
    }
}

async function showMarketerDetails(marketerId) {
    try {
        // Get marketer user info
        const marketer = await apiCall(`/users/${marketerId}`, 'GET', null, auth.getToken());
        
        // Get marketer performance stats
        const stats = await apiCall(`/marketers/analytics/performance?marketerId=${marketerId}`, 'GET', null, auth.getToken());
        
        // Get marketer events
        const events = await apiCall(`/marketers/events/my?marketerId=${marketerId}`, 'GET', null, auth.getToken());
        
        // Update modal content
        document.getElementById('marketer-name').textContent = marketer.name;
        document.getElementById('marketer-email').textContent = marketer.email;
        document.getElementById('marketer-total-attendees').textContent = stats.totalAttendeesRegistered;
        document.getElementById('marketer-events').textContent = stats.eventsParticipated;
        document.getElementById('marketer-avg').textContent = stats.averageAttendeesPerEvent.toFixed(1);
        
        // Populate events table
        const eventsTable = document.getElementById('marketer-events-table');
        eventsTable.innerHTML = '';
        
        if (events.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="3" class="text-center">No events found</td>';
            eventsTable.appendChild(row);
        } else {
            for (const event of events) {
                // Get attendee count for this event and marketer
                const eventStats = await apiCall(
                    `/marketers/analytics/event/${event._id}?marketerId=${marketerId}`,
                    'GET', 
                    null, 
                    auth.getToken()
                );
                
                const row = document.createElement('tr');
                
                // Format date
                const eventDate = new Date(event.date);
                const formattedDate = eventDate.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                });
                
                row.innerHTML = `
                    <td>${event.name}</td>
                    <td>${formattedDate}</td>
                    <td>${eventStats.attendeesCount}</td>
                `;
                
                eventsTable.appendChild(row);
            }
        }
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('marketerDetailModal'));
        modal.show();
    } catch (error) {
        console.error(`Error loading marketer details for ${marketerId}:`, error);
        showToast('error', 'Failed to load marketer details');
    }
}

async function setupEventCreationHandlers() {
    try {
        console.log('Setting up event creation handlers');
        
        // Add Branch button handler
        const addBranchBtn = document.getElementById('addBranchBtn');
        if (!addBranchBtn) {
            console.error('Cannot find addBranchBtn element');
            return;
        }
        
        let branchCount = 1;
        
        addBranchBtn.addEventListener('click', () => {
            const branchesContainer = document.getElementById('branchesContainer');
            if (!branchesContainer) {
                console.error('Cannot find branchesContainer element');
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
            console.error('Cannot find addBusPickupBtn element');
            return;
        }
        
        let pickupCount = 1;
        
        addBusPickupBtn.addEventListener('click', () => {
            const busPickupsContainer = document.getElementById('busPickupsContainer');
            if (!busPickupsContainer) {
                console.error('Cannot find busPickupsContainer element');
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
            console.error('Cannot find saveEventBtn element');
            return;
        }
          saveEventBtn.addEventListener('click', async () => {
            try {
                const form = document.getElementById('createEventForm');
                if (!form) {
                    console.error('Cannot find createEventForm element');
                    return;
                }
                
                // Basic validation
                if (!form.checkValidity()) {
                    form.reportValidity();
                    return;
                }
                
                // Get form data and convert to appropriate format
                const formData = getFormDataAsObject(form);
                // Log raw formData for debugging
                console.log('Raw formData:', formData);
                // Log raw and ISO-formatted date values for debugging
                console.log('Raw event date:', formData.date);
                const isoEventDate = toFullISOString(formData.date);
                console.log('ISO event date:', isoEventDate);
                let hasInvalidDate = false;
                if (!isoEventDate) {
                    showToast('error', 'Event date is missing or invalid. Please select a valid date and time.');
                    hasInvalidDate = true;
                }
                if (formData.busPickups && Array.isArray(formData.busPickups)) {
                    formData.busPickups.forEach((pickup, idx) => {
                        console.log(`Raw busPickups[${idx}].departureTime:`, pickup.departureTime);
                        const isoPickup = toFullISOString(pickup.departureTime);
                        console.log(`ISO busPickups[${idx}].departureTime:`, isoPickup);
                        if (!isoPickup) {
                            showToast('error', `Bus pickup ${idx + 1} departure time is missing or invalid. Please select a valid date and time.`);
                            hasInvalidDate = true;
                        }
                    });
                }
                if (hasInvalidDate) return;
                const eventData = formatEventData(formData);
                // Log formatted eventData for debugging
                console.log('Formatted eventData:', eventData);

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
                // Log the final payload being sent
                console.log('Final eventData payload to API:', eventData);
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
                    } else {
                        console.warn('Could not find Bootstrap modal instance');
                    }
                }
                
                // Reset the form
                form.reset();
                
                // Reload events data
                await loadEventsData();
                await setupEventFilter();
            } catch (error) {
                showToast('error', 'Failed to create event: ' + (error.message || 'Unknown error'));
                console.error('Error creating event:', error);
            }
        });
        
        console.log('Event creation handlers set up successfully');
    } catch (error) {
        console.error('Error in setupEventCreationHandlers:', error);
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
        // Chrome/Edge: new Date('2025-05-12T10:00') is local time
        // Safari: new Date('2025-05-12T10:00') is UTC
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
