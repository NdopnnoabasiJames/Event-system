// Marketer Management Module
// This module handles all marketer-related functionality for the admin dashboard

/**
 * Load top performing marketers and display them in the table
 */
export async function loadTopMarketers() {
    try {
        const response = await marketersApi.getTopMarketers();        
        const marketers = Array.isArray(response) ? response : (response.data || []);
        
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
            // Ensure we have the marketer ID
            const marketerId = item.marketer.id || item.marketer._id;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${item.marketer.name}</td>
                <td>${item.marketer.email}</td>
                <td>${item.stats.totalAttendeesRegistered}</td>
                <td>${item.stats.eventsParticipated}</td>
                <td>
                    <button class="btn btn-sm btn-info view-marketer" data-marketer-id="${marketerId}">
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
        showToast('error', 'Failed to load marketers data');
    }
}

/**
 * Show detailed information about a specific marketer in a modal
 */
export async function showMarketerDetails(marketerId) {
    try {
        // Get marketer user info
        const marketerResponse = await apiCall(`/users/${marketerId}`, 'GET', null, auth.getToken());
        
        // Handle different response formats
        const marketer = marketerResponse.data || marketerResponse;
        
        if (!marketer) {
            throw new Error('Could not retrieve marketer information');
        }
          
        // Get marketer performance stats
        const statsResponse = await apiCall(`/marketers/analytics/performance?marketerId=${marketerId}`, 'GET', null, auth.getToken());
        
        // Handle different response formats
        const stats = statsResponse.data || statsResponse;
        
        // Update modal content with marketer info and stats
        document.getElementById('marketer-name').textContent = marketer.name || 'No name available';
        document.getElementById('marketer-email').textContent = marketer.email || 'No email available';
        document.getElementById('marketer-total-attendees').textContent = stats?.totalAttendeesRegistered || 0;
        document.getElementById('marketer-events').textContent = stats?.eventsParticipated || 0;
          
        // Get marketer events
        const eventsResponse = await apiCall(`/marketers/events/my?marketerId=${marketerId}`, 'GET', null, auth.getToken());
        
        // Extract events data handling different response formats
        // First check if response is an array directly
        let eventsArray = Array.isArray(eventsResponse) ? eventsResponse : null;
        
        // If not an array directly, check for data property that might be an array
        if (!eventsArray && eventsResponse && eventsResponse.data) {
            eventsArray = Array.isArray(eventsResponse.data) ? eventsResponse.data : null;
        }
        
        // If we still don't have an array, check for events property
        if (!eventsArray && eventsResponse && eventsResponse.events) {
            eventsArray = Array.isArray(eventsResponse.events) ? eventsResponse.events : null;
        }
        
        // Final fallback - if we still don't have an array, create an empty one
        if (!eventsArray) {
            eventsArray = [];
        }
        
        // Populate events table
        const eventsTable = document.getElementById('marketer-events-table');
        eventsTable.innerHTML = '';
        
        if (eventsArray.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="3" class="text-center">No events found</td>';
            eventsTable.appendChild(row);
        } else {
            for (const event of eventsArray) {
                try {                    
                    // Make sure event has an _id property
                    const eventId = event._id || event.id;
                    
                    if (!eventId) {
                        continue;
                    }
                    
                    // Get attendee count for this event and marketer
                    const eventStatsResponse = await apiCall(
                        `/marketers/analytics/event/${eventId}?marketerId=${marketerId}`,
                        'GET', 
                        null, 
                        auth.getToken()
                    );
                    
                    const eventStats = eventStatsResponse.data || eventStatsResponse;
                    
                    const row = document.createElement('tr');
                    
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
                    
                    row.innerHTML = `
                        <td>${event.name || 'Unnamed event'}</td>
                        <td>${formattedDate}</td>
                        <td>${eventStats?.attendeesCount || 0}</td>
                    `;
                    
                    eventsTable.appendChild(row);                
                } catch (eventError) {
                    // Still create a row with available information
                    const row = document.createElement('tr');
                    let eventName = 'Unknown event';
                    let formattedDate = 'Date not available';
                    
                    try {
                        if (event.name) eventName = event.name;
                        if (event.date) {
                            const eventDate = new Date(event.date);
                            formattedDate = eventDate.toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                            });
                        }                    
                    } catch (formatError) {
                        // Silently handle formatting errors
                    }
                    
                    row.innerHTML = `
                        <td>${eventName}</td>
                        <td>${formattedDate}</td>
                        <td>Error loading data</td>
                    `;
                    
                    eventsTable.appendChild(row);
                }
            }
        }
        
        // Show modal - Make sure we're using the right Bootstrap version API
        const modalElement = document.getElementById('marketerDetailModal');
        if (!modalElement) {
            throw new Error('Modal element not found');
        }
          
        try {
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        } catch (modalError) {
            // Fallback method if the bootstrap.Modal constructor fails
            // This uses jQuery if available, otherwise falls back to setting display styles
            if (window.$) {
                window.$(modalElement).modal('show');
            } else {
                modalElement.style.display = 'block';
                modalElement.classList.add('show');
                document.body.classList.add('modal-open');
                
                // Add backdrop if it doesn't exist
                let backdrop = document.querySelector('.modal-backdrop');
                if (!backdrop) {
                    backdrop = document.createElement('div');
                    backdrop.className = 'modal-backdrop fade show';
                    document.body.appendChild(backdrop);
                }
            }
        }
          
    } catch (error) {
        showToast('error', 'Failed to load marketer details: ' + (error.message || 'Unknown error'));
    }
}

/**
 * Setup the marketer filter dropdown for attendees filtering
 */
export async function setupMarketerFilter() {
    try {
        // Get all marketers
        const response = await marketersApi.getTopMarketers();
        const marketers = Array.isArray(response) ? response : (response.data || []);
        
        const selectElement = document.getElementById('marketer-filter');
        
        // Clear existing options except the first one
        while (selectElement.options.length > 1) {
            selectElement.remove(1);
        }
        
        if (!marketers || marketers.length === 0) {
            return;
        }
        
        // Sort marketers by name
        marketers.sort((a, b) => {
            const nameA = a.marketer?.name || '';
            const nameB = b.marketer?.name || '';
            return nameA.localeCompare(nameB);
        });
        
        // Add marketer options
        marketers.forEach(item => {
            const marketer = item.marketer;
            if (marketer && marketer.name) {
                const option = document.createElement('option');
                option.value = marketer._id || marketer.id;
                option.textContent = marketer.name;
                selectElement.appendChild(option);
            }
        });
    } catch (error) {
        // Silently handle marketer filter setup errors
        console.error('Error setting up marketer filter:', error);
    }
}
