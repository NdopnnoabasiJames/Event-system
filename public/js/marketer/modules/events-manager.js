// Event Management Module for Marketer Dashboard
// This module handles all event-related functionality for the marketer dashboard

// Import the states and branches data
import { statesAndBranches } from '../../modules/states-branches.js';

/**
 * Load marketer performance data and update the performance summary
 */
export async function loadMarketerPerformance() {
    try {
        const responseData = await apiCall('/marketers/analytics/performance', 'GET', null, auth.getToken());
        
        // Handle different response formats
        const response = responseData.data || responseData;
        
        // Update performance summary with safe access
        const totalAttendeesElement = document.getElementById('total-attendees');
        const eventsParticipatedElement = document.getElementById('events-participated');
        const avgAttendeesElement = document.getElementById('avg-attendees');
        
        if (totalAttendeesElement) {
            totalAttendeesElement.textContent = response?.totalAttendeesRegistered || 0;
        }
        
        if (eventsParticipatedElement) {
            eventsParticipatedElement.textContent = response?.eventsParticipated || 0;
        }
        
        // Safely handle average calculation
        let avgAttendees = 0;
        if (response && typeof response.averageAttendeesPerEvent === 'number') {
            avgAttendees = response.averageAttendeesPerEvent.toFixed(1);
        } else if (response?.totalAttendeesRegistered && response?.eventsParticipated) {
            // Calculate average if not provided but we have the components
            avgAttendees = (response.totalAttendeesRegistered / response.eventsParticipated).toFixed(1);
        }
        
        if (avgAttendeesElement) {
            avgAttendeesElement.textContent = avgAttendees;
        }
    } catch (error) {
        console.error('Failed to load performance data:', error);
        
        // Set default values in case of error
        const totalAttendeesElement = document.getElementById('total-attendees');
        const eventsParticipatedElement = document.getElementById('events-participated');
        const avgAttendeesElement = document.getElementById('avg-attendees');
        
        if (totalAttendeesElement) totalAttendeesElement.textContent = '0';
        if (eventsParticipatedElement) eventsParticipatedElement.textContent = '0';
        if (avgAttendeesElement) avgAttendeesElement.textContent = '0.0';
        
        // Don't show toast error here as it will be called frequently
        // The dashboard will handle showing the main error if needed
    }
}

/**
 * Load marketer's events that they are volunteering for
 */
