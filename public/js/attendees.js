let currentAttendees = [];
let allEvents = [];

document.addEventListener('DOMContentLoaded', async () => {
    if (!auth.isAuthenticated()) {
        showToast('error', 'Please login to view attendees');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
        return;
    }

    await loadEvents();
    await loadAttendees();
    setupEventListeners();
});

async function loadEvents() {
    try {
        const response = await apiCall('/events', 'GET', null, auth.getToken());
        allEvents = Array.isArray(response) ? response : (response.data || []);
        populateEventFilter();
    } catch (error) {
        console.error('Error loading events:', error);
        showToast('error', 'Failed to load events');
    }
}

function populateEventFilter() {
    const eventSelect = document.getElementById('eventFilter');
    if (!eventSelect) return;

    // Clear existing options except the first one
    eventSelect.innerHTML = '<option value="">All Events</option>';
    
    allEvents.forEach(event => {
        const option = document.createElement('option');
        option.value = event._id || event.id;
        option.textContent = event.name;
        eventSelect.appendChild(option);
    });
}

async function loadAttendees(eventId = null) {
    try {
        let response;
        
        // Check user role to determine which API to call
        const user = auth.getUser();
        
        if (user && user.role === 'marketer') {
            // For marketers, show only their registered attendees
            response = await marketersApi.getMyAttendees(eventId);
        } else {
            // For admins or other roles, show all attendees
            response = await attendeesApi.getAllAttendees(eventId);
        }
        
        console.log('API Response from loadAttendees:', response);
        
        // Extract attendees array from the response, handling different response formats
        let attendeesArray;
        
        // Check if response is directly an array
        if (Array.isArray(response)) {
            attendeesArray = response;
        } 
        // Check if response has a data property that's an array
        else if (response && response.data) {
            if (Array.isArray(response.data)) {
                attendeesArray = response.data;
            } 
            // Check if response.data has a nested data array (format we're seeing)
            else if (response.data && response.data.data && Array.isArray(response.data.data)) {
                attendeesArray = response.data.data;
            }
        }
        
        // Final fallback - if we still don't have a valid array, create an empty one
        if (!attendeesArray) {
            console.warn('Could not extract attendees array from API response, using empty array');
            attendeesArray = [];
        }
        
        console.log('Extracted attendees array:', attendeesArray);
        
        currentAttendees = attendeesArray;
        displayAttendees(attendeesArray);
    } catch (error) {
        console.error('Error loading attendees:', error);
        showToast('error', 'Failed to load attendees');
    }
}

