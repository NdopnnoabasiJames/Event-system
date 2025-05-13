let currentEvents = [];

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
    
    // If no events are available, show a message
    if (!events || events.length === 0) {
        eventsContainer.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    No events are currently available. Please check back later.
                </div>
            </div>
        `;
        return;
    }
    
    // Display the events from the database
    eventsContainer.innerHTML = events.map(event => `
        <div class="col-md-6 col-lg-4">
            <div class="card h-100">
                <img src="${event.imageUrl || 'https://placehold.co/400x200'}" class="card-img-top" alt="${event.name}">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h5 class="card-title mb-0">${event.name}</h5>
                        <span class="badge bg-${getStatusBadgeColor(event.status || 'UPCOMING')}">${event.status || 'UPCOMING'}</span>
                    </div>
                    <p class="card-text">${event.description || 'No description available'}</p>
                    <div class="d-flex align-items-center mb-3">
                        <i class="fas fa-calendar-alt text-primary me-2"></i>
                        <span>${new Date(event.date).toLocaleDateString()}</span>
                    </div>
                    <div class="d-flex align-items-center mb-3">
                        <i class="fas fa-map-marker-alt text-primary me-2"></i>
                        <span>${event.state || event.location || 'Location not specified'}</span>
                    </div>
                    <a href="event-details.html?id=${event._id}" class="btn btn-outline-primary w-100">View Details</a>
                </div>
            </div>
        </div>
    `).join('');
}

function setupEventListeners() {
    // Search functionality
    const searchInput = document.querySelector('input[placeholder="Search events..."]');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filteredEvents = currentEvents.filter(event => 
                event.name.toLowerCase().includes(searchTerm) ||
                event.description.toLowerCase().includes(searchTerm) ||
                event.location.toLowerCase().includes(searchTerm)
            );
            displayEvents(filteredEvents);
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
    }

    // Create Event button
    const createEventBtn = document.querySelector('button.btn-primary');
    if (createEventBtn) {
        createEventBtn.addEventListener('click', () => {
            // Implement create event modal or navigation
            window.location.href = 'create-event.html';
        });
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
