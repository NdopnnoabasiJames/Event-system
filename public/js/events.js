let currentEvents = [];

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
        displayEvents(events);
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
            const searchTerm = e.target.value.toLowerCase().trim();
              // Show/hide clear button and feedback based on search term
            if (searchTerm.length > 0) {
                clearSearchBtn.classList.remove('d-none');
                searchFeedback.classList.remove('d-none');
                
                // Update feedback message with count of matching events
                const matchCount = currentEvents.filter(event => {
                    const nameMatch = event.name ? event.name.toLowerCase().includes(searchTerm) : false;
                    const descriptionMatch = event.description ? event.description.toLowerCase().includes(searchTerm) : false;
                    const locationMatch = formatStatesDisplay(event).toLowerCase().includes(searchTerm);
                    return nameMatch || descriptionMatch || locationMatch;
                }).length;
                
                searchFeedback.textContent = `Found ${matchCount} matching event${matchCount !== 1 ? 's' : ''} for "${searchTerm}"`;
            } else {
                clearSearchBtn.classList.add('d-none');
                searchFeedback.classList.add('d-none');
            }
            
            // Filter events that match the search term in name, description, or location
            const filteredEvents = currentEvents.filter(event => {
                // Safely check each field exists before including in search
                const nameMatch = event.name ? event.name.toLowerCase().includes(searchTerm) : false;
                const descriptionMatch = event.description ? event.description.toLowerCase().includes(searchTerm) : false;
                const locationMatch = formatStatesDisplay(event).toLowerCase().includes(searchTerm);
                
                return nameMatch || descriptionMatch || locationMatch;
            });
            
            // Display the filtered events
            displayEvents(filteredEvents);
        });
    }
    
    // Clear search button
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            if (searchInput) {
                searchInput.value = '';
                searchInput.focus();
                clearSearchBtn.classList.add('d-none');
                searchFeedback.classList.add('d-none');
                displayEvents(currentEvents);
            }
        });
    }

    // Category filter
    const categorySelect = document.querySelector('select');
    if (categorySelect) {
        categorySelect.addEventListener('change', (e) => {
            const category = e.target.value;
            const filteredEvents = category === 'All Categories' 
                ? currentEvents 
                : currentEvents.filter(event => event.category === category);
            displayEvents(filteredEvents);
        });
    }    // Create Event button - only show for admins
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

function getStatusBadgeColor(status) {
    const colors = {
        'UPCOMING': 'primary',
        'IN_PROGRESS': 'success',
        'COMPLETED': 'secondary',
        'CANCELLED': 'danger'
    };
    return colors[status] || 'primary';
}