function displayAttendees(attendees) {
    const tableBody = document.getElementById('attendeesTableBody');
    if (!tableBody) return;
    
    if (!attendees || attendees.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">No attendees found</td>
            </tr>`;
        return;
    }

    tableBody.innerHTML = attendees.map(attendee => {
        // Handle different property names/structures between APIs
        const name = attendee.name || `${attendee.firstName || ''} ${attendee.lastName || ''}`.trim();
        
        // Handle different event property structure
        const eventName = (attendee.event && attendee.event.name) ? attendee.event.name : 'Unknown Event';
        
        // Handle different transport property names
        const transport = attendee.transportPreference || attendee.transport || 'Unknown';
          // Handle different pickup location structures
        const pickupLocation = (attendee.busPickup && attendee.busPickup.location) ? attendee.busPickup.location : (attendee.pickupLocation || '-');
        
        // Handle check-in status - check if attendee has been checked in
        const isCheckedIn = attendee.checkedIn === true || attendee.checkedInTime;
        const checkInStatus = isCheckedIn ? 'Checked In' : 'Not Checked In';
        const checkInBadgeColor = isCheckedIn ? 'success' : 'warning';
        
        return `
        <tr>
            <td>${name}</td>
            <td>${eventName}</td>
            <td>${attendee.phone || 'Not provided'}</td>
            <td>${transport}</td>
            <td>${pickupLocation}</td>
            <td><span class="badge bg-${checkInBadgeColor} ${isCheckedIn ? '' : 'text-dark'}">${checkInStatus}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editAttendee('${attendee._id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteAttendee('${attendee._id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
        `;
    }).join('');
}

function setupEventListeners() {
    // Real-time search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            applyFilters();
        });
    }

    // Event filter
    const eventSelect = document.getElementById('eventFilter');
    if (eventSelect) {
        eventSelect.addEventListener('change', (e) => {
            applyFilters();
        });
    }    // Transport filter
    const transportSelect = document.getElementById('transportFilter');
    if (transportSelect) {
        transportSelect.addEventListener('change', (e) => {
            applyFilters();
        });
    }

    // Check-in status filter
    const checkInSelect = document.getElementById('checkInFilter');
    if (checkInSelect) {
        checkInSelect.addEventListener('change', (e) => {
            applyFilters();
        });
    }

    // Add Attendee button
    const addAttendeeBtn = document.querySelector('button.btn-primary');
    if (addAttendeeBtn) {
        addAttendeeBtn.addEventListener('click', () => {
            showAddAttendeeModal();
        });
    }
}

function applyFilters() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const selectedEventId = document.getElementById('eventFilter')?.value || '';
    const selectedTransport = document.getElementById('transportFilter')?.value || '';
    const selectedCheckInStatus = document.getElementById('checkInFilter')?.value || '';

    let filteredAttendees = currentAttendees;

    // Apply search filter (name or phone)
    if (searchTerm) {
        filteredAttendees = filteredAttendees.filter(attendee => {
            let nameStr = '';
            
            // Use name property if available, otherwise try firstName/lastName
            if (attendee.name) {
                nameStr = attendee.name.toLowerCase();
            } else {
                const firstName = (attendee.firstName || '').toLowerCase();
                const lastName = (attendee.lastName || '').toLowerCase();
                nameStr = `${firstName} ${lastName}`.trim();
            }
            
            const phoneStr = (attendee.phone || '').toLowerCase();
            
            // Return true if either name or phone contains the search term
            return nameStr.includes(searchTerm) || phoneStr.includes(searchTerm);
        });
    }

    // Apply event filter
    if (selectedEventId) {
        filteredAttendees = filteredAttendees.filter(attendee => {
            const attendeeEventId = attendee.event?._id || attendee.event?.id || attendee.event;
            return attendeeEventId === selectedEventId;
        });
    }

    // Apply transport filter
    if (selectedTransport) {
        filteredAttendees = filteredAttendees.filter(attendee => {
            const attendeeTransport = attendee.transportPreference || attendee.transport || '';
            return attendeeTransport.toLowerCase() === selectedTransport.toLowerCase();
        });
    }

    // Apply check-in status filter
    if (selectedCheckInStatus) {
        filteredAttendees = filteredAttendees.filter(attendee => {
            const isCheckedIn = attendee.checkedIn === true || attendee.checkedInTime;
            
            if (selectedCheckInStatus === 'checked-in') {
                return isCheckedIn;
            } else if (selectedCheckInStatus === 'not-checked-in') {
                return !isCheckedIn;
            }
            
            return true; // Default case (shouldn't happen with our current options)
        });
    }

    displayAttendees(filteredAttendees);
}

async function editAttendee(id) {
    try {
        const response = await attendeesApi.getAttendee(id);
        console.log('Edit attendee - API response:', response);
        
        // Handle different response formats
        let attendee = response;
        if (response && response.data) {
            attendee = response.data;
        }
        
        console.log('Edit attendee - processed attendee data:', attendee);
        showEditAttendeeModal(attendee);
    } catch (error) {
        console.error('Failed to load attendee details:', error);
        showToast('error', 'Failed to load attendee details');
    }
}

async function deleteAttendee(id) {
    if (confirm('Are you sure you want to delete this attendee?')) {
        try {
            await attendeesApi.deleteAttendee(id);
            showToast('success', 'Attendee deleted successfully');
            await loadAttendees();
        } catch (error) {
            showToast('error', 'Failed to delete attendee');
        }
    }
}

// Modal handling functions would go here
// You'll need to add the modal HTML to the attendees.html file
function showAddAttendeeModal() {
    // Implement modal display logic
}

function showEditAttendeeModal(attendee) {
    console.log('showEditAttendeeModal - received attendee data:', attendee);
    
    const modal = new bootstrap.Modal(document.getElementById('editAttendeeModal'));
    
    // Populate the form with attendee data
    document.getElementById('editAttendeeId').value = attendee._id || attendee.id || '';
    document.getElementById('editAttendeeName').value = attendee.name || '';
    document.getElementById('editAttendeePhone').value = attendee.phone || '';
    document.getElementById('editAttendeeEmail').value = attendee.email || '';
    document.getElementById('editAttendeeState').value = attendee.state || '';
    document.getElementById('editAttendeeBranch').value = attendee.branch || '';
    document.getElementById('editAttendeeTransport').value = attendee.transportPreference || '';
    document.getElementById('editAttendeeCheckedIn').checked = attendee.checkedIn || false;
    
    console.log('showEditAttendeeModal - populated form fields');
    
    // Handle event selection
    const eventSelect = document.getElementById('editAttendeeEvent');
    eventSelect.innerHTML = '<option value="">Select Event</option>';
    allEvents.forEach(event => {
        const option = document.createElement('option');
        option.value = event._id || event.id;
        option.textContent = event.name;
        if ((attendee.event && (attendee.event._id === event._id || attendee.event.id === event._id)) || 
            attendee.event === event._id) {
            option.selected = true;
        }
        eventSelect.appendChild(option);
    });
    
    // Handle bus pickup information
    if (attendee.transportPreference === 'bus' && attendee.busPickup) {
        document.getElementById('editAttendeePickupLocation').value = attendee.busPickup.location || '';
        document.getElementById('editAttendeePickupTime').value = attendee.busPickup.departureTime || '';
        toggleBusPickupFields(true);
    } else {
        document.getElementById('editAttendeePickupLocation').value = '';
        document.getElementById('editAttendeePickupTime').value = '';
        toggleBusPickupFields(false);
    }
    
    // Set up transport preference change listener
    const transportSelect = document.getElementById('editAttendeeTransport');
    transportSelect.addEventListener('change', function() {
        toggleBusPickupFields(this.value === 'bus');
        // Clear pickup fields when switching away from bus
        if (this.value !== 'bus') {
            document.getElementById('editAttendeePickupLocation').value = '';
            document.getElementById('editAttendeePickupTime').value = '';
        }
    });
    
    // Set up save button event listener
    const saveBtn = document.getElementById('saveAttendeeBtn');
    saveBtn.onclick = saveAttendeeChanges;
    
    modal.show();
}

function toggleBusPickupFields(show) {
    const pickupSection = document.getElementById('editBusPickupSection');
    const timeSection = document.getElementById('editBusPickupTimeSection');
    const pickupLocationInput = document.getElementById('editAttendeePickupLocation');
    const pickupTimeInput = document.getElementById('editAttendeePickupTime');
    
    if (show) {
        pickupSection.style.display = 'block';
        timeSection.style.display = 'block';
        pickupLocationInput.required = true;
        pickupTimeInput.required = true;
    } else {
        pickupSection.style.display = 'none';
        timeSection.style.display = 'none';
        pickupLocationInput.required = false;
        pickupTimeInput.required = false;
        // Clear validation classes
        pickupLocationInput.classList.remove('is-invalid');
        pickupTimeInput.classList.remove('is-invalid');
    }
}

async function saveAttendeeChanges() {
    const form = document.getElementById('editAttendeeForm');
    const formData = new FormData(form);
    
    // Validate form
    if (!validateEditForm()) {
        return;
    }
    
    const attendeeId = formData.get('attendeeId');
    const updateData = {
        name: formData.get('name'),
        phone: formData.get('phone'),
        email: formData.get('email') || undefined,
        event: formData.get('event'),
        state: formData.get('state'),
        branch: formData.get('branch'),
        transportPreference: formData.get('transportPreference'),
        checkedIn: document.getElementById('editAttendeeCheckedIn').checked
    };
    
    // Add bus pickup information if transport is bus
    if (updateData.transportPreference === 'bus') {
        const pickupLocation = formData.get('pickupLocation');
        const departureTime = formData.get('departureTime');
        
        if (pickupLocation && departureTime) {
            updateData.busPickup = {
                location: pickupLocation,
                departureTime: departureTime
            };
        }
    }
    
    try {
        // Disable save button and show loading state
        const saveBtn = document.getElementById('saveAttendeeBtn');
        const originalText = saveBtn.textContent;
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';
        
        await attendeesApi.updateAttendee(attendeeId, updateData);
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editAttendeeModal'));
        modal.hide();
        
        // Show success message
        showToast('success', 'Attendee updated successfully');
        
        // Reload attendees
        await loadAttendees();
        
    } catch (error) {
        console.error('Error updating attendee:', error);
        showToast('error', 'Failed to update attendee. Please try again.');
    } finally {
        // Re-enable save button
        const saveBtn = document.getElementById('saveAttendeeBtn');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Changes';
    }
}

function validateEditForm() {
    const form = document.getElementById('editAttendeeForm');
    const inputs = form.querySelectorAll('input[required], select[required]');
    let isValid = true;
    
    // Clear previous validation classes
    inputs.forEach(input => {
        input.classList.remove('is-invalid', 'is-valid');
    });
    
    // Validate required fields
    inputs.forEach(input => {
        if (!input.value.trim()) {
            input.classList.add('is-invalid');
            isValid = false;
        } else {
            input.classList.add('is-valid');
        }
    });
    
    // Validate email format if provided
    const emailInput = document.getElementById('editAttendeeEmail');
    if (emailInput.value.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailInput.value)) {
            emailInput.classList.add('is-invalid');
            isValid = false;
        } else {
            emailInput.classList.add('is-valid');
        }
    }
    
    // Validate phone number format
    const phoneInput = document.getElementById('editAttendeePhone');
    if (phoneInput.value.trim()) {
        const phoneRegex = /^[\d\s\-\+\(\)]+$/;
        if (!phoneRegex.test(phoneInput.value) || phoneInput.value.length < 10) {
            phoneInput.classList.add('is-invalid');
            isValid = false;
        } else {
            phoneInput.classList.add('is-valid');
        }
    }
    
    // Special validation for bus transport
    const transportSelect = document.getElementById('editAttendeeTransport');
    if (transportSelect.value === 'bus') {
        const pickupLocation = document.getElementById('editAttendeePickupLocation');
        const departureTime = document.getElementById('editAttendeePickupTime');
        
        if (!pickupLocation.value.trim()) {
            pickupLocation.classList.add('is-invalid');
            isValid = false;
        } else {
            pickupLocation.classList.add('is-valid');
        }
        
        if (!departureTime.value.trim()) {
            departureTime.classList.add('is-invalid');
            isValid = false;
        } else {
            departureTime.classList.add('is-valid');
        }
    }
    
    return isValid;
}
