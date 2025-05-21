// Concierge Check-ins JavaScript file
document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is authenticated
    if (!auth.isAuthenticated()) {
        showToast('error', 'Please login to access this page');
        window.location.href = 'login.html';
        return;
    }

    // Check if user is an admin
    const user = auth.getUser();
    if (user.role !== 'admin') {
        showToast('error', 'Only administrators can access this page');
        window.location.href = '../index.html';
        return;
    }

    // Get eventId and conciergeId from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('eventId');
    const conciergeId = urlParams.get('conciergeId');

    if (!eventId || !conciergeId) {
        showToast('error', 'Missing event or concierge information');
        window.location.href = 'admin-dashboard.html';
        return;
    }    try {
        // Load event and concierge details
        const eventDetails = await getEventDetails(eventId);
        const conciergeDetails = await getConciergeDetails(conciergeId);
        
        // Load checked-in attendees for this concierge and event
        let checkedInAttendees = [];
        try {
            checkedInAttendees = await getCheckedInAttendees(eventId, conciergeId);
        } catch (error) {
            console.log('No checked-in attendees found or endpoint error:', error);
            // Continue with empty attendees list instead of failing the whole page
        }
        
        // Update page with fetched data
        updatePageInfo(eventDetails, conciergeDetails, checkedInAttendees);
        
        // Display a more specific message about check-ins
        if (!checkedInAttendees || checkedInAttendees.length === 0) {
            showToast('info', 'No attendees have been checked in by this concierge yet.');
        }
    } catch (error) {
        console.error('Error loading page data:', error);
        
        // Try to be more specific about which part failed
        if (error.message.includes('event')) {
            showToast('error', 'Failed to load event information. Please try again later.');
        } else if (error.message.includes('concierge')) {
            showToast('error', 'Failed to load concierge information. Please try again later.');
        } else {
            showToast('error', 'Failed to load check-in data. Please try again later.');
        }
        
        // Still try to update the page with whatever data we have
        updatePageInfo({name: 'Unknown Event'}, {name: 'Unknown Concierge'}, []);
    }
    
    // Set up event listener for back button to ensure it goes to the concierges tab
    const backButton = document.querySelector('a[href="admin-dashboard.html#concierge-requests"]');
    if (backButton) {
        backButton.addEventListener('click', function(e) {
            e.preventDefault();
            sessionStorage.setItem('activeAdminTab', 'concierge-requests');
            window.location.href = 'admin-dashboard.html';
        });
    }
});

/**
 * Fetch event details
 */
async function getEventDetails(eventId) {
    try {
        const response = await apiCall(`/events/${eventId}`, 'GET', null, auth.getToken());
        return response.data || response;
    } catch (error) {
        console.error('Failed to fetch event details:', error);
        throw new Error('Failed to fetch event details');
    }
}

/**
 * Fetch concierge (user) details
 */
async function getConciergeDetails(userId) {
    try {
        const response = await apiCall(`/users/${userId}`, 'GET', null, auth.getToken());
        return response.data || response;
    } catch (error) {
        console.error('Failed to fetch concierge details:', error);
        throw new Error('Failed to fetch concierge details');
    }
}

/**
 * Fetch attendees checked in by this concierge for this event
 */
