// Concierge-related functions for admin dashboard

// Load concierge requests
async function loadConciergeRequests() {
    try {
        const response = await apiCall('/events/concierge-requests/pending', 'GET', null, auth.getToken());
        const requests = Array.isArray(response) ? response : (response.data || []);
        const tableBody = document.getElementById('concierge-requests-table-body');
        tableBody.innerHTML = '';
        if (!requests.length) {
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No pending requests.</td></tr>';
            return;
        }
        for (const req of requests) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${req.eventName}</td>
                <td>${new Date(req.eventDate).toLocaleDateString()}</td>
                <td>${req.user?.name || 'N/A'}</td>
                <td>${req.user?.email || 'N/A'}</td>
                <td>${req.user?.phone || 'N/A'}</td>
                <td>${new Date(req.requestedAt).toLocaleString()}</td>
                <td>
                    <button class="btn btn-success btn-sm approve-concierge" data-event-id="${req.eventId}" data-request-id="${req.requestId}">Approve</button>
                    <button class="btn btn-danger btn-sm reject-concierge" data-event-id="${req.eventId}" data-request-id="${req.requestId}">Reject</button>
                </td>
            `;
            tableBody.appendChild(row);
        }
        document.querySelectorAll('.approve-concierge').forEach(btn => {
            btn.addEventListener('click', () => reviewConciergeRequest(btn, true));
        });
        document.querySelectorAll('.reject-concierge').forEach(btn => {
            btn.addEventListener('click', () => reviewConciergeRequest(btn, false));
        });
    } catch (error) {
        showToast('error', 'Failed to load concierge requests');
    }
}

// Review concierge request
async function reviewConciergeRequest(btn, approve) {
    const eventId = btn.getAttribute('data-event-id');
    const requestId = btn.getAttribute('data-request-id');
    try {
        await apiCall(`/events/${eventId}/concierge-requests/${requestId}/review`, 'POST', { approve }, auth.getToken());
        showToast('success', `Request ${approve ? 'approved' : 'rejected'}`);
        await loadConciergeRequests();
        await loadApprovedConcierges();
    } catch (error) {
        showToast('error', 'Failed to review request');
    }
}

// Load approved concierges
async function loadApprovedConcierges() {
    try {
        const response = await apiCall('/events/concierge-requests/approved', 'GET', null, auth.getToken());
        const approved = Array.isArray(response) ? response : (response.data || []);
        const tableBody = document.getElementById('approved-concierges-table-body');
        tableBody.innerHTML = '';
        if (!approved.length) {
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No approved concierges.</td></tr>';
            return;
        }
        // Deduplicate by eventId + userId (concierge)
        const deduped = new Set();
        for (const item of approved) {
            // Use eventId and userId as the unique key
            const eventId = item.eventId?.toString() || '';
            const userId = item.user?._id?.toString() || item.user?.id?.toString() || '';
            const key = eventId + '|' + userId;
            if (deduped.has(key)) continue;
            deduped.add(key);
            const row = document.createElement('tr');
            const link = `concierge-checkins.html?eventId=${encodeURIComponent(eventId)}&conciergeId=${encodeURIComponent(userId)}`;
            row.innerHTML = `
                <td>${item.eventName}</td>
                <td>${new Date(item.eventDate).toLocaleDateString()}</td>
                <td>${item.user?.name || 'N/A'}</td>
                <td>${item.user?.email || 'N/A'}</td>
                <td>${item.reviewedAt ? new Date(item.reviewedAt).toLocaleString() : ''}</td>
            `;
            row.classList.add('table-row-link');
            row.style.cursor = 'pointer';
            row.addEventListener('click', () => {
                window.location.href = link;
            });
            // Add row styling to indicate it's clickable
            row.classList.add('approved-concierge-row');
            tableBody.appendChild(row);
        }
    } catch (error) {
        showToast('error', 'Failed to load approved concierges');
    }
}

// Setup concierge tab handlers 
function setupConciergeTabHandlers() {
    // Load both pending and approved when tab is shown
    const conciergeTab = document.getElementById('concierge-requests-tab');
    if (conciergeTab) {
        conciergeTab.addEventListener('shown.bs.tab', () => {
            loadConciergeRequests();
            loadApprovedConcierges();
        });
    }

    // Check if we need to activate the concierge tab on load (coming back from concierge-checkins.html)
    document.addEventListener('DOMContentLoaded', () => {
        const activeTab = sessionStorage.getItem('activeAdminTab');
        if (activeTab === 'concierge-requests') {
            const conciergeTab = document.getElementById('concierge-requests-tab');
            if (conciergeTab) {
                const tabTrigger = new bootstrap.Tab(conciergeTab);
                tabTrigger.show();
                sessionStorage.removeItem('activeAdminTab'); // Clear after use
            }
        }
    });
}

// Expose functions globally - this is simpler than using ES modules for browser compatibility
window.loadConciergeRequests = loadConciergeRequests;
window.reviewConciergeRequest = reviewConciergeRequest;
window.loadApprovedConcierges = loadApprovedConcierges;
window.setupConciergeTabHandlers = setupConciergeTabHandlers;

export {
  loadConciergeRequests,
  reviewConciergeRequest,
  loadApprovedConcierges,
  setupConciergeTabHandlers
};
