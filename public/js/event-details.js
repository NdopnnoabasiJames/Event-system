document.addEventListener('DOMContentLoaded', async () => {
    if (!auth.isAuthenticated()) {
        showToast('error', 'Please login to view event details');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');

    if (eventId) {
        await loadEventDetails(eventId);
    } else {
        showToast('error', 'Event not found');
        setTimeout(() => {
            window.location.href = 'events.html';
        }, 1000);
    }
});

async function loadEventDetails(eventId) {
    try {
        // Get event details from the API
        const response = await eventsApi.getEvent(eventId);
        
        // Handle different response formats
        let event;
        if (response && typeof response === 'object') {
            // Extract the event data from the nested response structure
            if (response.data && typeof response.data === 'object') {
                event = response.data;
            } else {
                event = response;
            }            // Check if the event has all required fields
            const hasValidLocation = (event.states && Array.isArray(event.states) && event.states.length > 0) ||
                                   event.state ||
                                   (event.branches && typeof event.branches === 'object' && Object.keys(event.branches).length > 0);
            
            if (!event.name || !event.date || !hasValidLocation || (!event.maxAttendees && event.maxAttendees !== 0)) {
                // Event is missing some required fields, but we'll still display what we have
            }
        } else {
            throw new Error('Invalid event data received from API');
        }
        
        // Update UI with event data
        updateEventUI(event);    } catch (error) {
        showToast('error', 'Failed to load event details');
    }
}

async function updateEventUI(event) {
    // Initialize attendee count
    event.attendeeCount = 0;
    
    // Get the attendee count for this event BEFORE we calculate statistics
    try {
        const eventId = event._id || event.id;
        
        if (eventId) {
            try {
                // Use the getAllAttendees method to get attendee data
                try {
                    const attendees = await attendeesApi.getAllAttendees(eventId);
                    
                    if (Array.isArray(attendees)) {
                        event.attendeeCount = attendees.length;
                    } else if (attendees && attendees.data && Array.isArray(attendees.data)) {
                        // Handle case where API returns { data: [...] }
                        event.attendeeCount = attendees.data.length;
                    } else {
                        event.attendeeCount = 0;                    }
                } catch (fetchError) {
                    // Special handling for "No attendees found" error (HTTP 404)
                    if (fetchError.response && fetchError.response.status === 404) {
                        event.attendeeCount = 0;
                    } else {
                        event.attendeeCount = 0;
                    }
                }
            } catch (fetchError) {
                // Set to 0 for any error
                event.attendeeCount = 0;
            }
            
            // Ensure it's a number
            if (typeof event.attendeeCount !== 'number' || isNaN(event.attendeeCount)) {
                event.attendeeCount = 0;
            }
        }    } catch (error) {
        event.attendeeCount = 0;
    }    // Update event image
    const eventImage = document.querySelector('.img-fluid');
    if (eventImage) {
        eventImage.src = getEventBannerUrl(event.bannerImage);
    }

    // Update event title and basic info
    const eventTitle = document.querySelector('h1');
    if (eventTitle) {
        eventTitle.textContent = event.name || 'Event Details';
    }
      // Format date more reliably
    let eventDate = 'Date not available';
    if (event.date) {
        try {
            // Try various date formats
            let date = null;
            const dateStr = String(event.date).trim();
            
            // First try - direct Date constructor
            date = new Date(dateStr);
            
            // Second try - handle ISO-like strings with possible issues
            if (isNaN(date.getTime()) && dateStr.match(/\d{4}[-/]\d{1,2}[-/]\d{1,2}/)) {
                const matches = dateStr.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
                if (matches) {
                    const [, year, month, day] = matches;
                    date = new Date(year, parseInt(month) - 1, day); // Month is 0-indexed
                }
            }
            
            // Third try - handle string like "May 13, 2025"
            if (isNaN(date.getTime())) {
                date = new Date(dateStr);
            }
            
            // If we have a valid date now, format it
            if (date && !isNaN(date.getTime())) {
                eventDate = date.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
            } else {
                eventDate = dateStr; // Fall back to the raw string if all parsing fails
            }        } catch (e) {
            eventDate = String(event.date); // Last resort - just show the raw value
        }
    }
    
    // Get location more reliably - handle multiple states and branches properly
    let location = 'Location not specified';
    if (event.states && Array.isArray(event.states) && event.states.length > 0) {
        // Display all selected states
        location = event.states.join(', ');
    } else if (event.state && typeof event.state === 'string' && event.state.trim() !== '') {
        // Fallback for legacy single state property
        location = event.state;
    } else if (event.branches && typeof event.branches === 'object' && event.branches !== null) {
        // Try to get location from branches object
        const stateNames = Object.keys(event.branches);
        if (stateNames.length > 0) {
            location = stateNames.join(', ');
        }
    }
    
    // Calculate available seats more reliably
    // Default to the raw value first, then try parsing as number
    let maxAttendees = event.maxAttendees;
    
    // If it's not already a number, try to parse it
    if (typeof maxAttendees !== 'number') {
        // Handle null/undefined
        if (maxAttendees == null) {
            maxAttendees = 0;
        }
        // Try parsing as integer if it's a string
        else if (typeof maxAttendees === 'string') {
            maxAttendees = parseInt(maxAttendees, 10);
            if (isNaN(maxAttendees)) maxAttendees = 0;
        }
    }
    
    // For attendee count - default to 0 if not available
    const attendeeCount = typeof event.attendeeCount === 'number' ? event.attendeeCount :
                        (event.attendeeCount ? parseInt(event.attendeeCount, 10) : 0);
    
    const availableSeats = Math.max(0, maxAttendees - (isNaN(attendeeCount) ? 0 : attendeeCount));
    
    // Update event badges with correct labels
    const badges = document.querySelector('.d-flex.flex-wrap.gap-3');
    if (badges) {
        badges.innerHTML = `
            <span class="badge bg-primary fs-6">
                <i class="fas fa-calendar-alt me-2"></i>${eventDate}
            </span>
            <span class="badge bg-success fs-6">
                <i class="fas fa-clock me-2"></i>${event.time || '9:00 AM - 5:00 PM'}
            </span>
            <span class="badge bg-info fs-6">
                <i class="fas fa-map-marker-alt me-2"></i>${location}
            </span>
            <span class="badge bg-warning fs-6">
                <i class="fas fa-users me-2"></i>${isNaN(availableSeats) ? maxAttendees : availableSeats} Seats Remaining
            </span>
        `;
    }    // Update stats with more reliable values and error handling
    const stats = document.querySelectorAll('.col h5');
    
    if (stats && stats.length >= 3) {
        // Attendee count - ensure it displays properly
        const displayAttendeeCount = parseInt(event.attendeeCount || 0, 10);
        stats[0].textContent = isNaN(displayAttendeeCount) ? '0' : String(displayAttendeeCount);
        
        // Available seats
        if (typeof availableSeats === 'number' && !isNaN(availableSeats)) {
            stats[1].textContent = String(availableSeats);
        } else {
            // If we have maxAttendees but no availability calculation, just show maxAttendees
            if (typeof maxAttendees === 'number' && !isNaN(maxAttendees)) {
                stats[1].textContent = String(maxAttendees);
            } else {
                stats[1].textContent = '0';
            }
        }
        
        // Calculate days remaining - similar approach as date parsing above
        let daysRemaining = 0;
        if (event.date) {
            try {
                // Create a robust date parser
                let parsedDate = null;
                const dateStr = String(event.date).trim();
                
                // Try the most reliable parsing approach first
                if (dateStr.includes('T')) {
                    // ISO format with time
                    parsedDate = new Date(dateStr);
                } 
                else if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    // YYYY-MM-DD format
                    const [year, month, day] = dateStr.split('-').map(Number);
                    parsedDate = new Date(year, month - 1, day);
                }
                else if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                    // MM/DD/YYYY format
                    const [month, day, year] = dateStr.split('/').map(Number);
                    parsedDate = new Date(year, month - 1, day);
                }
                else {
                    // Try generic Date parsing as fallback
                    parsedDate = new Date(dateStr);
                }
                
                // Validate the parsed date
                if (parsedDate && !isNaN(parsedDate.getTime())) {
                    // Reset time components for more accurate day calculation
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    parsedDate.setHours(0, 0, 0, 0);
                    
                    const diffTime = parsedDate - today;
                    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                }
            } catch (e) {
                // Silently handle errors
            }
        }
          stats[2].textContent = daysRemaining > 0 ? daysRemaining : 'Past event';
    }
}

