let currentEvents = [];
let currentFilter = 'upcoming'; // Default to upcoming events
let currentSearchTerm = '';

// Helper function to determine if an event is past or upcoming
function isEventPast(eventDate) {
    if (!eventDate) return false;
    
    const today = new Date('2025-05-26'); // Current date as specified
    const event = new Date(eventDate);
    
    // Reset time to compare dates only
    today.setHours(0, 0, 0, 0);
    event.setHours(0, 0, 0, 0);
    
    return event < today;
}

// Helper function to filter events based on the selected filter
function filterEventsByDate(events, filter) {
    switch (filter) {
        case 'upcoming':
            return events.filter(event => !isEventPast(event.date));
        case 'past':
            return events.filter(event => isEventPast(event.date));
        case 'all':
        default:
            return events;
    }
}

// Helper function to get event counts for each filter
function getEventCounts(events) {
    const upcoming = events.filter(event => !isEventPast(event.date)).length;
    const past = events.filter(event => isEventPast(event.date)).length;
    const all = events.length;
    
    return { upcoming, past, all };
}

// Helper function to update page title and dropdown options with counts
function updatePageTitleAndDropdown(events) {
    const counts = getEventCounts(events);
    const pageTitle = document.getElementById('page-title');
    const filterDropdown = document.getElementById('event-filter');
    
    if (pageTitle && filterDropdown) {
        // Update dropdown options with counts
        filterDropdown.innerHTML = `
            <option value="upcoming">Upcoming Events (${counts.upcoming})</option>
            <option value="all">All Events (${counts.all})</option>
            <option value="past">Past Events (${counts.past})</option>
        `;
        
        // Set the selected value
        filterDropdown.value = currentFilter;
        
        // Update page title based on current filter
        const titles = {
            'upcoming': `Upcoming Events (${counts.upcoming})`,
            'all': `All Events (${counts.all})`,
            'past': `Past Events (${counts.past})`
        };
        
        pageTitle.textContent = titles[currentFilter] || 'Events';
    }
}

// Helper function to format states display
function formatStatesDisplay(event) {
    if (!event) return 'Location not specified';
    
    if (event.states && Array.isArray(event.states) && event.states.length > 0) {
        return event.states.join(', ');
    } else if (event.state) {
        // Fallback for legacy single state property
        return event.state;
    } else if (event.location) {
        // Fallback for location property
        return event.location;
    }
    return 'Location not specified';
}

document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is authenticated
    if (!auth.isAuthenticated()) {
        showToast('error', 'Please login to view events');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
        return;
    }

    // Redirect admin users to admin dashboard
    const user = auth.getUser();
    if (user && user.role === 'admin') {
        // Check if the user just logged in and was redirected here
        const justLoggedIn = sessionStorage.getItem('justLoggedIn');
        if (justLoggedIn) {
            sessionStorage.removeItem('justLoggedIn');
            window.location.href = 'admin-dashboard.html';
            return;
        }
    }

    await loadEvents();
    setupEventListeners();
    
    // Focus the search input after a short delay to ensure the page is fully loaded
    setTimeout(() => {
        const searchInput = document.getElementById('event-search-input');
        if (searchInput) {
            searchInput.focus();
        }
    }, 500);
});

async function loadEvents() {
    try {
        // Get events from the API
        const response = await eventsApi.getAllEvents();
        
        // Handle different response formats
        let events = [];
        if (Array.isArray(response)) {
            events = response;
        } else if (response && response.data && Array.isArray(response.data)) {
            events = response.data;
        } else if (response && typeof response === 'object') {
            events = [response]; // Single event object
        }
        
        // Log the events for debugging
        console.log('Events loaded from database:', events);
          // Update the events list
        currentEvents = events;
        
        // Update page title and dropdown with counts
        updatePageTitleAndDropdown(events);
        
        // Apply initial filter (default to upcoming events)
        applyFilters();
        
        // Update page title and filter dropdown with event counts
        updatePageTitleAndDropdown(events);
    } catch (error) {
        console.error('Error loading events:', error);
        showToast('error', 'Failed to load events from the database');
        
        // Display error message in the events container
        const eventsContainer = document.querySelector('.row.g-4');
        if (eventsContainer) {
            eventsContainer.innerHTML = `
                <div class="col-12 text-center py-5">
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Unable to load events. Please try again later.
                    </div>
                </div>
            `;
        }
    }
}