async function getCheckedInAttendees(eventId, conciergeId) {
    try {
        // Try to fetch from server
        try {
            // Use the specific endpoint with populated fields for registeredBy (marketer info)
            const response = await apiCall(`/attendees/checked-in?eventId=${eventId}&conciergeId=${conciergeId}&populate=registeredBy`, 'GET', null, auth.getToken());
            return response.data || response || [];
        } catch (error) {
            console.warn('Server endpoint error:', error);
              // Try fallback to regular attendees endpoint with filtering
            try {
                // Request populated marketer data
                const allAttendeesResponse = await apiCall('/attendees?populate=registeredBy', 'GET', null, auth.getToken());
                console.log('All attendees response:', allAttendeesResponse);
                
                // Handle nested data structure (response.data.data or response.data)
                let attendeesList = [];
                if (allAttendeesResponse.data && Array.isArray(allAttendeesResponse.data.data)) {
                    attendeesList = allAttendeesResponse.data.data;
                } else if (allAttendeesResponse.data && Array.isArray(allAttendeesResponse.data)) {
                    attendeesList = allAttendeesResponse.data;
                } else if (Array.isArray(allAttendeesResponse)) {
                    attendeesList = allAttendeesResponse;
                }
                
                console.log('Processing attendees list:', attendeesList);
                
                // Filter attendees that were checked in by this concierge for this event
                const filteredAttendees = attendeesList.filter(attendee => {
                    // Check if the attendee is checked in
                    const isCheckedIn = attendee.checkedIn === true;
                    
                    // Check if the event matches
                    const eventMatches = 
                        (attendee.event && attendee.event._id === eventId) ||
                        (attendee.event && attendee.event.toString() === eventId) ||
                        (typeof attendee.event === 'string' && attendee.event === eventId);
                    
                    // Check if checked in by the right concierge
                    const conciergeMatches = 
                        (attendee.checkedInBy && attendee.checkedInBy._id === conciergeId) ||
                        (attendee.checkedInBy && attendee.checkedInBy.toString() === conciergeId) ||
                        (typeof attendee.checkedInBy === 'string' && attendee.checkedInBy === conciergeId);
                    
                    return isCheckedIn && eventMatches && conciergeMatches;
                });
                
                console.log('Filtered attendees:', filteredAttendees);
                return filteredAttendees;
            } catch (secondError) {
                console.warn('Fallback endpoint error:', secondError);
                return [];
            }
        }
    } catch (error) {
        console.warn('Failed to fetch checked-in attendees:', error);
        // Return empty array instead of throwing an error
        return [];
    }
}

/**
 * Update page with fetched data
 */
function updatePageInfo(event, concierge, attendees) {
    try {
        // Ensure attendees is always an array
        const safeAttendees = Array.isArray(attendees) ? attendees : [];
        
        // Update page title and subtitle
        document.getElementById('page-title').textContent = `Concierge Check-ins: ${event?.name || 'Unknown Event'}`;
        document.getElementById('page-subtitle').textContent = `Attendees checked-in by ${concierge?.name || 'Unknown Concierge'}`;
        
        // Update event information
        document.getElementById('event-name').textContent = event?.name || 'N/A';
        document.getElementById('event-date').textContent = event?.date ? formatDate(event.date) : 'N/A';
        document.getElementById('event-location').textContent = event?.state || 'N/A';
        document.getElementById('total-attendees').textContent = event?.attendeesCount || safeAttendees.length || 'N/A';
        
        // Update concierge information
        document.getElementById('concierge-name').textContent = concierge?.name || 'N/A';
        document.getElementById('concierge-email').textContent = concierge?.email || 'N/A';
        document.getElementById('concierge-phone').textContent = concierge?.phone || 'N/A';
        document.getElementById('total-checkins').textContent = safeAttendees.length || 0;
        
        // Update attendees table
        updateAttendeesTable(safeAttendees);
    } catch (error) {
        console.error('Error updating page info:', error);
        // Show an error message in the table
        const tableBody = document.getElementById('attendees-table-body');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger"><i class="bi bi-exclamation-triangle"></i> Error loading attendee data. Please try again later.</td></tr>';
        }
    }
}

/**
 * Update the attendees table with checked-in attendees
 */
function updateAttendeesTable(attendees) {
    const tableBody = document.getElementById('attendees-table-body');
    const noCheckinsMessage = document.getElementById('no-checkins');
    
    tableBody.innerHTML = '';
    
    if (!attendees || attendees.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted"><i class="bi bi-people"></i> No attendees have been checked in by this concierge yet.</td></tr>';
        noCheckinsMessage.classList.remove('d-none');
        
        // Update the total check-ins count to 0
        document.getElementById('total-checkins').textContent = '0';
        return;
    }
    
    // Hide the "no attendees" message
    noCheckinsMessage.classList.add('d-none');
      // Populate the table
    attendees.forEach((attendee, index) => {
        const row = document.createElement('tr');
        
        // Format the check-in time - corrected from checkInTime to checkedInTime
        const checkInTime = attendee.checkedInTime ? formatDate(attendee.checkedInTime, true) : 'N/A';
        
        // Get marketer name - looking for registeredBy instead of marketer
        const marketerName = attendee.registeredBy?.name || 'N/A';
        
        // Get transport preference display
        let transportDisplay = 'N/A';
        if (attendee.transportPreference === 'bus') {
            transportDisplay = `Bus (${attendee.busPickup?.location || 'No location'})`;
        } else if (attendee.transportPreference === 'private') {
            transportDisplay = 'Private';
        }
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${attendee.name || 'N/A'}</td>
            <td>${attendee.phone || 'N/A'}</td>
            <td>${marketerName}</td>
            <td>${transportDisplay}</td>
            <td>${checkInTime}</td>
            <td>
                <button class="btn btn-sm btn-info view-attendee-btn" data-attendee-id="${attendee._id || attendee.id}">
                    <i class="bi bi-info-circle"></i> Details
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
      // Add event listeners to view attendee details
    document.querySelectorAll('.view-attendee-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const attendeeId = btn.getAttribute('data-attendee-id');
            const attendee = attendees.find(a => {
                const aId = a._id || a.id;
                return aId === attendeeId;
            });
            
            if (attendee) {
                showAttendeeDetails(attendee);
            } else {
                showToast('error', 'Could not find attendee details');
            }
        });
    });
}

