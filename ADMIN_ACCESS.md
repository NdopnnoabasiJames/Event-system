# Event Management System - Admin Access

This system is designed to help manage events, track attendees, and monitor marketer performance.

## Admin Access

An admin account is automatically created when the system starts up. You can use these credentials to access the admin dashboard:

- **Email**: admin@example.com
- **Password**: Admin123!

After logging in, you'll have access to:

1. View and manage all events
2. Monitor marketer performance and statistics
3. View all attendees registered by marketers
4. Access analytics dashboards

## Marketer-Attendee Relationships

- Each attendee is linked to the marketer who registered them (via the `registeredBy` field)
- Marketers can view their performance statistics including total attendees registered
- Admins can view top-performing marketers based on the number of attendees they've registered
- The system tracks which attendees were brought in by which marketers, useful for commission calculations

## User Roles

1. **Admin**: System administration, access to all features
2. **Marketer**: Can register attendees, view their own performance
3. **User**: Regular user with limited access

## Getting Started

1. Start the application
2. Log in using the admin credentials above
3. Navigate to the admin dashboard to view marketer performance and system statistics

## Commission Tracking

While this system tracks the relationship between marketers and attendees, the actual calculation and payment of commissions is handled externally. The data from this system can be exported or accessed via API to feed into commission calculation systems.
