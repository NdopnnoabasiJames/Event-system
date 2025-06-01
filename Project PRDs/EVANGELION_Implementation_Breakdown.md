# EVANGELION PRD Implementation Breakdown

## Overview

Implementing the hierarchical admin system for the EVANGELION Event Invitation and Tracking System based on the PRD requirements.

## Current Status Assessment

✅ **Already Implemented:**

- Basic User schema with roles
- State, Branch, Zone schemas and services
- Event creation and hierarchical event services
- Pickup station management
- JWT authentication and role-based guards
- Basic admin hierarchy structure

## Implementation Phases

### Phase 1: Schema Updates & Data Structure

#### 1.1 Update User Schema

- ✅ Already has role field with ZONAL_ADMIN
- ✅ Already has state, branch, zone references
- Add performance rating field for marketers
- Add isActive/isDisabled field for admin management

#### 1.2 Update Event Schema

- ✅ Already has hierarchical structure
- Enhance availableZones field handling
- Add multi-selection support for branches/zones

#### 1.3 Update Pickup Station Schema

- ✅ Already has zoneId reference
- Add capacity field
- Add departureTime field for event-specific assignments

#### 1.4 Create Mock Data File

- Create comprehensive mock data file with realistic States → Branches → Zones hierarchy
- Include major Nigerian states and church branches structure

### Phase 2: Enhanced Services & Business Logic

#### 2.1 Admin Hierarchy Service Enhancements

- ✅ Basic hierarchy validation exists
- Add admin disable/enable functionality
- Add performance rating calculation for marketers
- Enhance jurisdiction-based access control

#### 2.2 Event Creation Service Enhancements

- ✅ Basic hierarchical event creation exists
- Improve multi-selection for branches (State Admin)
- Improve multi-selection for zones (Branch Admin)
- Add validation for selection limits and permissions

#### 2.3 Pickup Station Assignment Service

- ✅ Basic assignment functionality exists
- Add capacity and departure time management
- Add zone-specific pickup station creation
- Add reusable pickup station list management

### Phase 3: API Endpoints & Controllers

#### 3.1 Enhanced Admin Endpoints

- Multi-selection endpoints for events (branches/zones)
- Admin disable/enable endpoints
- Performance rating endpoints
- Excel export endpoints for all tables

#### 3.2 Enhanced Event Management Endpoints

- ✅ Basic hierarchical event endpoints exist
- Improve event cascade flow
- Add event participation selection endpoints
- Add event status tracking

#### 3.3 Enhanced Pickup Station Endpoints

- ✅ Basic pickup station management exists
- Zone-specific pickup station creation
- Capacity and departure time management
- Frequently used stations management

### Phase 4: Data Migration & Seeding

#### 4.1 Create Mock Data Migration

- Comprehensive States/Branches/Zones data
- Realistic hierarchy structure
- Sample admin users for testing

#### 4.2 Update Existing Data

- Add missing fields to existing records
- Ensure data consistency
- Create migration scripts for schema updates

### Phase 5: Enhanced DTOs & Validation

#### 5.1 Multi-Selection DTOs

- Branch multi-selection DTO for State Admins
- Zone multi-selection DTO for Branch Admins
- Validation rules for selection limits

#### 5.2 Performance Rating DTOs

- Marketer rating calculation DTO
- Performance metrics DTO
- Rating update DTO

#### 5.3 Admin Management DTOs

- Admin disable/enable DTO
- Admin replacement DTO
- Jurisdiction transfer DTO

### Phase 6: Excel Export Functionality

#### 6.1 Export Service Creation

- Generic Excel export service
- Template formatting for different data types
- Proper column headers and data formatting

#### 6.2 Export Endpoints

- States/Branches/Zones export
- Events export with hierarchy info
- Users/Admins export with performance data
- Pickup stations export

### Phase 7: Enhanced Authentication & Authorization

#### 7.1 Jurisdiction-Based Access Control

- ✅ Basic role guards exist
- Enhance guards to check jurisdiction boundaries
- Add dynamic permission checking

#### 7.2 Admin Status Checking

- Add middleware to check if admin is active/disabled
- Handle disabled admin scenarios gracefully

### Phase 8: Testing & Validation

#### 8.1 Unit Tests

- Test hierarchical access control
- Test multi-selection logic
- Test performance rating calculations

#### 8.2 Integration Tests

- Test complete event creation flow
- Test admin approval flow
- Test pickup station assignment flow

#### 8.3 Manual Testing

- Test all admin roles and permissions
- Test event cascade scenarios
- Test Excel export functionality

## Priority Order for Implementation

### **HIGH PRIORITY (Core Functionality)**

1. Phase 1: Schema Updates (Essential for data structure)
2. Phase 4: Mock Data Creation (Needed for testing)
3. Phase 2: Enhanced Services (Core business logic)
4. Phase 3: API Endpoints (User interaction)

### **MEDIUM PRIORITY (Enhanced Features)**

5. Phase 5: Enhanced DTOs (Better validation)
6. Phase 7: Enhanced Authorization (Security)

### **LOW PRIORITY (Nice to Have)**

7. Phase 6: Excel Export (Can be added later)
8. Phase 8: Comprehensive Testing (Ongoing)

## Dependencies & Considerations

- Most core infrastructure already exists
- Focus on enhancing existing services rather than rebuilding
- Maintain backward compatibility where possible
- Ensure mobile responsiveness in frontend (out of scope for backend)
