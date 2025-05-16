document.addEventListener('DOMContentLoaded', async () => {
    if (!auth.isAuthenticated()) {
        showToast('error', 'Please login to view event details');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');

    if (eventId) {
        await loadEventDetails(eventId);
    } else {
        showToast('error', 'Event not found');
        setTimeout(() => {
            window.location.href = 'events.html';
        }, 1000);
    }
});

async function loadEventDetails(eventId) {
    try {
        // Get event details from the API
        const response = await eventsApi.getEvent(eventId);
        
        // More detailed debugging
        console.group('Event Data Debug');
        console.log('Full API Response:', response);
        console.log('Response type:', typeof response);
        if (response && typeof response === 'object') {
            console.log('Event ID:', response._id);
            console.log('Event Name:', response.name);
            console.log('Event Date:', response.date);
            console.log('Event Date Type:', typeof response.date);
            console.log('Event State:', response.state);
            console.log('Max Attendees:', response.maxAttendees);
            console.log('Max Attendees Type:', typeof response.maxAttendees);
            console.log('Branches:', response.branches);
            console.log('Is Active:', response.isActive);
        }
        console.groupEnd();
        
        // Handle different response formats
        let event;
        if (response && typeof response === 'object') {
            event = response;
            
            // Check if the event has all required fields
            if (!event.name) {
                console.warn('Event is missing name field');
            }
            if (!event.date) {
                console.warn('Event is missing date field');
            }
            if (!event.state && (!event.branches || event.branches.length === 0)) {
                console.warn('Event is missing location information');
            }
            if (!event.maxAttendees && event.maxAttendees !== 0) {
                console.warn('Event is missing maxAttendees field');
            }
        } else {
            throw new Error('Invalid event data received from API');
        }
        
        // Update UI with event data
        updateEventUI(event);
    } catch (error) {
        console.error('Error loading event details:', error);
        showToast('error', 'Failed to load event details');
    }
}

function updateEventUI(event) {
    console.log('Updating UI with event data:', event); // Log event data for debugging
    
    // Update event image
    document.querySelector('.img-fluid').src = event.imageUrl || 'https://placehold.co/800x400';

    // Update event title and basic info
    document.querySelector('h1').textContent = event.name || 'Event Details';
    
    // FIXED: Format date more reliably
    let eventDate = 'Date not available';
    if (event.date) {
        try {
            console.log('Trying to parse date:', event.date);
            
            // Try various date formats
            let date = null;
            const dateStr = String(event.date).trim();
            
            // First try - direct Date constructor
            date = new Date(dateStr);
            
            // Second try - handle ISO-like strings with possible issues
            if (isNaN(date.getTime()) && dateStr.match(/\d{4}[-/]\d{1,2}[-/]\d{1,2}/)) {
                const matches = dateStr.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
                if (matches) {
                    const [, year, month, day] = matches;
                    date = new Date(year, parseInt(month) - 1, day); // Month is 0-indexed
                }
            }
            
            // Third try - handle string like "May 13, 2025"
            if (isNaN(date.getTime())) {
                date = new Date(dateStr);
            }
            
            // If we have a valid date now, format it
            if (date && !isNaN(date.getTime())) {
                eventDate = date.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
                console.log('Successfully parsed date:', eventDate);
            } else {
                console.log('Could not parse date, using raw value:', dateStr);
                eventDate = dateStr; // Fall back to the raw string if all parsing fails
            }
        } catch (e) {
            console.error('Date parsing error:', e);
            eventDate = String(event.date); // Last resort - just show the raw value
        }
    }
    
    // FIXED: Get location more reliably
    let location = 'Location not specified';
    if (event.state && typeof event.state === 'string' && event.state.trim() !== '') {
        console.log('Using event.state for location:', event.state);
        location = event.state;
    } else if (event.branches && Array.isArray(event.branches) && event.branches.length > 0) {
        // Try to get location from branches
        console.log('Trying to get location from branches:', event.branches);
        const mainBranch = event.branches[0];
        
        if (mainBranch) {
            if (mainBranch.location && typeof mainBranch.location === 'string') {
                location = mainBranch.location;
                console.log('Using branch location:', location);
            } else if (mainBranch.name && typeof mainBranch.name === 'string') {
                location = mainBranch.name;
                console.log('Using branch name as location:', location);
            }
        }
    }
    
    // FIXED: Calculate available seats more reliably 
    console.log('maxAttendees raw value:', event.maxAttendees, 'type:', typeof event.maxAttendees);
    console.log('attendeeCount raw value:', event.attendeeCount, 'type:', typeof event.attendeeCount);
    
    // Default to the raw value first, then try parsing as number
    let maxAttendees = event.maxAttendees;
    
    // If it's not already a number, try to parse it
    if (typeof maxAttendees !== 'number') {
        // Handle null/undefined
        if (maxAttendees == null) {
            maxAttendees = 0;
        }
        // Try parsing as integer if it's a string
        else if (typeof maxAttendees === 'string') {
            maxAttendees = parseInt(maxAttendees, 10);
            if (isNaN(maxAttendees)) maxAttendees = 0;
        }
    }
    
    // For attendee count - default to 0 if not available
    const attendeeCount = typeof event.attendeeCount === 'number' ? event.attendeeCount :
                        (event.attendeeCount ? parseInt(event.attendeeCount, 10) : 0);
    
    console.log('Parsed maxAttendees:', maxAttendees, 'attendeeCount:', attendeeCount);
    const availableSeats = Math.max(0, maxAttendees - (isNaN(attendeeCount) ? 0 : attendeeCount));
    // FIXED: Update event badges with more reliable values
    const badges = document.querySelector('.d-flex.flex-wrap.gap-3');
    if (badges) {
        badges.innerHTML = `
            <span class="badge bg-primary fs-6">
                <i class="fas fa-calendar-alt me-2"></i>${eventDate}
            </span>
            <span class="badge bg-success fs-6">
                <i class="fas fa-clock me-2"></i>${event.time || '9:00 AM - 5:00 PM'}
            </span>
            <span class="badge bg-info fs-6">
                <i class="fas fa-map-marker-alt me-2"></i>${location}
            </span>
            <span class="badge bg-warning fs-6">
                <i class="fas fa-users me-2"></i>${isNaN(availableSeats) ? maxAttendees : availableSeats} Seats Available
            </span>
        `;
    } else {
        console.error('Could not find badges container element');
    }    // Card text element was removed with the About section// FIXED: Update stats with more reliable values and error handling
    const stats = document.querySelectorAll('.col h5');
    if (stats && stats.length >= 3) {
        // Attendee count
        if (typeof attendeeCount === 'number' && !isNaN(attendeeCount)) {
            stats[0].textContent = attendeeCount;
        } else {
            stats[0].textContent = '0';
        }
        
        // Available seats
        if (typeof availableSeats === 'number' && !isNaN(availableSeats)) {
            stats[1].textContent = availableSeats;
        } else {
            // If we have maxAttendees but no availability calculation, just show maxAttendees
            if (typeof maxAttendees === 'number' && !isNaN(maxAttendees)) {
                stats[1].textContent = maxAttendees;
            } else {
                stats[1].textContent = '0';
            }
        }
        
        // Calculate days remaining - similar approach as date parsing above
        let daysRemaining = 0;
        if (event.date) {
            try {
                // Use various approaches to parse the date
                let parsedDate = null;
                const dateStr = String(event.date).trim();
                
                // First try direct Date constructor
                parsedDate = new Date(dateStr);
                
                // Second try with manual parsing
                if (isNaN(parsedDate.getTime()) && dateStr.match(/\d{4}[-/]\d{1,2}[-/]\d{1,2}/)) {
                    const matches = dateStr.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
                    if (matches) {
                        const [, year, month, day] = matches;
                        parsedDate = new Date(year, parseInt(month) - 1, day); // Month is 0-indexed
                    }
                }
                
                // If we have a valid date now, calculate days remaining
                if (parsedDate && !isNaN(parsedDate.getTime())) {
                    const today = new Date();
                    const diffTime = parsedDate - today;
                    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    console.log('Days remaining calculation:', { parsedDate, today, diffTime, daysRemaining });
                }
            } catch (e) {
                console.error('Error calculating days remaining:', e);
            }
        }
        
        stats[2].textContent = daysRemaining > 0 ? daysRemaining : 'Past event';
}

// Function removed as registration form has been removed
}
