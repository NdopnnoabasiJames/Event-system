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
        
        // Handle different response formats
        let event;
        if (response && typeof response === 'object') {
            // Extract the event data from the nested response structure
            if (response.data && typeof response.data === 'object') {
                event = response.data;
            } else {
                event = response;
            }            // Check if the event has all required fields
            const hasValidLocation = (event.states && Array.isArray(event.states) && event.states.length > 0) ||
                                   event.state ||
                                   (event.branches && typeof event.branches === 'object' && Object.keys(event.branches).length > 0);
            
            if (!event.name || !event.date || !hasValidLocation) {
                // Event is missing some required fields, but we'll still display what we have
            }
        } else {
            throw new Error('Invalid event data received from API');
        }
        
        // Update UI with event data
        updateEventUI(event);    } catch (error) {
        showToast('error', 'Failed to load event details');
    }
}

async function updateEventUI(event) {
    // Get the event ID for API calls
    const eventId = event._id || event.id;
    
    // Load additional data needed for comprehensive display
    let attendeesData = [];
    let marketerCount = 0;
    let checkedInCount = 0;
    
    try {
        // Get attendees data
        const attendeesResponse = await attendeesApi.getAllAttendees(eventId);
        attendeesData = Array.isArray(attendeesResponse) ? attendeesResponse : (attendeesResponse.data || []);
        
        // Count checked-in attendees
        checkedInCount = attendeesData.filter(attendee => attendee.checkedIn === true || attendee.checkedInTime).length;
        
        // Get marketer count (assuming marketers array in event contains marketer IDs)
        marketerCount = event.marketers ? event.marketers.length : 0;
    } catch (error) {
        console.warn('Error loading additional event data:', error);
    }

    // Update event image
    const eventImage = document.querySelector('.img-fluid');
    if (eventImage) {
        eventImage.src = getEventBannerUrl(event.bannerImage);
    }    console.log('Event API response:', event);
    console.log('Event keys:', Object.keys(event));
    
    // Update event title
    const eventTitle = document.querySelector('h1');
    if (eventTitle) {
        eventTitle.textContent = event.name || 'Event Details';
    }

    // Update event description
    updateEventDescription(event);

    // Update event badges (date, time, location)
    updateEventBadges(event);

    // Update comprehensive event information in sidebar
    updateEventStatus(event);
    updateRegistrationStats(attendeesData.length, marketerCount, checkedInCount);
    updateLocationInfo(event);
    updateBusPickupInfo(event, attendeesData);
}

function updateEventDescription(event) {
    const descriptionCard = document.getElementById('description-card');
    const eventDescription = document.getElementById('event-description');
    
    if (eventDescription) {
        descriptionCard.classList.remove('d-none');
        
        if (event.description && event.description.trim() !== '') {
            const formattedDescription = event.description
                .replace(/\n\n/g, '</p><p>')
                .replace(/\n/g, '<br>');
            
            eventDescription.innerHTML = `<p>${formattedDescription}</p>`;
            eventDescription.innerHTML = eventDescription.innerHTML.replace('<p></p>', '');
        } else {
            eventDescription.innerHTML = '<p class="text-muted"><i class="fas fa-info-circle me-2"></i>No description available for this event.</p>';
        }
    }
}

function updateEventBadges(event) {
    // Format date
    let eventDate = 'Date not available';
    let eventTime = 'Time not available';
    
    if (event.date) {
        try {
            const date = new Date(event.date);
            if (!isNaN(date.getTime())) {
                eventDate = date.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
                
                // Extract time from the date
                eventTime = date.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                });
            } else {
                eventDate = String(event.date);
            }
        } catch (e) {
            eventDate = String(event.date);
        }
    }

    // Get location
    let location = 'Location not specified';
    if (event.states && Array.isArray(event.states) && event.states.length > 0) {
        location = event.states.join(', ');
    } else if (event.state) {
        location = event.state;
    }

    // Update badges
    const badges = document.querySelector('.d-flex.flex-wrap.gap-3');
    if (badges) {
        badges.innerHTML = `
            <span class="badge bg-primary fs-6">
                <i class="fas fa-calendar-alt me-2"></i>${eventDate}
            </span>
            <span class="badge bg-success fs-6">
                <i class="fas fa-clock me-2"></i>${eventTime}
            </span>
            <span class="badge bg-info fs-6">
                <i class="fas fa-map-marker-alt me-2"></i>${location}
            </span>
        `;
    }
}

