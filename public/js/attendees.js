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
        
        // Handle status (which might not exist in marketer API)
        const status = attendee.status || 'Registered';
        
        return `
        <tr>
            <td>${name}</td>
            <td>${eventName}</td>
            <td>${attendee.phone || 'Not provided'}</td>
            <td>${transport}</td>
            <td>${pickupLocation}</td>
            <td><span class="badge bg-${getStatusBadgeColor(status)}">${status}</span></td>
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
    }

    // Transport filter
    const transportSelect = document.getElementById('transportFilter');
    if (transportSelect) {
        transportSelect.addEventListener('change', (e) => {
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

    displayAttendees(filteredAttendees);
}

async function editAttendee(id) {
    try {
        const attendee = await attendeesApi.getAttendee(id);
        showEditAttendeeModal(attendee);
    } catch (error) {
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

function getStatusBadgeColor(status) {
    const colors = {
        'CONFIRMED': 'success',
        'PENDING': 'warning',
        'CANCELLED': 'danger'
    };
    return colors[status] || 'secondary';
}

// Modal handling functions would go here
// You'll need to add the modal HTML to the attendees.html file
function showAddAttendeeModal() {
    // Implement modal display logic
}

function showEditAttendeeModal(attendee) {
    // Implement modal display logic
}
