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
            row.innerHTML = `
                <td>${eventName}</td>
                <td>${formattedDate}</td>
                <td>${event.state || 'Location not available'}</td>
                <td><button class="btn btn-sm btn-primary request-concierge-btn" data-event-id="${eventId}" data-event-name="${eventName}">Request Assignment</button></td>
            `;
            tableBody.appendChild(row);
        }
        document.querySelectorAll('.request-concierge-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const eventId = e.currentTarget.getAttribute('data-event-id');
                await requestConciergeAssignment(eventId);
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
            const row = document.createElement('tr');
            const event = assignment.event || {};
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
            const status = assignment.status || 'Pending';
            row.innerHTML = `
                <td>${eventName}</td>
                <td>${formattedDate}</td>
                <td><span class="badge ${status === 'Approved' ? 'bg-success' : status === 'Rejected' ? 'bg-danger' : 'bg-warning text-dark'}">${status}</span></td>
                <td>${status === 'Approved' ? `<button class="btn btn-sm btn-success check-in-btn" data-event-id="${eventId}">Check-In</button>` : '-'}</td>
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