function updateEventStatus(event) {
    const statusElement = document.getElementById('event-status');
    if (statusElement && event.date) {
        try {
            const eventDate = new Date(event.date);
            const currentDate = new Date();
            
            // Reset time to compare dates only
            eventDate.setHours(0, 0, 0, 0);
            currentDate.setHours(0, 0, 0, 0);
            
            if (eventDate >= currentDate) {
                statusElement.textContent = 'Active';
                statusElement.className = 'badge bg-success';
            } else {
                statusElement.textContent = 'Past';
                statusElement.className = 'badge bg-secondary';
            }
        } catch (error) {
            statusElement.textContent = 'Unknown';
            statusElement.className = 'badge bg-warning';
        }
    }
}

function updateRegistrationStats(totalAttendees, totalMarketers, checkedInAttendees) {
    const totalMarketersElement = document.getElementById('total-marketers');
    const totalAttendeesElement = document.getElementById('total-attendees');
    const checkedInAttendeesElement = document.getElementById('checked-in-attendees');
    
    if (totalMarketersElement) totalMarketersElement.textContent = totalMarketers;
    if (totalAttendeesElement) totalAttendeesElement.textContent = totalAttendees;
    if (checkedInAttendeesElement) checkedInAttendeesElement.textContent = checkedInAttendees;
}

function updateLocationInfo(event) {
    const locationsContainer = document.getElementById('event-locations');
    if (!locationsContainer) {
        console.warn('Location container not found');
        return;
    }    console.log('Event data for location info:', {
        states: event.states,
        state: event.state,
        branches: event.branches,
        hasStates: event.states && Array.isArray(event.states),
        statesLength: event.states ? event.states.length : 0,
        hasSingleState: !!event.state,
        branchesType: Array.isArray(event.branches) ? 'array' : typeof event.branches,
        branchesDetailed: event.branches ? JSON.stringify(event.branches, null, 2) : 'null'
    });let locationHTML = '';

    // Check if we have any location data to display
    const hasNewFormat = event.states && Array.isArray(event.states) && event.states.length > 0 && 
                        event.branches && typeof event.branches === 'object' && !Array.isArray(event.branches);
    const hasLegacyFormat = event.state && event.branches && Array.isArray(event.branches) && event.branches.length > 0;
    const hasSingleState = event.state && (!event.branches || event.branches.length === 0);

    if (hasNewFormat || hasLegacyFormat || hasSingleState) {
        // Start with States header
        locationHTML = `
            <div class="mb-3">
                <h6 class="text-primary mb-2">
                    <i class="fas fa-globe me-2"></i>States
                </h6>
        `;        // Handle new format: states array with branches object
        if (hasNewFormat) {
            console.log('Processing states array format:', event.states);
            event.states.forEach(state => {
                locationHTML += `
                    <div class="ms-3 mb-2">
                        <div class="fw-bold text-dark">
                            <i class="fas fa-map-marker-alt me-2"></i>${state}
                        </div>
                `;
                
                // Add branches for this state if available
                if (event.branches[state] && Array.isArray(event.branches[state])) {
                    console.log(`Processing branches for ${state}:`, event.branches[state]);
                    event.branches[state].forEach((branch, index) => {
                        console.log(`Branch ${index} for ${state}:`, branch, 'Type:', typeof branch);
                        
                        // Handle different branch data types
                        let branchName = '';
                        if (typeof branch === 'string') {
                            branchName = branch;
                        } else if (typeof branch === 'object' && branch !== null) {
                            // If branch is an object, try to extract name or title
                            branchName = branch.name || branch.title || branch.branchName || 
                                        branch.location || JSON.stringify(branch);
                        } else {
                            branchName = String(branch);
                        }
                        
                        locationHTML += `
                            <div class="ms-4 mt-1">
                                <small class="text-muted">
                                    <i class="fas fa-building me-2"></i>${branchName}
                                </small>
                            </div>
                        `;
                    });
                }
                
                locationHTML += `</div>`;
            });
        }// Handle legacy format: single state string with branches array
        else if (hasLegacyFormat) {
            console.log('Processing legacy format - state:', event.state, 'branches:', event.branches);
            
            locationHTML += `
                <div class="ms-3 mb-2">
                    <div class="fw-bold text-dark">
                        <i class="fas fa-map-marker-alt me-2"></i>${event.state}
                    </div>
            `;
            
            event.branches.forEach((branch, index) => {
                console.log(`Branch ${index}:`, branch, 'Type:', typeof branch);
                
                // Handle different branch data types
                let branchName = '';
                if (typeof branch === 'string') {
                    branchName = branch;
                } else if (typeof branch === 'object' && branch !== null) {
                    // If branch is an object, try to extract name or title
                    branchName = branch.name || branch.title || branch.branchName || 
                                branch.location || JSON.stringify(branch);
                } else {
                    branchName = String(branch);
                }
                
                locationHTML += `
                    <div class="ms-4 mt-1">
                        <small class="text-muted">
                            <i class="fas fa-building me-2"></i>${branchName}
                        </small>
                    </div>
                `;
            });
            
            locationHTML += `</div>`;
        }
        // Handle case with only single state, no branches
        else if (hasSingleState) {
            console.log('Processing single state only:', event.state);
            locationHTML += `
                <div class="ms-3 mb-2">
                    <div class="fw-bold text-dark">
                        <i class="fas fa-map-marker-alt me-2"></i>${event.state}
                    </div>
                </div>
            `;
        }

        locationHTML += `</div>`; // Close the States section
    }
    // No location information available
    else {
        console.log('No location information found, showing default message');
        locationHTML = '<div class="text-muted"><i class="fas fa-info-circle me-2"></i>No location information available</div>';
    }

    console.log('Setting location HTML:', locationHTML);
    locationsContainer.innerHTML = locationHTML;
}

