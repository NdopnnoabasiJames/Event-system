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
        const response = await apiCall('/events/upcoming', 'GET', null, auth.getToken());
        const events = response.data || response;
        const tableBody = document.getElementById('upcoming-events-table-body');
        tableBody.innerHTML = '';
        if (!Array.isArray(events) || events.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4" class="text-center">No upcoming events.</td></tr>';
            return;
        }
        for (const event of events) {
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
            // Check if the concierge has already requested for this event
            let hasRequested = false;
            if (event.conciergeRequests && Array.isArray(event.conciergeRequests)) {
                const myId = auth.getUser()._id;
                hasRequested = event.conciergeRequests.some(r => {
                    // r.user could be an object or string
                    const requestUserId = typeof r.user === 'object' && r.user !== null ? r.user._id || r.user.toString() : r.user;
                    return requestUserId === myId && r.status === 'Pending';
                });
            }
            row.innerHTML = `
                <td>${eventName}</td>
                <td>${formattedDate}</td>
                <td>${event.state || 'Location not available'}</td>
                <td>
                    <button class="btn btn-sm ${hasRequested ? 'btn-danger cancel-concierge-request-btn' : 'btn-primary request-concierge-btn'}" 
                        data-event-id="${eventId}" data-event-name="${eventName}">
                        ${hasRequested ? 'Cancel Request' : 'Request Assignment'}
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        }
        // Refactored: handle button state instantly on click
        tableBody.querySelectorAll('.request-concierge-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const button = e.currentTarget;
                const eventId = button.getAttribute('data-event-id');
                button.disabled = true;
                const originalText = button.textContent;
                try {
                    await requestConciergeAssignment(eventId);
                    // Instantly update button to Cancel Request
                    button.classList.remove('btn-primary', 'request-concierge-btn');
                    button.classList.add('btn-danger', 'cancel-concierge-request-btn');
                    button.textContent = 'Cancel Request';
                    button.disabled = false;
                    // Remove old event listener and add cancel
                    const newBtn = button;
                    newBtn.replaceWith(newBtn.cloneNode(true));
                    const cancelBtn = tableBody.querySelector(`[data-event-id="${eventId}"]`);
                    cancelBtn.addEventListener('click', async (e) => {
                        const btn = e.currentTarget;
                        btn.disabled = true;
                        await cancelConciergeRequest(eventId);
                        // Instantly update button to Request Assignment
                        btn.classList.remove('btn-danger', 'cancel-concierge-request-btn');
                        btn.classList.add('btn-primary', 'request-concierge-btn');
                        btn.textContent = 'Request Assignment';
                        btn.disabled = false;
                        btn.replaceWith(btn.cloneNode(true));
                        const reqBtn = tableBody.querySelector(`[data-event-id="${eventId}"]`);
                        reqBtn.addEventListener('click', async (e) => {
                            const btn2 = e.currentTarget;
                            btn2.disabled = true;
                            await requestConciergeAssignment(eventId);
                            btn2.classList.remove('btn-primary', 'request-concierge-btn');
                            btn2.classList.add('btn-danger', 'cancel-concierge-request-btn');
                            btn2.textContent = 'Cancel Request';
                            btn2.disabled = false;
                        });
                    });
                } catch (error) {
                    button.textContent = originalText;
                    button.disabled = false;
                }
            });
        });
    } catch (error) {
        showToast('error', 'Failed to load upcoming events');
    }
}

async function requestConciergeAssignment(eventId) {
    try {
        await apiCall(`/events/${eventId}/concierge-requests`, 'POST', {}, auth.getToken());
        showToast('success', 'Request sent to admin for approval');
        await loadMyAssignments();
    } catch (error) {
        showToast('error', 'Failed to send request');
    }
}

// Cancel a pending concierge request for the current user/event
async function cancelConciergeRequest(eventId) {
    try {
        await apiCall(`/events/${eventId}/concierge-requests`, 'DELETE', null, auth.getToken());
        showToast('success', 'Request cancelled');
        await loadMyAssignments();
    } catch (error) {
        showToast('error', 'Failed to cancel request');
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
