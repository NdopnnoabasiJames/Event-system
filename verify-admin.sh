#!/bin/bash

echo "Starting Event Management System..."
echo "This will test the admin user seeding functionality"

# Run the test script
node tests/admin-seed-test.js

echo "You can now log in with:"
echo "Email: admin@example.com"
echo "Password: Admin123!"