/**
 * Show attendee details in modal
 */
function showAttendeeDetails(attendee) {
    try {
        if (!attendee) {
            throw new Error('Attendee data is missing');
        }
        
        // Populate modal with attendee details
        document.getElementById('modal-attendee-name').textContent = attendee.name || 'N/A';
        document.getElementById('modal-attendee-phone').textContent = `Phone: ${attendee.phone || 'N/A'}`;
        document.getElementById('modal-attendee-email').textContent = `Email: ${attendee.email || 'N/A'}`;
          // Format dates
        const registrationDate = attendee.createdAt ? formatDate(attendee.createdAt) : 'N/A';
        const checkinTime = attendee.checkedInTime ? formatDate(attendee.checkedInTime, true) : 'N/A';
        
        document.getElementById('modal-registration-date').textContent = registrationDate;
        document.getElementById('modal-checkin-time').textContent = checkinTime;
        
        // Other details - Use optional chaining to safely access nested properties
        let marketerName = 'N/A';
        if (typeof attendee.registeredBy === 'object' && attendee.registeredBy) {
            marketerName = attendee.registeredBy.name || 'Unknown Marketer';
        } else if (typeof attendee.registeredBy === 'string') {
            marketerName = 'ID: ' + attendee.registeredBy;
        }
        
        document.getElementById('modal-marketer').textContent = marketerName;
        
        // Format transport preference
        let transportDisplay = 'N/A';
        if (attendee.transportPreference === 'bus') {
            transportDisplay = `Bus (${attendee.busPickup?.location || 'No location'})`;
        } else if (attendee.transportPreference === 'private') {
            transportDisplay = 'Private';
        }
        document.getElementById('modal-transport').textContent = transportDisplay;
        
        // Notes section (if any)
        const notesSection = document.getElementById('modal-notes-section');
        const notesContent = document.getElementById('modal-notes');
        
        if (attendee.checkInNotes) {
            notesSection.classList.remove('d-none');
            notesContent.textContent = attendee.checkInNotes;
        } else {
            notesSection.classList.add('d-none');
            notesContent.textContent = 'No notes available';
        }
        
        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('attendeeDetailsModal'));
        modal.show();
    } catch (error) {
        console.error('Error showing attendee details:', error);
        showToast('error', 'Failed to display attendee details');
    }
}

/**
 * Format date for display
 */
function formatDate(dateString, includeTime = false) {
    try {
        if (!dateString) return 'N/A';
        
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date';
        
        const options = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            ...(includeTime && { hour: '2-digit', minute: '2-digit' })
        };
        
        return date.toLocaleString('en-US', options);
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Error';
    }
}

/**
 * Show toast message
 */
function showToast(type, message) {
    // Check if a toast container exists
    let toastContainer = document.querySelector('.toast-container');
    
    if (!toastContainer) {
        // Create a toast container if it doesn't exist
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }
    
    // Create a new toast
    const toastId = 'toast-' + Math.random().toString(36).substr(2, 9);
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'bg-danger' : 'bg-success'} text-white`;
    toast.id = toastId;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    // Add toast content
    toast.innerHTML = `
        <div class="toast-header ${type === 'error' ? 'bg-danger' : 'bg-success'} text-white">
            <strong class="me-auto">${type === 'error' ? 'Error' : 'Success'}</strong>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body">
            ${message}
        </div>
    `;
    
    // Add the toast to the container
    toastContainer.appendChild(toast);
    
    // Initialize and show the toast
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    // Remove the toast after it's hidden
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}