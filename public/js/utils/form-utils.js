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
