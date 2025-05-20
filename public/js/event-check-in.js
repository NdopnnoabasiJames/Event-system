// Event Check-In Dashboard JavaScript

document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is authenticated and is a concierge
    if (!auth.isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }
    const user = auth.getUser();
    if (user.role !== 'concierge') {
        showToast('error', 'Only concierges can access this page');
        window.location.href = '../index.html';
        return;
    }

    // Get the event ID from URL parameter
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('eventId');
    
    if (!eventId) {
        showToast('error', 'Event ID is missing');
        window.location.href = 'concierge-dashboard.html';
        return;
    }

    setupLogout();
    await loadEventDetails(eventId);
    await loadEventAttendees(eventId);
    setupSearch(eventId);
});

function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            auth.logout();
            window.location.href = 'login.html';
        });
    }
}

async function loadEventDetails(eventId) {
    try {
        const response = await apiCall(`/events/${eventId}`, 'GET', null, auth.getToken());
        const event = response.data || response;
        document.getElementById('eventName').textContent = `Check-In: ${event.name || 'Event'}`;
        document.title = `Check-In: ${event.name || 'Event'}`;
    } catch (error) {
        showToast('error', 'Failed to load event details');
    }
}

async function loadEventAttendees(eventId) {
    try {
        // Using the general attendees endpoint with eventId as query parameter
        const response = await apiCall(`/attendees?eventId=${eventId}`, 'GET', null, auth.getToken());
        const attendees = response.data || response;
        displayAttendees(attendees, eventId);
    } catch (error) {
        console.error('Error loading attendees:', error);
        document.getElementById('attendees-table-body').innerHTML = 
            '<tr><td colspan="5" class="text-center">No attendees registered for this event</td></tr>';
    }
}

function displayAttendees(attendees, eventId) {
    const tableBody = document.getElementById('attendees-table-body');
    tableBody.innerHTML = '';
    
    // Handle undefined, null, or empty arrays
    if (!attendees || !Array.isArray(attendees) || attendees.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No attendees registered for this event</td></tr>';
        return;
    }
    
    for (const attendee of attendees) {
        const row = document.createElement('tr');
        const attendeeId = attendee._id || attendee.id || 'unknown';
        const name = attendee.name || 'Name not available';
        const email = attendee.email || 'Email not available';
        const phone = attendee.phone || 'Phone not available';
        const checkedIn = attendee.checkedIn || false;
        
        const statusBadge = checkedIn 
            ? '<span class="badge bg-success">Checked In</span>' 
            : '<span class="badge bg-warning text-dark">Not Checked In</span>';
        
        const checkInButton = checkedIn
            ? '<button class="btn btn-sm btn-secondary" disabled>Checked In</button>'
            : `<button class="btn btn-sm btn-success check-in-btn" data-attendee-id="${attendeeId}" data-phone="${phone}">Check In</button>`;
        
        row.innerHTML = `
            <td>${name}</td>
            <td>${email}</td>
            <td>${phone}</td>
            <td>${statusBadge}</td>
            <td>${checkInButton}</td>
        `;
        tableBody.appendChild(row);
    }
    
    // Add event listeners to check-in buttons
    document.querySelectorAll('.check-in-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const button = e.currentTarget;
            const phone = button.getAttribute('data-phone');
            
            button.disabled = true;
            button.textContent = 'Processing...';
            
            try {
                await checkInAttendee(eventId, phone);
                
                // Update UI after successful check-in
                const parentRow = button.closest('tr');
                parentRow.querySelector('td:nth-child(4)').innerHTML = '<span class="badge bg-success">Checked In</span>';
                button.classList.remove('btn-success');
                button.classList.add('btn-secondary');
                button.textContent = 'Checked In';
                button.disabled = true;
                
                showToast('success', 'Attendee checked in successfully!');
            } catch (error) {
                button.disabled = false;
                button.textContent = 'Check In';
                showToast('error', 'Check-in failed. Please try again.');
            }
        });
    });
}

async function checkInAttendee(eventId, phone) {
    try {
        await apiCall(`/events/${eventId}/check-in`, 'POST', { phone }, auth.getToken());
    } catch (error) {
        console.error('Check-in failed:', error);
        throw error;
    }
}

function setupSearch(eventId) {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    
    const performSearch = async () => {
        const searchTerm = searchInput.value.trim().toLowerCase();
        if (!searchTerm) {
            // If search is empty, load all attendees
            await loadEventAttendees(eventId);
            return;
        }
          try {
            const response = await apiCall(`/attendees?eventId=${eventId}`, 'GET', null, auth.getToken());
            const attendees = response.data || response;
            
            // Filter attendees based on search term
            const filteredAttendees = attendees.filter(attendee => {
                return (
                    (attendee.name && attendee.name.toLowerCase().includes(searchTerm)) ||
                    (attendee.email && attendee.email.toLowerCase().includes(searchTerm)) ||
                    (attendee.phone && attendee.phone.includes(searchTerm))
                );
            });
            
            displayAttendees(filteredAttendees, eventId);
        } catch (error) {
            console.error('Search failed:', error);
            // Don't use showToast here to avoid potential recursion
            document.getElementById('attendees-table-body').innerHTML = 
                '<tr><td colspan="5" class="text-center">Search failed</td></tr>';
        }
    };
    
    // Search button click
    searchButton.addEventListener('click', performSearch);
    
    // Enter key in search input
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
}

// Helper function to show toast messages
function showToast(type, message) {
    // Check for global showToast function first, but prevent recursion
    if (window.showToast && window.showToast !== showToast) {
        window.showToast(type, message);
    } else {
        // Fallback to alert if no global function exists
        alert(`${type.toUpperCase()}: ${message}`);
    }
}
