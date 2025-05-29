/**
 * Form Utilities
 * Helper functions for form data processing and validation
 */

/**
 * Helper function to extract form data as an object
 * @param {HTMLFormElement} form - The form element to extract data from
 * @returns {Object} Object containing form data
 */
export function getFormDataAsObject(form) {
    const formData = new FormData(form);
    const data = {};
    
    // First, collect all checkbox values with the same name into arrays
    const checkboxGroups = {};
    form.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
        const name = checkbox.name;
        if (name) {
            if (!checkboxGroups[name]) {
                checkboxGroups[name] = [];
            }
            checkboxGroups[name].push(checkbox.value);
        }
    });
    
    for (const [key, value] of formData.entries()) {
        // Skip checkboxes as we handle them separately above
        const element = form.querySelector(`[name="${key}"]`);
        if (element && element.type === 'checkbox') {
            continue;
        }
        
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
    
    // Now handle checkbox groups
    for (const [name, values] of Object.entries(checkboxGroups)) {
        if (name.includes('[') && name.includes('].')) {
            // Handle nested checkbox arrays like busPickups[0].stations
            const mainKey = name.substring(0, name.indexOf('['));
            const index = parseInt(name.substring(name.indexOf('[') + 1, name.indexOf(']')));
            const subKey = name.substring(name.indexOf('].') + 2);
            
            if (!data[mainKey]) {
                data[mainKey] = [];
            }
            
            if (!data[mainKey][index]) {
                data[mainKey][index] = {};
            }
            
            data[mainKey][index][subKey] = values;
        } else {
            data[name] = values;
        }
    }
    
    return data;
}

/**
 * Helper to convert any value to full ISO 8601 string (yyyy-mm-ddTHH:MM:SS.sssZ)
 * @param {string|Date} val - The value to convert
 * @returns {string|undefined} ISO string or undefined if invalid
 */
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