export async function loadMarketerEvents() {
    try {
        const responseData = await apiCall('/marketers/events/my', 'GET', null, auth.getToken());
        
        // Extract events array handling different response formats
        // First check if response is an array directly
        let eventsArray = Array.isArray(responseData) ? responseData : null;
        
        // If not an array directly, check for data property that might be an array
        if (!eventsArray && responseData && responseData.data) {
            eventsArray = Array.isArray(responseData.data) ? responseData.data : null;
        }
        
        // If we still don't have an array, check for events property
        if (!eventsArray && responseData && responseData.events) {
            eventsArray = Array.isArray(responseData.events) ? responseData.events : null;
        }
        
        // Final fallback - if we still don't have an array, create an empty one
        if (!eventsArray) {
            eventsArray = [];
        }
        
        const tableBody = document.getElementById('events-table-body');
        const noEventsMessage = document.getElementById('no-events');
        
        if (!eventsArray || eventsArray.length === 0) {
            tableBody.innerHTML = '';
            noEventsMessage.classList.remove('d-none');
            return;
        }
        
        noEventsMessage.classList.add('d-none');
        tableBody.innerHTML = '';
        
        for (const event of eventsArray) {
            try {
                const row = document.createElement('tr');
                
                // Make sure event has required properties with fallbacks
                const eventId = event._id || event.id || 'unknown';
                const eventName = event.name || 'Unnamed event';
                
                // Format date safely
                let formattedDate = 'Date not available';
                try {
                    if (event.date) {
                        const eventDate = new Date(event.date);
                        formattedDate = eventDate.toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                        });
                    }
                } catch (dateError) {
                    // Silently handle date formatting errors
                }                row.innerHTML = `
                    <td>${eventName}</td>
                    <td>${formattedDate}</td>
                    <td>
                        <div class="btn-group" role="group">
                            <button class="btn btn-sm btn-success register-attendee" data-event-id="${eventId}" data-event-name="${eventName}">
                                <i class="bi bi-person-plus"></i> Register Attendee
                            </button>
                            <button class="btn btn-sm btn-danger leave-event" data-event-id="${eventId}" data-event-name="${eventName}">
                                <i class="bi bi-box-arrow-right"></i> Leave
                            </button>
                        </div>
                    </td>
                `;
                
                tableBody.appendChild(row);
            } catch (eventError) {
                // Silently handle event processing errors
            }        }
        
        // Add event listeners for register attendee buttons
        document.querySelectorAll('.register-attendee').forEach(button => {
            button.addEventListener('click', (e) => {
                const eventId = e.currentTarget.getAttribute('data-event-id');
                const eventName = e.currentTarget.getAttribute('data-event-name');
                if (eventId && eventId !== 'unknown') {
                    openRegisterAttendeeModal(eventId, eventName);
                } else {
                    showToast('error', 'Cannot register attendee for this event');
                }
            });
        });
        
        // Add event listeners for leave event buttons
        document.querySelectorAll('.leave-event').forEach(button => {
            button.addEventListener('click', (e) => {
                const eventId = e.currentTarget.getAttribute('data-event-id');
                const eventName = e.currentTarget.getAttribute('data-event-name');
                if (eventId && eventId !== 'unknown') {
                    // Show confirmation dialog before leaving event
                    if (confirm(`Are you sure you want to leave "${eventName}"? You will no longer be able to register attendees for this event.`)) {
                        leaveEvent(eventId);
                    }
                } else {
                    showToast('error', 'Cannot leave this event');
                }
            });
        });
    } catch (error) {
        showToast('error', 'Failed to load events');
        
        // Show no events message in case of error
        const tableBody = document.getElementById('events-table-body');
        const noEventsMessage = document.getElementById('no-events');
        if (tableBody) tableBody.innerHTML = '';
        if (noEventsMessage) noEventsMessage.classList.remove('d-none');
    }
}

/**
 * Load attendee count for a specific event
 */
export async function loadEventAttendeeCount(eventId) {
    try {
        const response = await apiCall(`/marketers/analytics/event/${eventId}`, 'GET', null, auth.getToken());
        const countElement = document.getElementById(`attendee-count-${eventId}`);
        
        if (countElement) {
            countElement.textContent = response.attendeesCount;
        }
    } catch (error) {
        const countElement = document.getElementById(`attendee-count-${eventId}`);
        if (countElement) {
            countElement.textContent = 'Error';
        }
    }
}

/**
 * Show event performance details in a modal
 */