function updateBusPickupInfo(event, attendeesData) {
    const busPickupContainer = document.getElementById('bus-pickup-info');
    if (!busPickupContainer) return;

    if (!event.busPickups || !Array.isArray(event.busPickups) || event.busPickups.length === 0) {
        busPickupContainer.innerHTML = '<div class="text-muted"><i class="fas fa-info-circle me-2"></i>No bus pickup stations available</div>';
        return;
    }

    // Count attendees per bus pickup location
    const attendeesByLocation = {};
    attendeesData.forEach(attendee => {
        if (attendee.transportPreference === 'bus' && attendee.busPickup && attendee.busPickup.location) {
            const location = attendee.busPickup.location;
            attendeesByLocation[location] = (attendeesByLocation[location] || 0) + 1;
        }
    });

    let busHTML = '';
    event.busPickups.forEach((pickup, index) => {
        const assignedCount = attendeesByLocation[pickup.location] || 0;
        const remainingSeats = pickup.maxCapacity - assignedCount;
        const capacityPercentage = (assignedCount / pickup.maxCapacity) * 100;
        
        // Determine progress bar color based on capacity
        let progressColor = 'bg-success';
        if (capacityPercentage >= 80) progressColor = 'bg-warning';
        if (capacityPercentage >= 100) progressColor = 'bg-danger';

        busHTML += `
            <div class="card mb-2 border">
                <div class="card-body p-3">
                    <h6 class="card-title mb-2">
                        <i class="fas fa-bus me-2"></i>${pickup.location}
                    </h6>
                    <div class="row g-2 mb-2">
                        <div class="col-6">
                            <small class="text-muted">Capacity:</small>
                            <div class="fw-bold">${pickup.maxCapacity} seats</div>
                        </div>
                        <div class="col-6">
                            <small class="text-muted">Assigned:</small>
                            <div class="fw-bold">${assignedCount} attendees</div>
                        </div>
                    </div>
                    <div class="mb-2">
                        <small class="text-muted">Remaining: <span class="fw-bold">${remainingSeats} seats</span></small>
                        <div class="progress mt-1" style="height: 6px;">
                            <div class="progress-bar ${progressColor}" role="progressbar" 
                                 style="width: ${Math.min(capacityPercentage, 100)}%" 
                                 aria-valuenow="${assignedCount}" 
                                 aria-valuemin="0" 
                                 aria-valuemax="${pickup.maxCapacity}">
                            </div>
                        </div>
                    </div>
                    ${pickup.departureTime ? `<small class="text-muted">
                        <i class="fas fa-clock me-1"></i>Departure: ${formatBusTime(pickup.departureTime)}
                    </small>` : ''}
                </div>
            </div>
        `;
    });

    busPickupContainer.innerHTML = busHTML;
}

function formatBusTime(timeString) {
    try {
        const date = new Date(timeString);
        if (!isNaN(date.getTime())) {
            return date.toLocaleString('en-US', { 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit', 
                minute: '2-digit' 
            });
        }
        return timeString;
    } catch (error) {
        return timeString;
    }
}

