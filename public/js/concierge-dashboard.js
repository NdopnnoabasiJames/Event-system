// Concierge Dashboard JavaScript

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
    document.getElementById('conciergeName').textContent = user.name || 'Concierge';
    setupLogout();
    await loadUpcomingEvents();
    await loadMyAssignments();
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

async function loadUpcomingEvents() {
    try {
        // First, get the concierge's assignments to identify events that are already assigned
        const assignmentsResponse = await apiCall('/concierges/assignments', 'GET', null, auth.getToken());
        const myAssignments = assignmentsResponse.data || assignmentsResponse;
        
        // Create a set of event IDs that this concierge is already assigned to
        const assignedEventIds = new Set();
        if (Array.isArray(myAssignments)) {
            myAssignments.forEach(assignment => {
                const eventId = assignment._id || assignment.id;
                if (eventId) assignedEventIds.add(eventId);
            });
        }
        
        const response = await apiCall('/events/upcoming', 'GET', null, auth.getToken());
        const events = response.data || response;
        const tableBody = document.getElementById('upcoming-events-table-body');
        tableBody.innerHTML = '';
        
        // Filter out events where the concierge has already requested or is assigned
        const myId = auth.getUser()._id;
        const filteredEvents = events.filter(event => {
            const eventId = event._id || event.id;
            
            // Skip if already assigned to this event
            if (assignedEventIds.has(eventId)) return false;
            
            // Check for any pending requests
            if (!event.conciergeRequests || !Array.isArray(event.conciergeRequests)) return true;
            
            // If the current user has any request for this event, exclude it
            return !event.conciergeRequests.some(r => {
                const requestUserId = typeof r.user === 'object' && r.user !== null ? r.user._id || r.user.toString() : r.user;
                return requestUserId === myId;
            });
        });
        if (!Array.isArray(filteredEvents) || filteredEvents.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4" class="text-center">No upcoming events.</td></tr>';
            return;
        }
        for (const event of filteredEvents) {
            const row = document.createElement('tr');
            const eventId = event._id || event.id || 'unknown';
            const eventName = event.name || 'Unnamed event';
            let formattedDate = 'Date not available';
            try {
                if (event.date) {
                    const eventDate = new Date(event.date);
                    formattedDate = eventDate.toLocaleDateString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric'
                    });
                }
            } catch {}
            // No need to check hasRequested, since filteredEvents already excludes requested events
            row.innerHTML = `
                <td>${eventName}</td>
                <td>${formattedDate}</td>
                <td>${event.state || 'Location not available'}</td>
                <td>
                    <button class="btn btn-sm btn-primary request-concierge-btn" 
                        data-event-id="${eventId}" data-event-name="${eventName}">
                        Request Assignment
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        }
        
        // Add event listeners to all request buttons
        attachRequestButtonListeners();
    } catch (error) {
        showToast('error', 'Failed to load upcoming events');
    }
}

function attachRequestButtonListeners() {
    // Attach listeners to all request buttons
    document.querySelectorAll('.request-concierge-btn').forEach(btn => {
        btn.addEventListener('click', handleRequestButtonClick);
    });
    
    // Attach listeners to all cancel buttons (if any exist)
    document.querySelectorAll('.cancel-concierge-request-btn').forEach(btn => {
        btn.addEventListener('click', handleCancelButtonClick);
    });
}

async function handleRequestButtonClick(e) {
    const button = e.currentTarget;
    const eventId = button.getAttribute('data-event-id');
    
    // Disable button during API call
    button.disabled = true;
    button.textContent = 'Processing...';
    
    try {
        await requestConciergeAssignment(eventId);
        
        // Update button to Cancel Request
        button.classList.remove('btn-primary', 'request-concierge-btn');
        button.classList.add('btn-danger', 'cancel-concierge-request-btn');
        button.textContent = 'Cancel Request';
        
        // Remove old listener and add new cancel listener
        button.removeEventListener('click', handleRequestButtonClick);
        button.addEventListener('click', handleCancelButtonClick);
    } catch (error) {
        // Reset button on error
        button.classList.add('btn-primary', 'request-concierge-btn');
        button.textContent = 'Request Assignment';
    } finally {
        button.disabled = false;
    }
}

async function handleCancelButtonClick(e) {
    const button = e.currentTarget;
    const eventId = button.getAttribute('data-event-id');
    
    // Disable button during API call
    button.disabled = true;
    button.textContent = 'Processing...';
    
    try {
        await cancelConciergeRequest(eventId);
        
        // Update button back to Request Assignment
        button.classList.remove('btn-danger', 'cancel-concierge-request-btn');
        button.classList.add('btn-primary', 'request-concierge-btn');
        button.textContent = 'Request Assignment';
        
        // Remove old listener and add new request listener
        button.removeEventListener('click', handleCancelButtonClick);
        button.addEventListener('click', handleRequestButtonClick);
    } catch (error) {
        // Reset button on error
        button.classList.add('btn-danger', 'cancel-concierge-request-btn');
        button.textContent = 'Cancel Request';
    } finally {
        button.disabled = false;
    }
}

async function requestConciergeAssignment(eventId) {
    try {
        await apiCall(`/events/${eventId}/concierge-requests`, 'POST', {}, auth.getToken());
        showToast('success', 'Request sent to admin for approval');
        await loadMyAssignments();
        // After a successful request, refresh the upcoming events list
        // This will ensure events with pending requests are no longer shown
        await loadUpcomingEvents();
    } catch (error) {
        showToast('error', 'Failed to send request');
        throw error; // Rethrow to handle in the calling function
    }
}

async function cancelConciergeRequest(eventId) {
    try {
        await apiCall(`/events/${eventId}/concierge-requests`, 'DELETE', null, auth.getToken());
        showToast('success', 'Request cancelled');
        await loadMyAssignments();
        // After a successful cancellation, refresh the upcoming events list
        // This ensures consistency between the two tables
        await loadUpcomingEvents();
    } catch (error) {
        showToast('error', 'Failed to cancel request');
        throw error; // Rethrow to handle in the calling function
    }
}

async function loadMyAssignments() {
    try {
        const response = await apiCall('/concierges/assignments', 'GET', null, auth.getToken());
        const assignments = response.data || response;
        const tableBody = document.getElementById('my-assignments-table-body');
        tableBody.innerHTML = '';
        if (!Array.isArray(assignments) || assignments.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4" class="text-center">No assignments yet.</td></tr>';
            return;
        }
        for (const assignment of assignments) {
            const eventId = assignment._id || assignment.id || 'unknown';
            const eventName = assignment.name || 'Unnamed event';
            let formattedDate = 'Date not available';
            try {
                if (assignment.date) {
                    const eventDate = new Date(assignment.date);
                    formattedDate = eventDate.toLocaleDateString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric'
                    });
                }
            } catch {}
            const status = assignment.myConciergeStatus || 'Pending';
            const checkInBtn = status === 'Approved'
                ? `<button class="btn btn-sm btn-success check-in-btn" data-event-id="${eventId}">Check-In</button>`
                : '-';
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${eventName}</td>
                <td>${formattedDate}</td>
                <td><span class="badge ${status === 'Approved' ? 'bg-success' : status === 'Rejected' ? 'bg-danger' : 'bg-warning text-dark'}">${status}</span></td>
                <td>${checkInBtn}</td>
            `;
            tableBody.appendChild(row);
        }
        document.querySelectorAll('.check-in-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const eventId = e.currentTarget.getAttribute('data-event-id');
                openCheckInModal(eventId);
            });
        });
    } catch (error) {
        showToast('error', 'Failed to load assignments');
    }
}

function openCheckInModal(eventId) {
    document.getElementById('checkInEventId').value = eventId;
    document.getElementById('attendeePhone').value = '';
    document.getElementById('checkInResult').innerHTML = '';
    const modal = new bootstrap.Modal(document.getElementById('checkInModal'));
    modal.show();
}

document.getElementById('checkInForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const eventId = document.getElementById('checkInEventId').value;
    const phone = document.getElementById('attendeePhone').value.trim();
    if (!phone) {
        document.getElementById('checkInResult').innerHTML = '<div class="alert alert-danger">Please enter a phone number.</div>';
        return;
    }
    try {
        await apiCall(`/events/${eventId}/check-in`, 'POST', { phone }, auth.getToken());
        document.getElementById('checkInResult').innerHTML = '<div class="alert alert-success">Attendee checked in successfully!</div>';
    } catch (error) {
        document.getElementById('checkInResult').innerHTML = '<div class="alert alert-danger">Check-in failed. Please verify the phone number and try again.</div>';
    }
});