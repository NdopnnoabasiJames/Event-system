// Marketer Dashboard JavaScript
document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is authenticated and is a marketer
    if (!auth.isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    const user = auth.getUser();
    if (user.role !== 'marketer') {
        showToast('error', 'Only marketers can access this page');
        window.location.href = '../index.html';
        return;
    }

    try {
        // Update auth state
        updateAuthState();
        
        // Load marketer performance data
        await loadMarketerPerformance();
        
        // Load marketer's events
        await loadMarketerEvents();
        
        // Load registered attendees
        await loadMarketerAttendees();
    } catch (error) {
        console.error('Error loading marketer dashboard:', error);
        showToast('error', 'Failed to load dashboard data');
    }
});

async function loadMarketerPerformance() {
    try {
        const response = await apiCall('/marketers/analytics/performance', 'GET', null, auth.getToken());
        
        // Update performance summary
        document.getElementById('total-attendees').textContent = response.totalAttendeesRegistered;
        document.getElementById('events-participated').textContent = response.eventsParticipated;
        document.getElementById('avg-attendees').textContent = response.averageAttendeesPerEvent.toFixed(1);
    } catch (error) {
        console.error('Error loading performance data:', error);
        showToast('error', 'Failed to load performance data');
    }
}

async function loadMarketerEvents() {
    try {
        const events = await apiCall('/marketers/events/my', 'GET', null, auth.getToken());
        const tableBody = document.getElementById('events-table-body');
        const noEventsMessage = document.getElementById('no-events');
        
        if (events.length === 0) {
            tableBody.innerHTML = '';
            noEventsMessage.classList.remove('d-none');
            return;
        }
        
        noEventsMessage.classList.add('d-none');
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
            
            row.innerHTML = `
                <td>${event.name}</td>
                <td>${formattedDate}</td>
                <td id="attendee-count-${event._id}">Loading...</td>
                <td>
                    <button class="btn btn-sm btn-info view-performance" data-event-id="${event._id}">
                        <i class="bi bi-graph-up"></i> View Performance
                    </button>
                </td>
            `;
            
            tableBody.appendChild(row);
            
            // Load attendee count for this event
            loadEventAttendeeCount(event._id);
        }
        
        // Add event listeners for performance buttons
        document.querySelectorAll('.view-performance').forEach(button => {
            button.addEventListener('click', (e) => {
                const eventId = e.currentTarget.getAttribute('data-event-id');
                showEventPerformance(eventId);
            });
        });
    } catch (error) {
        console.error('Error loading marketer events:', error);
        showToast('error', 'Failed to load events');
    }
}

async function loadEventAttendeeCount(eventId) {
    try {
        const response = await apiCall(`/marketers/analytics/event/${eventId}`, 'GET', null, auth.getToken());
        const countElement = document.getElementById(`attendee-count-${eventId}`);
        
        if (countElement) {
            countElement.textContent = response.attendeesCount;
        }
    } catch (error) {
        console.error(`Error loading attendee count for event ${eventId}:`, error);
        const countElement = document.getElementById(`attendee-count-${eventId}`);
        if (countElement) {
            countElement.textContent = 'Error';
        }
    }
}

async function loadMarketerAttendees() {
    try {
        const attendees = await apiCall('/marketers/attendees', 'GET', null, auth.getToken());
        const tableBody = document.getElementById('attendees-table-body');
        const noAttendeesMessage = document.getElementById('no-attendees');
        
        if (attendees.length === 0) {
            tableBody.innerHTML = '';
            noAttendeesMessage.classList.remove('d-none');
            return;
        }
        
        noAttendeesMessage.classList.add('d-none');
        tableBody.innerHTML = '';
        
        // Sort attendees by creation date (newest first)
        attendees.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        // Show the 10 most recent attendees
        const recentAttendees = attendees.slice(0, 10);
        
        for (const attendee of recentAttendees) {
            const row = document.createElement('tr');
            
            // Format date
            const registrationDate = new Date(attendee.createdAt);
            const formattedDate = registrationDate.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
            
            row.innerHTML = `
                <td>${attendee.name}</td>
                <td>${attendee.email}</td>
                <td>${attendee.event.name}</td>
                <td>${attendee.transportPreference === 'bus' ? 
                    `<span class="badge bg-success">Bus (${attendee.busPickup?.location || 'N/A'})</span>` : 
                    '<span class="badge bg-secondary">Private</span>'}
                </td>
                <td>${formattedDate}</td>
            `;
            
            tableBody.appendChild(row);
        }
    } catch (error) {
        console.error('Error loading marketer attendees:', error);
        showToast('error', 'Failed to load attendees');
    }
}

async function showEventPerformance(eventId) {
    try {
        const performanceData = await apiCall(`/marketers/analytics/event/${eventId}`, 'GET', null, auth.getToken());
        
        // Update modal content
        document.getElementById('event-name').textContent = performanceData.event.name;
        document.getElementById('event-date').textContent = new Date(performanceData.event.date)
            .toLocaleDateString('en-US', { 
                weekday: 'long',
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
        document.getElementById('event-attendees-count').textContent = performanceData.attendeesCount;
        
        // Populate attendees table
        const attendeesTable = document.getElementById('event-attendees-table');
        attendeesTable.innerHTML = '';
        
        if (performanceData.attendees.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="3" class="text-center">No attendees registered yet</td>';
            attendeesTable.appendChild(row);
        } else {
            performanceData.attendees.forEach(attendee => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${attendee.name}</td>
                    <td>${attendee.email}</td>
                    <td>${attendee.transportPreference === 'bus' ? 'Bus' : 'Private'}</td>
                `;
                attendeesTable.appendChild(row);
            });
        }
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('eventPerformanceModal'));
        modal.show();
    } catch (error) {
        console.error(`Error loading event performance for event ${eventId}:`, error);
        showToast('error', 'Failed to load event performance data');
    }
}