// Add event listener for check-in button
const checkInBtn = document.getElementById('checkInAttendeesBtn');
if (checkInBtn) {
    checkInBtn.addEventListener('click', async () => {
        await openCheckInModal();
    });
}

async function openCheckInModal() {
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');
    if (!eventId) return;
    const modal = new bootstrap.Modal(document.getElementById('checkInModal'));
    const tableBody = document.getElementById('checkInAttendeesTableBody');
    const searchInput = document.getElementById('attendeeSearchInput');
    tableBody.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';
    let attendees = [];
    try {
        const res = await attendeesApi.getAllAttendees(eventId);
        attendees = Array.isArray(res) ? res : (res.data || []);
    } catch {
        attendees = [];
    }
    // Add a checkedIn property if not present
    attendees.forEach(a => { if (typeof a.checkedIn === 'undefined') a.checkedIn = false; });
    // Render function
    function renderTable(filter = '') {
        const filtered = attendees.filter(a => a.phone && a.phone.toLowerCase().includes(filter.toLowerCase()));
        tableBody.innerHTML = filtered.length ? filtered.map(a => `
            <tr>
                <td>${a.name || ''}</td>
                <td>${a.phone || ''}</td>
                <td>${a.marketerName || ''}</td>
                <td>${a.transport || ''}</td>
                <td>
                    <button class="btn btn-sm btn-${a.checkedIn ? 'secondary' : 'success'}" ${a.checkedIn ? 'disabled' : ''} data-phone="${a.phone}">
                        ${a.checkedIn ? 'Checked In' : 'Check In'}
                    </button>
                </td>
            </tr>
        `).join('') : '<tr><td colspan="5">No attendees found.</td></tr>';
    }
    renderTable();
    // Search
    searchInput.value = '';
    searchInput.oninput = e => renderTable(e.target.value);
    // Check-in handler
    tableBody.onclick = async e => {
        const btn = e.target.closest('button[data-phone]');
        if (!btn) return;
        const phone = btn.getAttribute('data-phone');
        const attendee = attendees.find(a => a.phone === phone);
        if (!attendee || attendee.checkedIn) return;
        // Mark as checked in (simulate API call)
        try {
            await attendeesApi.checkInAttendee(eventId, phone); // You need to implement this API
            attendee.checkedIn = true;
            renderTable(searchInput.value);
        } catch {
            showToast('error', 'Failed to check in attendee');
        }
    };
    modal.show();
}