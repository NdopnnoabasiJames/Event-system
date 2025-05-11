let currentAttendees = [];

document.addEventListener('DOMContentLoaded', async () => {
    if (!auth.isAuthenticated()) {
        showToast('error', 'Please login to view attendees');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
        return;
    }

    await loadAttendees();
    setupEventListeners();
});

async function loadAttendees(eventId = null) {
    try {
        const attendees = await attendeesApi.getAllAttendees(eventId);
        currentAttendees = attendees;
        displayAttendees(attendees);
    } catch (error) {
        showToast('error', 'Failed to load attendees');
    }
}

function displayAttendees(attendees) {
    const tableBody = document.querySelector('tbody');
    if (!tableBody) return;

    tableBody.innerHTML = attendees.map(attendee => `
        <tr>
            <td>${attendee.firstName} ${attendee.lastName}</td>
            <td>${attendee.event.name}</td>
            <td>${attendee.email}</td>
            <td>${attendee.transport}</td>
            <td>${attendee.pickupLocation || '-'}</td>
            <td><span class="badge bg-${getStatusBadgeColor(attendee.status)}">${attendee.status}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editAttendee('${attendee._id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteAttendee('${attendee._id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function setupEventListeners() {
    // Search functionality
    const searchInput = document.querySelector('input[placeholder="Search attendees..."]');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filteredAttendees = currentAttendees.filter(attendee => 
                `${attendee.firstName} ${attendee.lastName}`.toLowerCase().includes(searchTerm) ||
                attendee.email.toLowerCase().includes(searchTerm)
            );
            displayAttendees(filteredAttendees);
        });
    }

    // Event filter
    const eventSelect = document.querySelector('select[name="event"]');
    if (eventSelect) {
        eventSelect.addEventListener('change', (e) => {
            const eventId = e.target.value;
            if (eventId) {
                loadAttendees(eventId);
            } else {
                loadAttendees();
            }
        });
    }

    // Transport filter
    const transportSelect = document.querySelector('select[name="transport"]');
    if (transportSelect) {
        transportSelect.addEventListener('change', (e) => {
            const transport = e.target.value;
            const filteredAttendees = transport 
                ? currentAttendees.filter(attendee => attendee.transport === transport)
                : currentAttendees;
            displayAttendees(filteredAttendees);
        });
    }

    // Add Attendee button
    const addAttendeeBtn = document.querySelector('button.btn-primary');
    if (addAttendeeBtn) {
        addAttendeeBtn.addEventListener('click', () => {
            showAddAttendeeModal();
        });
    }
}

async function editAttendee(id) {
    try {
        const attendee = await attendeesApi.getAttendee(id);
        showEditAttendeeModal(attendee);
    } catch (error) {
        showToast('error', 'Failed to load attendee details');
    }
}

async function deleteAttendee(id) {
    if (confirm('Are you sure you want to delete this attendee?')) {
        try {
            await attendeesApi.deleteAttendee(id);
            showToast('success', 'Attendee deleted successfully');
            await loadAttendees();
        } catch (error) {
            showToast('error', 'Failed to delete attendee');
        }
    }
}

function getStatusBadgeColor(status) {
    const colors = {
        'CONFIRMED': 'success',
        'PENDING': 'warning',
        'CANCELLED': 'danger'
    };
    return colors[status] || 'secondary';
}

// Modal handling functions would go here
// You'll need to add the modal HTML to the attendees.html file
function showAddAttendeeModal() {
    // Implement modal display logic
}

function showEditAttendeeModal(attendee) {
    // Implement modal display logic
}
