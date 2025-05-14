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
        const responseData = await apiCall('/marketers/analytics/performance', 'GET', null, auth.getToken());
        console.log('Performance data response:', responseData);
        
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
        
        document.getElementById('avg-attendees').textContent = avgAttendees;
    } catch (error) {
        console.error('Error loading performance data:', error);
        showToast('error', 'Failed to load performance data');
        
        // Set default values in case of error
        document.getElementById('total-attendees').textContent = '0';
        document.getElementById('events-participated').textContent = '0';
        document.getElementById('avg-attendees').textContent = '0.0';
    }
}

async function loadMarketerEvents() {
    try {
        const responseData = await apiCall('/marketers/events/my', 'GET', null, auth.getToken());
        console.log('Events response:', responseData);
        
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
            console.warn('Could not extract events array from response, using empty array');
            eventsArray = [];
        }
        
        console.log('Processed events array:', eventsArray);
        
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
                    console.error('Error formatting date:', dateError);
                }
                  row.innerHTML = `
                    <td>${eventName}</td>
                    <td>${formattedDate}</td>
                    <td id="attendee-count-${eventId}">Loading...</td>
                    <td>
                        <div class="btn-group" role="group">
                            <button class="btn btn-sm btn-info view-performance" data-event-id="${eventId}">
                                <i class="bi bi-graph-up"></i> Performance
                            </button>
                            <button class="btn btn-sm btn-success register-attendee" data-event-id="${eventId}" data-event-name="${eventName}">
                                <i class="bi bi-person-plus"></i> Register Attendee
                            </button>
                        </div>
                    </td>
                `;
                
                tableBody.appendChild(row);
                
                // Load attendee count for this event if we have a valid ID
                if (eventId !== 'unknown') {
                    loadEventAttendeeCount(eventId);
                }
            } catch (eventError) {
                console.error('Error processing event:', event, eventError);
            }
        }
          // Add event listeners for performance buttons
        document.querySelectorAll('.view-performance').forEach(button => {
            button.addEventListener('click', (e) => {
                const eventId = e.currentTarget.getAttribute('data-event-id');
                if (eventId && eventId !== 'unknown') {
                    showEventPerformance(eventId);
                } else {
                    showToast('error', 'Cannot view performance for this event');
                }
            });
        });
        
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
    } catch (error) {
        console.error('Error loading marketer events:', error);
        showToast('error', 'Failed to load events');
        
        // Show no events message in case of error
        const tableBody = document.getElementById('events-table-body');
        const noEventsMessage = document.getElementById('no-events');
        if (tableBody) tableBody.innerHTML = '';
        if (noEventsMessage) noEventsMessage.classList.remove('d-none');
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
        const responseData = await apiCall('/marketers/attendees', 'GET', null, auth.getToken());
        console.log('Attendees response:', responseData);
        
        // Extract attendees array handling different response formats
        // First check if response is an array directly
        let attendeesArray = Array.isArray(responseData) ? responseData : null;
        
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
            console.warn('Could not extract attendees array from response, using empty array');
            attendeesArray = [];
        }
        
        console.log('Processed attendees array:', attendeesArray);
        
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
                        }
                    } catch (dateError) {
                        console.error('Error formatting date:', dateError);
                    }
                    
                    // Access event name safely
                    const eventName = attendee.event?.name || 'Unknown event';
                    
                    row.innerHTML = `
                        <td>${attendee.name || 'No name'}</td>
                        <td>${attendee.email || 'No email'}</td>
                        <td>${eventName}</td>
                        <td>${attendee.transportPreference === 'bus' ? 
                            `<span class="badge bg-success">Bus (${attendee.busPickup?.location || 'N/A'})</span>` : 
                            '<span class="badge bg-secondary">Private</span>'}
                        </td>
                        <td>${formattedDate}</td>
                    `;
                    
                    tableBody.appendChild(row);
                } catch (attendeeError) {
                    console.error('Error processing attendee:', attendee, attendeeError);
                }
            }
        } catch (sortError) {
            console.error('Error sorting or processing attendees:', sortError);
            
            // Fallback - just show first 10 without sorting
            const displayAttendees = attendeesArray.slice(0, 10);
            for (const attendee of displayAttendees) {
                try {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${attendee.name || 'No name'}</td>
                        <td>${attendee.email || 'No email'}</td>
                        <td>${attendee.event?.name || 'Unknown event'}</td>
                        <td>${attendee.transportPreference === 'bus' ? 'Bus' : 'Private'}</td>
                        <td>${attendee.createdAt || 'Date not available'}</td>
                    `;
                    tableBody.appendChild(row);
                } catch (e) {
                    console.error('Error displaying attendee:', e);
                }
            }
        }
    } catch (error) {
        console.error('Error loading marketer attendees:', error);
        showToast('error', 'Failed to load attendees');
        
        // Show no attendees message in case of error
        const tableBody = document.getElementById('attendees-table-body');
        const noAttendeesMessage = document.getElementById('no-attendees');
        if (tableBody) tableBody.innerHTML = '';
        if (noAttendeesMessage) noAttendeesMessage.classList.remove('d-none');
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

// Function to open the register attendee modal
async function openRegisterAttendeeModal(eventId, eventName) {
    try {
        console.log('Opening register attendee modal for event:', eventId, eventName);
        
        // Set the event ID in the hidden field
        document.getElementById('registerEventId').value = eventId;
        
        // Update the modal title to include the event name
        const modalTitle = document.querySelector('#registerAttendeeModal .modal-title');
        modalTitle.textContent = `Register Attendee for ${eventName}`;
        
        // Get event details to populate bus pickup locations
        const event = await apiCall(`/events/${eventId}`, 'GET', null, auth.getToken());
        console.log('Event details:', event);
        
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
                    console.error('Error formatting pickup time:', error);
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
        console.error('Error opening register attendee modal:', error);
        showToast('error', 'Failed to prepare registration form. Please try again.');
    }
}

// Function to handle attendee registration form submission
async function registerAttendee() {
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
        const transportPreference = document.querySelector('input[name="transportPreference"]:checked').value;
        
        // Prepare attendee data
        const attendeeData = {
            name,
            email,
            phone,
            transportPreference
        };
        
        // Handle bus pickup if selected
        if (transportPreference === 'bus') {
            const busPickupValue = document.getElementById('busPickupLocation').value;
            
            if (!busPickupValue) {
                showToast('error', 'Please select a bus pickup location');
                return;
            }
            
            try {
                const busPickup = JSON.parse(busPickupValue);
                attendeeData.busPickup = busPickup;
            } catch (error) {
                console.error('Error parsing bus pickup data:', error);
                showToast('error', 'Invalid bus pickup data');
                return;
            }
        }
        
        console.log('Registering attendee with data:', attendeeData);
        
        // Send request to register attendee
        const response = await marketersApi.registerAttendee(eventId, attendeeData);
        console.log('Registration response:', response);
        
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
        
        // Reload attendees data
        await loadMarketerAttendees();
        
        // Update attendee count for this event
        loadEventAttendeeCount(eventId);
        
    } catch (error) {
        console.error('Error registering attendee:', error);
        let errorMessage = 'Failed to register attendee';
        
        // Check for specific error types
        if (error.response?.status === 409) {
            errorMessage = 'This email is already registered for this event';
        } else if (error.response?.status === 400) {
            errorMessage = 'Invalid attendee data. Please check all fields and try again.';
        }
        
        showToast('error', errorMessage);
    }
}

// Set up the event listener for attendee registration form submission
document.addEventListener('DOMContentLoaded', () => {
    // Attach the event listener after the DOM is loaded
    const saveAttendeeBtn = document.getElementById('saveAttendeeBtn');
    if (saveAttendeeBtn) {
        saveAttendeeBtn.addEventListener('click', registerAttendee);
    }
    
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
});
