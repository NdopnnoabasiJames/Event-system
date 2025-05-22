# Admin Dashboard Module Organization

## Overview
The admin dashboard has been refactored to split functionality across multiple files for better organization and maintainability.

## File Structure

```
public/js/
├── admin-dashboard.js         # Main entry point 
└── admin/
    └── modules/
        ├── events.js          # Event-related functions
        ├── marketers.js       # Marketer-related functions
        ├── concierges.js      # Concierge-related functions
        └── utils.js           # Utility functions
```

## Modules

### events.js
Contains functions for event management:
- `loadEventsData()` - Loads and displays events in the events table
- `setupEventFilter()` - Sets up the event filter dropdown
- `formatEventData()` - Formats event data for API submission
- `loadAttendeesData()` - Loads attendees data for events
- `setupEventCreationHandlers()` - Sets up event creation form handlers

### marketers.js
Contains functions for marketer management:
- `loadTopMarketers()` - Loads and displays top marketers
- `showMarketerDetails()` - Shows details for a specific marketer

### concierges.js
Contains functions for concierge management:
- `loadConciergeRequests()` - Loads pending concierge requests
- `reviewConciergeRequest()` - Approves or rejects concierge requests
- `loadApprovedConcierges()` - Loads approved concierges
- `setupConciergeTabHandlers()` - Sets up tab handlers for concierge section

### utils.js
Contains utility functions:
- `updateAuthState()` - Updates the authentication state UI
- `isValidDate()` - Validates date strings
- `getFormDataAsObject()` - Converts form data to a JavaScript object
- `toFullISOString()` - Converts date values to ISO strings
- `toISODateString()` - Converts date values to ISO date strings

## Benefits
- Smaller, more focused files
- Improved code organization
- Better maintainability
- Clearer separation of concerns
