// Diagnostic tool to check if all required functions are properly exposed
function checkModuleFunctions() {    const requiredFunctions = {
        events: [
            'loadEventsData',
            'setupEventFilter',
            'loadAttendeesData',
            'setupEventCreationHandlers',
            'formatEventData',
            'setupBranchHandlers',
            'setupBusPickupHandlers',
            'setupEventFormSubmission'
        ],
        marketers: [
            'loadTopMarketers',
            'showMarketerDetails'
        ],
        concierges: [
            'loadConciergeRequests',
            'reviewConciergeRequest',
            'loadApprovedConcierges',
            'setupConciergeTabHandlers'
        ],
        utils: [
            'updateAuthState',
            'isValidDate',
            'getFormDataAsObject',
            'toFullISOString',
            'toISODateString'
        ]
    };

    const missing = [];
    
    // Check each function
    Object.keys(requiredFunctions).forEach(module => {
        requiredFunctions[module].forEach(func => {
            if (typeof window[func] !== 'function') {
                missing.push(`${module}.${func}`);
            }
        });
    });

    if (missing.length > 0) {
        console.error('Missing functions:', missing);
        alert('Some required functions are missing. Check the console for details.');
        return false;
    } else {
        console.log('All required functions are available');
        return true;
    }
}

// Run the check
window.checkModuleFunctions = checkModuleFunctions;
