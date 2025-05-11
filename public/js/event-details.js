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
        setupRegistrationForm(eventId);
    } else {
        showToast('error', 'Event not found');
        setTimeout(() => {
            window.location.href = 'events.html';
        }, 1000);
    }
});

async function loadEventDetails(eventId) {
    try {
        const event = await eventsApi.getEvent(eventId);
        updateEventUI(event);
    } catch (error) {
        showToast('error', 'Failed to load event details');
    }
}

function updateEventUI(event) {
    // Update event image
    document.querySelector('.img-fluid').src = event.imageUrl || 'https://placehold.co/800x400';

    // Update event title and basic info
    document.querySelector('h1').textContent = event.name;
    
    // Update event badges
    const badges = document.querySelector('.d-flex.flex-wrap.gap-3');
    badges.innerHTML = `
        <span class="badge bg-primary fs-6">
            <i class="fas fa-calendar-alt me-2"></i>${new Date(event.date).toLocaleDateString()}
        </span>
        <span class="badge bg-success fs-6">
            <i class="fas fa-clock me-2"></i>${event.time || '9:00 AM - 5:00 PM'}
        </span>
        <span class="badge bg-info fs-6">
            <i class="fas fa-map-marker-alt me-2"></i>${event.location}
        </span>
        <span class="badge bg-warning fs-6">
            <i class="fas fa-users me-2"></i>${event.capacity - event.attendeeCount} Seats Available
        </span>
    `;

    // Update description
    document.querySelector('.card-text').textContent = event.description;

    // Update stats
    const stats = document.querySelectorAll('.col h5');
    stats[0].textContent = event.attendeeCount || 0;
    stats[1].textContent = event.capacity - (event.attendeeCount || 0);
    stats[2].textContent = Math.ceil((new Date(event.date) - new Date()) / (1000 * 60 * 60 * 24));
}

function setupRegistrationForm(eventId) {
    const registrationForm = document.querySelector('form');
    const transportSelect = document.querySelector('select[name="transport"]');

    if (transportSelect) {
        transportSelect.addEventListener('change', (e) => {
            const pickupLocationSelect = document.querySelector('select[name="pickupLocation"]');
            if (pickupLocationSelect) {
                pickupLocationSelect.disabled = e.target.value !== 'bus';
            }
        });
    }

    if (registrationForm) {
        registrationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const formData = getFormData(registrationForm);
                await attendeesApi.createAttendee(eventId, formData);
                showToast('success', 'Registration successful!');
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } catch (error) {
                showToast('error', error.message || 'Registration failed');
            }
        });
    }
}
