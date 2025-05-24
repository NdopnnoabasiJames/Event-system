// Marketer Dashboard JavaScript

// Import event management functions
import { 
    loadMarketerEvents, 
    loadAvailableEvents, 
    setupEventTabs, 
    setupAttendeeRegistrationHandlers,
    getCheckInStatusDisplay
} from './marketer/modules/events-manager.js';

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
          // Set up tab functionality
        setupEventTabs();
        
        // Set up attendee registration handlers
        setupAttendeeRegistrationHandlers();
        
        // Load marketer performance data
        await loadMarketerPerformance();
        
        // Load marketer's events
        await loadMarketerEvents();
        
        // Load available events that marketers can volunteer for
        await loadAvailableEvents();
        
        // Load registered attendees
        await loadMarketerAttendees();    } catch (error) {
        showToast('error', 'Failed to load dashboard data');
    }
});



async function loadMarketerPerformance() {    try {
        const responseData = await apiCall('/marketers/analytics/performance', 'GET', null, auth.getToken());
        
        // Handle different response formats
        const response = responseData.data || responseData;
        
        // Update performance summary with safe access
        document.getElementById('total-attendees').textContent = response?.totalAttendeesRegistered || 0;
        document.getElementById('events-participated').textContent = response?.eventsParticipated || 0;
        
        // Safely handle average calculation
        let avgAttendees = 0;
        if (response && typeof response.averageAttendeesPerEvent === 'number') {
            avgAttendees = response.averageAttendeesPerEvent.toFixed(1);
        } else if (response?.totalAttendeesRegistered && response?.eventsParticipated) {
            // Calculate average if not provided but we have the components
            avgAttendees = (response.totalAttendeesRegistered / response.eventsParticipated).toFixed(1);
        }
        
        document.getElementById('avg-attendees').textContent = avgAttendees;    } catch (error) {
        showToast('error', 'Failed to load performance data');
        
        // Set default values in case of error
        document.getElementById('total-attendees').textContent = '0';
        document.getElementById('events-participated').textContent = '0';
        document.getElementById('avg-attendees').textContent = '0.0';
    }
}





async function loadMarketerAttendees() {
    try {
        // Use the marketersApi.getMyAttendees method to ensure we're using the correct endpoint
        const responseData = await marketersApi.getMyAttendees();
        
        // Extract attendees array handling different response formats
        // First check if response is an array directly
        let attendeesArray = Array.isArray(responseData) ? responseData : null;
        
        // Check for the nested data.data structure we're now seeing
        if (!attendeesArray && responseData && responseData.data && responseData.data.data) {
            attendeesArray = Array.isArray(responseData.data.data) ? responseData.data.data : null;
        }
        
        // If not an array directly, check for data property that might be an array
        if (!attendeesArray && responseData && responseData.data) {
            attendeesArray = Array.isArray(responseData.data) ? responseData.data : null;
        }
        
        // If we still don't have an array, check for attendees property
        if (!attendeesArray && responseData && responseData.attendees) {
            attendeesArray = Array.isArray(responseData.attendees) ? responseData.attendees : null;
        }
          // Final fallback - if we still don't have an array, create an empty one
        if (!attendeesArray) {
            attendeesArray = [];
        }
        
        const tableBody = document.getElementById('attendees-table-body');
        const noAttendeesMessage = document.getElementById('no-attendees');
        
        if (!attendeesArray || attendeesArray.length === 0) {
            tableBody.innerHTML = '';
            noAttendeesMessage.classList.remove('d-none');
            return;
        }
        
        noAttendeesMessage.classList.add('d-none');
        tableBody.innerHTML = '';
        
        try {
            // Sort attendees by creation date (newest first)
            // Make a copy to avoid modifying the original array and use only valid items for sorting
            const sortableAttendees = attendeesArray
                .filter(attendee => attendee && attendee.createdAt)
                .sort((a, b) => {
                    try {
                        return new Date(b.createdAt) - new Date(a.createdAt);
                    } catch (e) {
                        return 0; // Keep original order if dates can't be compared
                    }
                });
            
            // Show the 10 most recent attendees
            const recentAttendees = sortableAttendees.slice(0, 10);
            
            for (const attendee of recentAttendees) {
                try {
                    const row = document.createElement('tr');
                    
                    // Format date safely
                    let formattedDate = 'Date not available';
                    try {
                        if (attendee.createdAt) {
                            const registrationDate = new Date(attendee.createdAt);
                            formattedDate = registrationDate.toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                            });
                        }                    } catch (dateError) {
                        // Silently handle date formatting errors
                    }
                    
                    // Access event name safely
                    const eventName = attendee.event?.name || 'Unknown event';                      row.innerHTML = `
                        <td>${attendee.name || 'No name'}</td>
                        <td>${attendee.phone || 'No phone'}</td>
                        <td>${eventName}</td>
                        <td>${attendee.transportPreference === 'bus' ? 
                            `<span class="badge bg-success">Bus (${attendee.busPickup?.location || 'N/A'})</span>` : 
                            '<span class="badge bg-secondary">Private</span>'}
                        </td>
                        <td>${formattedDate}</td>
                        <td>${getCheckInStatusDisplay(attendee)}</td>
                    `;
                    
                    tableBody.appendChild(row);                } catch (attendeeError) {
                    // Silently handle attendee processing errors
                }
            }
        } catch (sortError) {
            // Fallback if sorting fails
            
            // Fallback - just show first 10 without sorting
            const displayAttendees = attendeesArray.slice(0, 10);
            for (const attendee of displayAttendees) {
                try {
                    const row = document.createElement('tr');                    row.innerHTML = `
                        <td>${attendee.name || 'No name'}</td>
                        <td>${attendee.phone || 'No phone'}</td>
                        <td>${attendee.event?.name || 'Unknown event'}</td>
                        <td>${attendee.transportPreference === 'bus' ? 'Bus' : 'Private'}</td>
                        <td>${attendee.createdAt || 'Date not available'}</td>
                        <td>${getCheckInStatusDisplay(attendee)}</td>
                    `;
                    tableBody.appendChild(row);                } catch (e) {
                    // Silently handle display errors
                }
            }
        }
    } catch (error) {
        showToast('error', 'Failed to load attendees');
        
        // Show no attendees message in case of error
        const tableBody = document.getElementById('attendees-table-body');
        const noAttendeesMessage = document.getElementById('no-attendees');
        if (tableBody) tableBody.innerHTML = '';
        if (noAttendeesMessage) noAttendeesMessage.classList.remove('d-none');    }
}