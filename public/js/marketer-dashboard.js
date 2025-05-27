// Marketer Dashboard JavaScript

// Import event management functions
import { 
    loadMarketerEvents, 
    loadAvailableEvents, 
    setupEventTabs, 
    setupAttendeeRegistrationHandlers,
    getCheckInStatusDisplay,
    populateEventFilter,
    loadFilteredAttendees,
    loadMarketerPerformance
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
        await populateEventFilter();        // Load registered attendees (initially showing all)
        await loadFilteredAttendees();
    } catch (error) {
        showToast('error', 'Failed to load dashboard data');
    }
});