function displayEvents(events) {
    const eventsContainer = document.querySelector('.row.g-4');
    if (!eventsContainer) return;
    
    // Hide the loading placeholder
    const loadingPlaceholder = document.getElementById('loading-placeholder');
    if (loadingPlaceholder) {
        loadingPlaceholder.style.display = 'none';
    }
    
    // Check if we're showing filtered results
    const searchInput = document.getElementById('event-search-input');
    const isFiltered = searchInput && searchInput.value.trim() !== '';
    
    // If no events are available, show an appropriate message
    if (!events || events.length === 0) {
        eventsContainer.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="alert alert-${isFiltered ? 'warning' : 'info'}">
                    <i class="fas fa-${isFiltered ? 'filter' : 'info-circle'} me-2"></i>
                    ${isFiltered ? 
                      'No events match your search. Try different keywords or clear the search.' : 
                      'No events are currently available. Please check back later.'}
                </div>
            </div>
        `;
        return;
    }
    
    // Display the events from the database
    eventsContainer.innerHTML = events.map(event => `
        <div class="col-md-6 col-lg-4">
            <div class="card h-100">                <img src="${getEventBannerUrl(event.bannerImage)}" class="card-img-top" alt="${event.name}">                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h5 class="card-title mb-0">${event.name || 'Unnamed Event'}</h5>
                        <span class="badge bg-${getStatusBadgeColor(event.status || 'UPCOMING')}">${event.status || 'UPCOMING'}</span>
                    </div>
                    <p class="card-text">${event.description ? (event.description.length > 100 ? event.description.substring(0, 100) + '...' : event.description) : 'No description available'}</p>
                    <div class="d-flex align-items-center mb-3">
                        <i class="fas fa-calendar-alt text-primary me-2"></i>
                        <span>${event.date ? new Date(event.date).toLocaleDateString() : 'Date not specified'}</span>
                    </div><div class="d-flex align-items-center mb-3">
                        <i class="fas fa-map-marker-alt text-primary me-2"></i>
                        <span>${formatStatesDisplay(event)}</span>
                    </div>
                    <a href="event-details.html?id=${event._id}" class="btn btn-outline-primary w-100">View Details</a>
                </div>
            </div>
        </div>
    `).join('');
}

function setupEventListeners() {
    // Search functionality - real-time filtering as user types
    const searchInput = document.getElementById('event-search-input');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const searchFeedback = document.getElementById('search-feedback');
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            // Get the search term and trim whitespace
            currentSearchTerm = e.target.value.toLowerCase().trim();
            
            // Apply both date filter and search filter
            applyFilters();
            
            // Show/hide clear button and feedback based on search term
            if (currentSearchTerm.length > 0) {
                clearSearchBtn.classList.remove('d-none');
                searchFeedback.classList.remove('d-none');
                
                // Get currently filtered events (by date) then apply search
                const dateFilteredEvents = filterEventsByDate(currentEvents, currentFilter);
                const matchCount = dateFilteredEvents.filter(event => {
                    const nameMatch = event.name ? event.name.toLowerCase().includes(currentSearchTerm) : false;
                    const descriptionMatch = event.description ? event.description.toLowerCase().includes(currentSearchTerm) : false;
                    const locationMatch = formatStatesDisplay(event).toLowerCase().includes(currentSearchTerm);
                    return nameMatch || descriptionMatch || locationMatch;
                }).length;
                
                searchFeedback.textContent = `Found ${matchCount} matching event${matchCount !== 1 ? 's' : ''} for "${currentSearchTerm}"`;
            } else {
                clearSearchBtn.classList.add('d-none');
                searchFeedback.classList.add('d-none');
            }
        });
    }
    
    // Clear search button
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            if (searchInput) {
                searchInput.value = '';
                currentSearchTerm = '';
                searchInput.focus();
                clearSearchBtn.classList.add('d-none');
                searchFeedback.classList.add('d-none');
                applyFilters();
            }
        });
    }

    // Event filter - by date (upcoming, past, all)
    const eventFilter = document.getElementById('event-filter');
    if (eventFilter) {
        eventFilter.addEventListener('change', (e) => {
            currentFilter = e.target.value;
            applyFilters();
            updatePageTitleAndDropdown(currentEvents);
        });
    }

    // Create Event button - only show for admins
    const createEventBtn = document.querySelector('button.btn-primary.admin-only-element');
    if (createEventBtn) {
        // Only show the button if the user is an admin
        if (auth.isAuthenticated() && auth.getUser().role === 'admin') {
            createEventBtn.classList.remove('d-none');
            
            createEventBtn.addEventListener('click', () => {
                // Admin is authenticated, proceed to admin dashboard
                showToast('success', 'Redirecting to admin dashboard...');
                setTimeout(() => {
                    window.location.href = 'admin-dashboard.html';
                }, 1000);
            });
        }
    }
}

// Helper function to apply both date and search filters
function applyFilters() {
    // First apply date filter
    let filteredEvents = filterEventsByDate(currentEvents, currentFilter);
    
    // Then apply search filter if there's a search term
    if (currentSearchTerm.length > 0) {
        filteredEvents = filteredEvents.filter(event => {
            const nameMatch = event.name ? event.name.toLowerCase().includes(currentSearchTerm) : false;
            const descriptionMatch = event.description ? event.description.toLowerCase().includes(currentSearchTerm) : false;
            const locationMatch = formatStatesDisplay(event).toLowerCase().includes(currentSearchTerm);
            return nameMatch || descriptionMatch || locationMatch;
        });
    }
    
    // Display the filtered events
    displayEvents(filteredEvents);
}

function getStatusBadgeColor(status) {
    const colors = {
        'UPCOMING': 'primary',
        'IN_PROGRESS': 'success',
        'COMPLETED': 'secondary',
        'CANCELLED': 'danger'
    };
    return colors[status] || 'primary';
}
