// Admin Dashboard JavaScript

// Import marketer management functions
import { loadTopMarketers, showMarketerDetails, setupMarketerFilter } from './modules/marketer-manager.js';

// Import states and branches data
import { statesAndBranches } from './modules/states-branches.js';

// Import events management functions
import { loadEventsData, setupEventFilter, setupEventCreationHandlers, formatEventData } from './modules/events-manager.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is authenticated
    if (!auth.isAuthenticated()) {
        showToast('error', 'Please login to access the admin dashboard');
        window.location.href = 'login.html';
        return;
    }

    // Check if user is an admin
    const user = auth.getUser();
      if (user.role !== 'admin') {
        showToast('error', 'Only administrators can access this page');
        
        // Redirect to appropriate dashboard based on role
        if (user.role === 'marketer') {
            window.location.href = 'marketer-dashboard.html';
        } else {
            window.location.href = '../index.html';
        }
        return;
    }    try {
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

        // Load concierge data
        await loadConciergeRequests();
        await loadApprovedConcierges();
          
        // Add event listener for event filter
        const eventFilter = document.getElementById('event-filter');
        if (eventFilter) {
            eventFilter.addEventListener('change', loadAttendeesData);
        }

        // Populate and add event listener for marketer filter
        await setupMarketerFilter();
        const marketerFilter = document.getElementById('marketer-filter');
        if (marketerFilter) {
            marketerFilter.addEventListener('change', loadAttendeesData);
        }
          
        // Setup event creation handlers with better error handling
        try {
            await setupEventCreationHandlers();
        } catch (error) {
            // We don't need to show another toast here since setupEventCreationHandlers already does
        }    } catch (error) {
        showToast('error', 'Failed to load dashboard data');
    }
});

async function loadAttendeesData() {
    try {
        // Get filter values
        const eventId = document.getElementById('event-filter').value;
        const marketerId = document.getElementById('marketer-filter').value;
        
        // Construct the endpoint with query parameters
        let endpoint = '/attendees';
        const queryParams = [];
        
        if (eventId) {
            queryParams.push(`eventId=${eventId}`);
        }
        
        if (queryParams.length > 0) {
            endpoint += '?' + queryParams.join('&');
        }
        
        const response = await apiCall(endpoint, 'GET', null, auth.getToken());
        const attendees = Array.isArray(response) ? response : (response.data || []);
        
        const tableBody = document.getElementById('attendees-table-body');
        
        tableBody.innerHTML = '';
        
        if (!attendees || attendees.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No attendees found</td></tr>';
            return;
        }
        
        // Filter by marketer if selected
        let filteredAttendees = attendees;
        if (marketerId) {
            filteredAttendees = attendees.filter(attendee => {
                // Check if registeredBy exists and matches the selected marketer ID
                const attendeeMarketerId = attendee.registeredBy?._id || 
                                          (typeof attendee.registeredBy === 'string' ? attendee.registeredBy : null);
                return attendeeMarketerId === marketerId;
            });
            
            // Update the table if no attendees match the marketer filter
            if (filteredAttendees.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="9" class="text-center">No attendees found for this marketer</td></tr>';
                return;
            }
        }
        
        // Sort attendees by registration date (newest first)
        filteredAttendees.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          for (const attendee of filteredAttendees) {
            const row = document.createElement('tr');
            
            // Format date
            const registrationDate = new Date(attendee.createdAt);
            const formattedDate = registrationDate.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
            
            // Get marketer name
            const marketerName = attendee.registeredBy?.name || 'System';            // Get event name, handling both populated objects and string IDs
            let eventName = 'Unknown Event';
            if (attendee.event) {
                if (typeof attendee.event === 'object' && attendee.event.name) {
                    eventName = attendee.event.name;
                } else if (typeof attendee.event === 'string') {
                    eventName = 'Event ID: ' + attendee.event;
                }
            }
              row.innerHTML = `
                <td>${attendee.name}</td>
                <td>${attendee.phone || 'Not provided'}</td>
                <td>${eventName}</td>
                <td>${attendee.state || 'N/A'}</td>
                <td>${attendee.branch || 'N/A'}</td>
                <td>${marketerName}</td>
                <td>${attendee.transportPreference === 'bus' ? 
                    `<span class="badge bg-success">Bus (${attendee.busPickup?.location || 'N/A'})</span>` : 
                    '<span class="badge bg-secondary">Private</span>'}
                </td>
                <td>${formattedDate}</td>
                <td>${attendee.checkedIn ? 
                    '<span class="badge bg-success">Checked In</span>' : 
                    '<span class="badge bg-warning text-dark">Not Checked In</span>'}
                </td>
            `;
            
            tableBody.appendChild(row);
        }    } catch (error) {
        showToast('error', 'Failed to load attendees data');
    }
}

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

async function reviewConciergeRequest(btn, approve) {
    const eventId = btn.getAttribute('data-event-id');
    const requestId = btn.getAttribute('data-request-id');
    try {
        await apiCall(`/events/${eventId}/concierge-requests/${requestId}/review`, 'POST', { approve }, auth.getToken());
        showToast('success', `Request ${approve ? 'approved' : 'rejected'}`);
        await loadConciergeRequests();
    } catch (error) {
        showToast('error', 'Failed to review request');
    }
}

// New function to load approved concierges
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
            });            // Add row styling to indicate it's clickable
            row.classList.add('approved-concierge-row');
            tableBody.appendChild(row);
        }
    } catch (error) {
        showToast('error', 'Failed to load approved concierges');
    }
}

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
    if (isNaN(d.getTime())) return undefined;    return d.toISOString().split('T')[0];
}