export async function showEventPerformance(eventId) {
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
                    <td>${attendee.phone || 'Not provided'}</td>
                    <td>${attendee.transportPreference === 'bus' ? 'Bus' : 'Private'}</td>
                    <td>${getCheckInStatusDisplay(attendee)}</td>
                `;
                attendeesTable.appendChild(row);
            });
        }
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('eventPerformanceModal'));
        modal.show();
    } catch (error) {
        showToast('error', 'Failed to load event performance data');
    }
}

/**
 * Loads available events that the marketer can volunteer for
 */
export async function loadAvailableEvents() {
    try {
        // Get both available events and events the marketer has already volunteered for        
        const [availableEventsResponse, myEventsResponse] = await Promise.all([
            marketersApi.getAvailableEvents(),
            marketersApi.getMyEvents()
        ]);
        
        // Extract events array handling different response formats
        let eventsArray = Array.isArray(availableEventsResponse) ? availableEventsResponse : null;
        
        if (!eventsArray && availableEventsResponse && availableEventsResponse.data) {
            eventsArray = Array.isArray(availableEventsResponse.data) ? availableEventsResponse.data : null;
        }
        
        if (!eventsArray) {
            eventsArray = [];
        }
        
        // Extract my events array for comparison
        let myEventsArray = Array.isArray(myEventsResponse) ? myEventsResponse : null;
        if (!myEventsArray && myEventsResponse && myEventsResponse.data) {
            myEventsArray = Array.isArray(myEventsResponse.data) ? myEventsResponse.data : null;
        }
        if (!myEventsArray) {
            myEventsArray = [];
        }
        
        // Create a set of event IDs that the marketer has already volunteered for
        const myEventIds = new Set(myEventsArray.map(event => event._id || event.id));
        
        const tableBody = document.getElementById('available-events-table-body');
        const noEventsMessage = document.getElementById('no-available-events');
        
        if (!eventsArray || eventsArray.length === 0) {
            tableBody.innerHTML = '';
            noEventsMessage.classList.remove('d-none');
            return;
        }
        
        noEventsMessage.classList.add('d-none');
        tableBody.innerHTML = '';
        
        for (const event of eventsArray) {
            try {
                const row = document.createElement('tr');
                
                // Make sure event has required properties with fallbacks
                const eventId = event._id || event.id || 'unknown';
                const eventName = event.name || 'Unnamed event';
                
                // Format date safely
                let formattedDate = 'Date not available';
                try {
                    if (event.date) {
                        const eventDate = new Date(event.date);
                        formattedDate = eventDate.toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                        });
                    }
                } catch (dateError) {
                    // Silently handle date formatting errors
                }
                  // Check if the marketer has already volunteered for this event
                const hasVolunteered = myEventIds.has(eventId);
                
                // Format states display - handle both single state and multiple states
                let statesDisplay = 'Location not available';
                if (event.states && Array.isArray(event.states) && event.states.length > 0) {
                    statesDisplay = event.states.join(', ');
                } else if (event.state) {
                    // Fallback for legacy single state property
                    statesDisplay = event.state;
                }
                
                row.innerHTML = `
                    <td>${eventName}</td>
                    <td>${formattedDate}</td>
                    <td>${statesDisplay}</td>
                    <td>
                        <button class="btn btn-sm ${hasVolunteered ? 'btn-danger leave-available-event' : 'btn-success volunteer-for-event'}" 
                            data-event-id="${eventId}" data-event-name="${eventName}">
                            <i class="bi ${hasVolunteered ? 'bi-box-arrow-right' : 'bi-check-circle'}"></i> 
                            ${hasVolunteered ? 'Leave' : 'Volunteer'}
                        </button>
                    </td>
                `;
                
                tableBody.appendChild(row);
            } catch (eventError) {
                // Silently handle event processing errors
            }
        }
        
        // Add event listeners for volunteer buttons
        document.querySelectorAll('.volunteer-for-event').forEach(button => {
            button.addEventListener('click', async (e) => {
                const eventId = e.currentTarget.getAttribute('data-event-id');
                if (eventId && eventId !== 'unknown') {
                    await volunteerForEvent(eventId);
                } else {
                    showToast('error', 'Invalid event');
                }
            });
        });
        
        // Add event listeners for leave buttons in available events section
        document.querySelectorAll('.leave-available-event').forEach(button => {
            button.addEventListener('click', async (e) => {
                const eventId = e.currentTarget.getAttribute('data-event-id');
                const eventName = e.currentTarget.getAttribute('data-event-name');
                if (eventId && eventId !== 'unknown') {
                    // Show confirmation dialog before leaving event
                    if (confirm(`Are you sure you want to leave "${eventName}"? You will no longer be able to register attendees for this event.`)) {
                        await leaveEvent(eventId);
                    }
                } else {
                    showToast('error', 'Invalid event');
                }
            });
        });
    } catch (error) {
        showToast('error', 'Failed to load available events');
        
        // Show no events message in case of error
        const tableBody = document.getElementById('available-events-table-body');
        const noEventsMessage = document.getElementById('no-available-events');
        if (tableBody) tableBody.innerHTML = '';
        if (noEventsMessage) noEventsMessage.classList.remove('d-none');
    }
}

/**
 * Leave an event as a marketer
 */
export async function leaveEvent(eventId) {
    try {
        const response = await marketersApi.leaveEvent(eventId);
        
        showToast('success', 'Successfully left the event');
        
        // Reload both available events and my events
        await loadAvailableEvents();
        await loadMarketerEvents();
        
        // Refresh performance data
        await loadMarketerPerformance();
    } catch (error) {
        let errorMessage = 'Failed to leave event';
        
        if (error.response?.status === 400) {
            errorMessage = 'You are not volunteering for this event';
        }
        
        showToast('error', errorMessage);
    }
}

/**
 * Volunteer for an event
 */
export async function volunteerForEvent(eventId) {
    try {
        const response = await marketersApi.volunteerForEvent(eventId);
        
        showToast('success', 'Successfully volunteered for the event');
        
        // Reload both available events and my events
        await loadAvailableEvents();
        await loadMarketerEvents();
        
        // Refresh performance data
        await loadMarketerPerformance();
    } catch (error) {
        let errorMessage = 'Failed to volunteer for event';
        
        if (error.response?.status === 400) {
            errorMessage = 'You are already volunteering for this event';
        }
        
        showToast('error', errorMessage);
    }
}

/**
 * Open the register attendee modal for a specific event
 */
export async function openRegisterAttendeeModal(eventId, eventName) {
    try {
        // Set the event ID in the hidden field
        document.getElementById('registerEventId').value = eventId;
        
        // Update the modal title to include the event name
        const modalTitle = document.querySelector('#registerAttendeeModal .modal-title');
        modalTitle.textContent = `Register Attendee for ${eventName}`;
        
        // Get event details to populate bus pickup locations
        const event = await apiCall(`/events/${eventId}`, 'GET', null, auth.getToken());
        
        // Extract the event data
        const eventData = event.data || event;
        
        // Populate bus pickup locations dropdown
        const busPickupSelect = document.getElementById('busPickupLocation');
        busPickupSelect.innerHTML = '<option value="" disabled selected>Select pickup location</option>';
        
        if (eventData.busPickups && Array.isArray(eventData.busPickups) && eventData.busPickups.length > 0) {
            eventData.busPickups.forEach((pickup, index) => {
                // Format the pickup date/time for display
                let pickupTimeDisplay = 'Time not available';
                try {
                    if (pickup.departureTime) {
                        const pickupTime = new Date(pickup.departureTime);
                        pickupTimeDisplay = pickupTime.toLocaleString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit', 
                            minute: '2-digit' 
                        });
                    }
                } catch (error) {
                    // Silently handle pickup time formatting errors
                }
                
                const option = document.createElement('option');
                option.value = JSON.stringify({
                    location: pickup.location,
                    departureTime: pickup.departureTime
                });
                option.textContent = `${pickup.location} - ${pickupTimeDisplay}`;
                busPickupSelect.appendChild(option);
            });
            
            // Show bus pickup section
            document.getElementById('busPickupSection').style.display = 'block';
        } else {
            // If no bus pickups are available, hide the bus section and select private transport
            document.getElementById('busPickupSection').style.display = 'none';
            document.getElementById('transportPrivate').checked = true;
        }
          // Populate state dropdown with only event-specific states
        const stateSelect = document.getElementById('attendeeState');
        const branchSelect = document.getElementById('attendeeBranch');
        
        if (stateSelect && branchSelect) {
            // Clear existing options
            stateSelect.innerHTML = '<option value="" disabled selected>Select state</option>';
            branchSelect.innerHTML = '<option value="" disabled selected>Select state first</option>';
            branchSelect.disabled = true;
            
            // Populate with event-specific states only
            if (eventData.states && Array.isArray(eventData.states)) {
                eventData.states.forEach(state => {
                    const option = document.createElement('option');
                    option.value = state;
                    option.textContent = state;
                    stateSelect.appendChild(option);
                });
            }
            
            // Set up state change handler for event-specific branches
            stateSelect.addEventListener('change', function() {
                const selectedState = this.value;
                branchSelect.innerHTML = '<option value="" disabled selected>Select branch</option>';
                
                if (selectedState && eventData.branches && eventData.branches[selectedState]) {
                    eventData.branches[selectedState].forEach(branch => {
                        const option = document.createElement('option');
                        option.value = branch;
                        option.textContent = branch;
                        branchSelect.appendChild(option);
                    });
                    branchSelect.disabled = false;
                } else {
                    branchSelect.disabled = true;
                }
            });
        }
        
        // Set up event listeners for transport preference radios
        document.querySelectorAll('input[name="transportPreference"]').forEach(radio => {
            radio.addEventListener('change', function() {
                const busSection = document.getElementById('busPickupSection');
                busSection.style.display = this.value === 'bus' ? 'block' : 'none';
                
                // Update required attribute based on transport preference
                const busPickupLocation = document.getElementById('busPickupLocation');
                busPickupLocation.required = this.value === 'bus';
            });
        });
        
        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('registerAttendeeModal'));
        modal.show();
        
    } catch (error) {
        showToast('error', 'Failed to prepare registration form. Please try again.');
    }
}

/**
 * Register an attendee for an event
 */
export async function registerAttendee() {
    try {
        const form = document.getElementById('registerAttendeeForm');
        
        // Check form validity
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
          // Get form data
        const eventId = document.getElementById('registerEventId').value;
        const name = document.getElementById('attendeeName').value;
        const email = document.getElementById('attendeeEmail').value;
        const phone = document.getElementById('attendeePhone').value;
        const state = document.getElementById('attendeeState').value;
        const branch = document.getElementById('attendeeBranch').value;
        const transportPreference = document.querySelector('input[name="transportPreference"]:checked').value;
        
        // Validate state and branch selection
        if (!state) {
            showToast('error', 'Please select a state');
            return;
        }
        
        if (!branch) {
            showToast('error', 'Please select a branch');
            return;
        }
        
        // Prepare attendee data
        const attendeeData = {
            name,
            phone, // Phone is now required
            state,
            branch,
            transportPreference,
            event: eventId // Add event ID to the attendee data
        };
        
        // Add email only if provided
        if (email && email.trim()) {
            attendeeData.email = email;
        }

        // Handle bus pickup if selected
        if (transportPreference === 'bus') {
            const busPickupValue = document.getElementById('busPickupLocation').value;
            
            if (!busPickupValue) {
                showToast('error', 'Please select a bus pickup location');
                return;
            }
            
            try {
                const busPickup = JSON.parse(busPickupValue);
                
                // Fix ISO 8601 date string format
                if (busPickup.departureTime) {
                    // Convert to proper ISO 8601 format with toISOString()
                    const dateObj = new Date(busPickup.departureTime);
                    busPickup.departureTime = dateObj.toISOString();
                }
                
                attendeeData.busPickup = busPickup;
            } catch (error) {
                showToast('error', 'Invalid bus pickup data');
                return;
            }
        }
        
        // Send request to register attendee
        const response = await marketersApi.registerAttendee(eventId, attendeeData);
        
        // Show success message
        showToast('success', 'Attendee registered successfully');
        
        // Close modal
        const modalElement = document.getElementById('registerAttendeeModal');
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) {
            modal.hide();
        }
          // Reset form
        form.reset();
        
        // Reset state and branch dropdowns to initial state
        const stateSelect = document.getElementById('attendeeState');
        const branchSelect = document.getElementById('attendeeBranch');
        if (stateSelect && branchSelect) {
            stateSelect.selectedIndex = 0;
            branchSelect.innerHTML = '<option value="" disabled selected>Select state first</option>';
            branchSelect.disabled = true;
        }
          // Reload attendees data
        await loadFilteredAttendees();
        
        // Update attendee count for this event
        loadEventAttendeeCount(eventId);
        
    } catch (error) {
        let errorMessage = 'Failed to register attendee';
        
        // Check for specific error types
        if (error.response?.status === 409) {
            errorMessage = 'This phone number is already registered for this event';
        } else if (error.response?.status === 400) {
            errorMessage = 'Invalid attendee data. Please check all fields and try again.';
        }
        
        showToast('error', errorMessage);
    }
}

/**
 * Get the check-in status display with appropriate badge
 */
export function getCheckInStatusDisplay(attendee) {
    if (!attendee) return '<span class="badge bg-secondary">Unknown</span>';
    
    if (attendee.checkedIn === true) {
        return '<span class="badge bg-success">Checked In</span>';
    } else if (attendee.checkedInTime) {
        return '<span class="badge bg-success">Checked In</span>';
    } else {
        return '<span class="badge bg-warning text-dark">Not Checked In</span>';
    }
}

/**
 * Set up tabs for the event section
 */
export function setupEventTabs() {
    // Bootstrap 5 handles tab initialization automatically
    // This function is kept for any potential future custom tab functionality
    
    // Add event listener to refresh data when tabs are changed
    const availableEventsTab = document.getElementById('available-events-tab');
    if (availableEventsTab) {
        availableEventsTab.addEventListener('shown.bs.tab', () => {
            // Refresh available events when switching to that tab
            loadAvailableEvents();
        });
    }
    
    const myEventsTab = document.getElementById('my-events-tab');
    if (myEventsTab) {
        myEventsTab.addEventListener('shown.bs.tab', () => {
            // Refresh my events when switching to that tab
            loadMarketerEvents();
        });
    }
}

/**
 * Set up event listeners for attendee registration form
 */
export function setupAttendeeRegistrationHandlers() {
    // Attach the event listener after the DOM is loaded
    const saveAttendeeBtn = document.getElementById('saveAttendeeBtn');
    if (saveAttendeeBtn) {
        saveAttendeeBtn.addEventListener('click', registerAttendee);
    }
    
    // Note: State and branch selection is now handled in openRegisterAttendeeModal()
    // to show only event-specific states and branches
    
    // Set up event listeners for transport preference radios
    const transportRadios = document.querySelectorAll('input[name="transportPreference"]');
    if (transportRadios.length > 0) {
        transportRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                const busSection = document.getElementById('busPickupSection');
                busSection.style.display = this.value === 'bus' ? 'block' : 'none';
            });
        });
        
        // Trigger the change event to set initial state
        const checkedRadio = document.querySelector('input[name="transportPreference"]:checked');
        if (checkedRadio) {
            const busSection = document.getElementById('busPickupSection');
            busSection.style.display = checkedRadio.value === 'bus' ? 'block' : 'none';
        }
    }
}

/**
 * Set up state and branch selection for attendee registration
 */
function setupStateAndBranchSelection() {
    const stateSelect = document.getElementById('attendeeState');
    const branchSelect = document.getElementById('attendeeBranch');
    
    if (!stateSelect || !branchSelect) {
        return;
    }
    
    // Populate state dropdown
    stateSelect.innerHTML = '<option value="" disabled selected>Select state</option>';
    Object.keys(statesAndBranches).forEach(state => {
        const option = document.createElement('option');
        option.value = state;
        option.textContent = state;
        stateSelect.appendChild(option);
    });
    
    // Handle state selection change
    stateSelect.addEventListener('change', function() {
        const selectedState = this.value;
        branchSelect.innerHTML = '<option value="" disabled selected>Select branch</option>';
        
        if (selectedState && statesAndBranches[selectedState]) {
            statesAndBranches[selectedState].forEach(branch => {
                const option = document.createElement('option');
                option.value = branch;
                option.textContent = branch;
                branchSelect.appendChild(option);
            });
            branchSelect.disabled = false;
        } else {
            branchSelect.disabled = true;
        }
    });
}

/**
 * Get marketer's events for populating filter dropdown
 */
export async function getMarketerEvents() {
    try {
        const responseData = await apiCall('/marketers/events/my', 'GET', null, auth.getToken());
        
        // Extract events array handling different response formats
        let eventsArray = Array.isArray(responseData) ? responseData : null;
        
        if (!eventsArray && responseData && responseData.data) {
            eventsArray = Array.isArray(responseData.data) ? responseData.data : null;
        }
        
        if (!eventsArray && responseData && responseData.events) {
            eventsArray = Array.isArray(responseData.events) ? responseData.events : null;
        }
        
        return eventsArray || [];
    } catch (error) {
        console.error('Failed to get marketer events:', error);
        return [];
    }
}

/**
 * Populate the event filter dropdown
 */
export async function populateEventFilter() {
    try {
        const events = await getMarketerEvents();
        const eventFilter = document.getElementById('eventFilter');
        
        if (!eventFilter) return;
        
        // Clear existing options except "All Events"
        eventFilter.innerHTML = '<option value="">All Events</option>';
        
        // Add event options
        events.forEach(event => {
            const option = document.createElement('option');
            option.value = event._id || event.id;
            option.textContent = event.name || 'Unnamed Event';
            eventFilter.appendChild(option);
        });
        
        // Add event listener for filter changes
        eventFilter.addEventListener('change', (e) => {
            loadFilteredAttendees(e.target.value);
        });
        
    } catch (error) {
        console.error('Failed to populate event filter:', error);
    }
}

/**
 * Load attendees with optional event filtering
 */
export async function loadFilteredAttendees(eventId = '') {
    try {
        const responseData = await marketersApi.getMyAttendees();
        
        // Extract attendees array handling different response formats
        let attendeesArray = Array.isArray(responseData) ? responseData : null;
        
        if (!attendeesArray && responseData && responseData.data && responseData.data.data) {
            attendeesArray = Array.isArray(responseData.data.data) ? responseData.data.data : null;
        }
        
        if (!attendeesArray && responseData && responseData.data) {
            attendeesArray = Array.isArray(responseData.data) ? responseData.data : null;
        }
        
        if (!attendeesArray && responseData && responseData.attendees) {
            attendeesArray = Array.isArray(responseData.attendees) ? responseData.attendees : null;
        }
        
        if (!attendeesArray) {
            attendeesArray = [];
        }
        
        // Filter by event if eventId is provided
        if (eventId) {
            attendeesArray = attendeesArray.filter(attendee => {
                const attendeeEventId = attendee.event?._id || attendee.event?.id || attendee.eventId;
                return attendeeEventId === eventId;
            });
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
            const sortableAttendees = attendeesArray
                .filter(attendee => attendee && attendee.createdAt)
                .sort((a, b) => {
                    try {
                        return new Date(b.createdAt) - new Date(a.createdAt);
                    } catch (e) {
                        return 0;
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
                        }
                    } catch (dateError) {
                        // Silently handle date formatting errors
                    }
                    
                    // Access event name safely
                    const eventName = attendee.event?.name || 'Unknown event';
                      row.innerHTML = `
                        <td>${attendee.name || 'No name'}</td>
                        <td>${attendee.phone || 'No phone'}</td>
                        <td>${eventName}</td>
                        <td>${attendee.state || 'N/A'}</td>
                        <td>${attendee.branch || 'N/A'}</td>
                        <td>${attendee.transportPreference === 'bus' ? 
                            `<span class="badge bg-success">Bus (${attendee.busPickup?.location || 'N/A'})</span>` : 
                            '<span class="badge bg-secondary">Private</span>'}
                        </td>
                        <td>${formattedDate}</td>
                        <td>${getCheckInStatusDisplay(attendee)}</td>
                    `;
                    
                    tableBody.appendChild(row);
                } catch (attendeeError) {
                    // Silently handle attendee processing errors
                }
            }
        } catch (sortError) {
            // Fallback if sorting fails
            const displayAttendees = attendeesArray.slice(0, 10);
            for (const attendee of displayAttendees) {
                try {
                    const row = document.createElement('tr');                    row.innerHTML = `
                        <td>${attendee.name || 'No name'}</td>
                        <td>${attendee.phone || 'No phone'}</td>
                        <td>${attendee.event?.name || 'Unknown event'}</td>
                        <td>${attendee.state || 'N/A'}</td>
                        <td>${attendee.branch || 'N/A'}</td>
                        <td>${attendee.transportPreference === 'bus' ? 'Bus' : 'Private'}</td>
                        <td>${attendee.createdAt || 'Date not available'}</td>
                        <td>${getCheckInStatusDisplay(attendee)}</td>
                    `;
                    tableBody.appendChild(row);
                } catch (e) {
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

// Note: Modal state/branch reset is now handled in openRegisterAttendeeModal()
// to populate with event-specific states and branches only

// Note: Modal state/branch reset is now handled in openRegisterAttendeeModal()
// to populate with event-specific states and branches only
