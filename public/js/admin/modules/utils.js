// Utility functions for admin dashboard

// Update authentication state
export function updateAuthState() {
    const user = auth.getUser();
    
    // Update user info in the sidebar
    if (user) {
        const userNameElement = document.getElementById('user-name');
        const userRoleElement = document.getElementById('user-role');
        
        if (userNameElement) {
            userNameElement.textContent = user.name || 'Admin User';
        }
        
        if (userRoleElement) {
            userRoleElement.textContent = (user.role || 'admin').toUpperCase();
        }
        
        // Show the logout button
        const logoutButton = document.getElementById('logout-btn');
        if (logoutButton) {
            logoutButton.classList.remove('d-none');
            logoutButton.addEventListener('click', () => {
                auth.logout();
                window.location.href = 'login.html';
            });
        }
    }
}

// Validate dates
export function isValidDate(dateString) {
    if (!dateString) return false;
    
    try {
        const date = new Date(dateString);
        return !isNaN(date.getTime());
    } catch (error) {
        return false;
    }
}

// Convert form data to object
export function getFormDataAsObject(form) {
    const formData = new FormData(form);
    const data = {};
    
    for (const [key, value] of formData.entries()) {
        // Handle nested properties using bracket notation (e.g., branches[0].name)
        if (key.includes('[') && key.includes('].')) {
            const mainKey = key.substring(0, key.indexOf('['));
            const index = parseInt(key.substring(key.indexOf('[') + 1, key.indexOf(']')));
            const subKey = key.substring(key.indexOf('].') + 2);
            
            if (!data[mainKey]) {
                data[mainKey] = [];
            }
            
            if (!data[mainKey][index]) {
                data[mainKey][index] = {};
            }
            
            data[mainKey][index][subKey] = value;
        } else {
            data[key] = value;
        }
    }
    
    return data;
}

// Convert to full ISO 8601 string
export function toFullISOString(val) {
    if (!val) return undefined;
    // If format is dd/mm/yyyy, convert to yyyy-mm-dd
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
        const [day, month, year] = val.split('/');
        val = `${year}-${month}-${day}`;
    }
    // If format is yyyy-mm-ddTHH:MM (from datetime-local), treat as local and convert to ISO
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)) {
        // To ensure local time, split and use Date parts
        const [datePart, timePart] = val.split('T');
        const [year, month, day] = datePart.split('-');
        const [hour, minute] = timePart.split(':');
        const d = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
        return d.toISOString();
    }
    // Fallback: try to parse and format as ISO string
    const d = new Date(val);
    if (isNaN(d.getTime())) return undefined;
    return d.toISOString();
}

// Helper to convert any value to ISO date string (YYYY-MM-DD)
export function toISODateString(val) {
    if (!val) return undefined;
    // If format is dd/mm/yyyy, convert to yyyy-mm-dd
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
        const [day, month, year] = val.split('/');
        return `${year}-${month}-${day}`;
    }
    // If format is yyyy-mm-ddTHH:MM (from datetime-local), extract date part
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)) {
        return val.split('T')[0];
    }
    // If already yyyy-mm-dd, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
        return val;
    }
    // Fallback: try to parse and format as yyyy-mm-dd
    const d = new Date(val);
    if (isNaN(d.getTime())) return undefined;
    return d.toISOString().split('T')[0];
}
