// Admin Dashboard JavaScript
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Admin dashboard loading...');
    
    // Check if user is authenticated
    if (!auth.isAuthenticated()) {
        console.log('User not authenticated, redirecting to login');
        showToast('error', 'Please login to access the admin dashboard');
        window.location.href = 'login.html';
        return;
    }

    // Check if user is an admin
    const user = auth.getUser();
    console.log('User role:', user.role);
    
    if (user.role !== 'admin') {
        console.log('User is not an admin, redirecting to home page');
        showToast('error', 'Only administrators can access this page');
        
        // Redirect to appropriate dashboard based on role
        if (user.role === 'marketer') {
            window.location.href = 'marketer-dashboard.html';
        } else {
            window.location.href = '../index.html';
        }
        return;
    }
    
    console.log('Admin authentication confirmed, loading dashboard');

    try {
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
        
        // Add event listener for event filter
        document.getElementById('event-filter').addEventListener('change', loadAttendeesData);
    } catch (error) {
        console.error('Error loading admin dashboard:', error);
        showToast('error', 'Failed to load dashboard data');
    }
});

async function loadTopMarketers() {
    try {
        const marketers = await marketersApi.getTopMarketers();
        const tableBody = document.getElementById('marketers-table-body');
        const noMarketersMessage = document.getElementById('no-marketers');
        
        if (!marketers || marketers.length === 0) {
            tableBody.innerHTML = '';
            noMarketersMessage.classList.remove('d-none');
            return;
        }
        
        noMarketersMessage.classList.add('d-none');
        tableBody.innerHTML = '';
        
        marketers.forEach((item, index) => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${item.marketer.name}</td>
                <td>${item.marketer.email}</td>
                <td>${item.stats.totalAttendeesRegistered}</td>
                <td>${item.stats.eventsParticipated}</td>
                <td>${item.stats.averageAttendeesPerEvent.toFixed(1)}</td>
                <td>
                    <button class="btn btn-sm btn-info view-marketer" data-marketer-id="${item.marketer.id}">
                        <i class="bi bi-info-circle"></i> Details
                    </button>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
        
        // Add event listeners for marketer detail buttons
        document.querySelectorAll('.view-marketer').forEach(button => {
            button.addEventListener('click', (e) => {
                const marketerId = e.currentTarget.getAttribute('data-marketer-id');
                showMarketerDetails(marketerId);
            });
        });
    } catch (error) {
        console.error('Error loading top marketers:', error);
        showToast('error', 'Failed to load marketers data');
    }
}

async function loadEventsData() {
    try {
        const events = await eventsApi.getAllEvents();
        const tableBody = document.getElementById('events-table-body');
        
        tableBody.innerHTML = '';
        
        for (const event of events) {
            const row = document.createElement('tr');
            
            // Format date
            const eventDate = new Date(event.date);
            const formattedDate = eventDate.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
            
            // Determine status
            let statusBadge;
            if (new Date() > eventDate) {
                statusBadge = '<span class="badge bg-secondary">Past</span>';
            } else if (event.status === 'cancelled') {
                statusBadge = '<span class="badge bg-danger">Cancelled</span>';
            } else {
                statusBadge = '<span class="badge bg-success">Active</span>';
            }
            
            row.innerHTML = `
                <td>${event.name}</td>
                <td>${formattedDate}</td>
                <td>${statusBadge}</td>
                <td>${event.attendeeCount || 0}</td>
                <td>${event.marketers?.length || 0}</td>
                <td>
                    <a href="event-details.html?id=${event._id}" class="btn btn-sm btn-primary">
                        <i class="bi bi-eye"></i> View
                    </a>
                </td>
            `;
            
            tableBody.appendChild(row);
        }
    } catch (error) {
        console.error('Error loading events:', error);
        showToast('error', 'Failed to load events data');
    }
}

async function setupEventFilter() {
    try {
        const events = await eventsApi.getAllEvents();
        const selectElement = document.getElementById('event-filter');
        
        // Clear existing options except the first one
        while (selectElement.options.length > 1) {
            selectElement.remove(1);
        }
        
        // Sort events by date (newest first)
        events.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Add event options
        events.forEach(event => {
            const option = document.createElement('option');
            option.value = event._id;
            option.textContent = event.name;
            selectElement.appendChild(option);
        });
    } catch (error) {
        console.error('Error setting up event filter:', error);
    }
}

async function loadAttendeesData() {
    try {
        const eventId = document.getElementById('event-filter').value;
        const endpoint = eventId ? `/attendees?eventId=${eventId}` : '/attendees';
        
        const attendees = await apiCall(endpoint, 'GET', null, auth.getToken());
        const tableBody = document.getElementById('attendees-table-body');
        
        tableBody.innerHTML = '';
        
        // Sort attendees by registration date (newest first)
        attendees.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        for (const attendee of attendees) {
            const row = document.createElement('tr');
            
            // Format date
            const registrationDate = new Date(attendee.createdAt);
            const formattedDate = registrationDate.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
            
            // Get marketer name
            const marketerName = attendee.registeredBy?.name || 'System';
            
            row.innerHTML = `
                <td>${attendee.name}</td>
                <td>${attendee.email}</td>
                <td>${attendee.event.name}</td>
                <td>${marketerName}</td>
                <td>${attendee.transportPreference === 'bus' ? 
                    `<span class="badge bg-success">Bus (${attendee.busPickup?.location || 'N/A'})</span>` : 
                    '<span class="badge bg-secondary">Private</span>'}
                </td>
                <td>${formattedDate}</td>
            `;
            
            tableBody.appendChild(row);
        }
    } catch (error) {
        console.error('Error loading attendees:', error);
        showToast('error', 'Failed to load attendees data');
    }
}

async function showMarketerDetails(marketerId) {
    try {
        // Get marketer user info
        const marketer = await apiCall(`/users/${marketerId}`, 'GET', null, auth.getToken());
        
        // Get marketer performance stats
        const stats = await apiCall(`/marketers/analytics/performance?marketerId=${marketerId}`, 'GET', null, auth.getToken());
        
        // Get marketer events
        const events = await apiCall(`/marketers/events/my?marketerId=${marketerId}`, 'GET', null, auth.getToken());
        
        // Update modal content
        document.getElementById('marketer-name').textContent = marketer.name;
        document.getElementById('marketer-email').textContent = marketer.email;
        document.getElementById('marketer-total-attendees').textContent = stats.totalAttendeesRegistered;
        document.getElementById('marketer-events').textContent = stats.eventsParticipated;
        document.getElementById('marketer-avg').textContent = stats.averageAttendeesPerEvent.toFixed(1);
        
        // Populate events table
        const eventsTable = document.getElementById('marketer-events-table');
        eventsTable.innerHTML = '';
        
        if (events.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="3" class="text-center">No events found</td>';
            eventsTable.appendChild(row);
        } else {
            for (const event of events) {
                // Get attendee count for this event and marketer
                const eventStats = await apiCall(
                    `/marketers/analytics/event/${event._id}?marketerId=${marketerId}`,
                    'GET', 
                    null, 
                    auth.getToken()
                );
                
                const row = document.createElement('tr');
                
                // Format date
                const eventDate = new Date(event.date);
                const formattedDate = eventDate.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                });
                
                row.innerHTML = `
                    <td>${event.name}</td>
                    <td>${formattedDate}</td>
                    <td>${eventStats.attendeesCount}</td>
                `;
                
                eventsTable.appendChild(row);
            }
        }
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('marketerDetailModal'));
        modal.show();
    } catch (error) {
        console.error(`Error loading marketer details for ${marketerId}:`, error);
        showToast('error', 'Failed to load marketer details');
    }
}
