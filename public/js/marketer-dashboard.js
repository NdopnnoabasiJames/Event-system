// Marketer Dashboard JavaScript

// Import event management functions
import { 
    loadMarketerEvents, 
    loadAvailableEvents, 
    setupEventTabs, 
    setupAttendeeRegistrationHandlers,
    getCheckInStatusDisplay,
    populateEventFilter,    loadFilteredAttendees
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
        
        // Populate event filter dropdown
        await populateEventFilter();
          // Load registered attendees (initially showing all)
        await loadFilteredAttendees();} catch (error) {
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
        document.getElementById('events-participated').textContent = '0';        document.getElementById('avg-attendees').textContent = '0.0';
    }
}