## **EVANGELION PRD 2 - Updated Implementation Phases**

Based on your clarifications (CONCIERGE → REGISTRAR, MARKETER → WORKER, ATTENDEE → GUEST), here are the updated phases:

### **Phase 1: Schema Updates & Role Renaming**

#### 1.1 Role Enum Updates

* Update [role.enum.ts](vscode-file://vscode-app/c:/Users/hp/AppData/Local/Programs/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-sandbox/workbench/workbench.html):
  * [MARKETER](vscode-file://vscode-app/c:/Users/hp/AppData/Local/Programs/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-sandbox/workbench/workbench.html) → `WORKER`
  * [ATTENDEE](vscode-file://vscode-app/c:/Users/hp/AppData/Local/Programs/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-sandbox/workbench/workbench.html) → `GUEST`
  * [CONCIERGE](vscode-file://vscode-app/c:/Users/hp/AppData/Local/Programs/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-sandbox/workbench/workbench.html) → `REGISTRAR`

#### 1.2 Schema Renaming & Updates

* Rename [marketer.schema.ts](vscode-file://vscode-app/c:/Users/hp/AppData/Local/Programs/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-sandbox/workbench/workbench.html) → `worker.schema.ts`
* Rename [attendee.schema.ts](vscode-file://vscode-app/c:/Users/hp/AppData/Local/Programs/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-sandbox/workbench/workbench.html) → `guest.schema.ts`
* Update [user.schema.ts](vscode-file://vscode-app/c:/Users/hp/AppData/Local/Programs/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-sandbox/workbench/workbench.html) to reflect new roles
* Update existing user documents with new role names

#### 1.3 Module & Service Renaming

* Rename [marketers](vscode-file://vscode-app/c:/Users/hp/AppData/Local/Programs/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-sandbox/workbench/workbench.html) → `src/workers/`
* Rename [attendees](vscode-file://vscode-app/c:/Users/hp/AppData/Local/Programs/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-sandbox/workbench/workbench.html) → `src/guests/`
* Rename [concierges](vscode-file://vscode-app/c:/Users/hp/AppData/Local/Programs/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-sandbox/workbench/workbench.html) → `src/registrars/`
* Update all import statements and references throughout codebase

#### 1.4 Update App Module & References

* Update [app.module.ts](vscode-file://vscode-app/c:/Users/hp/AppData/Local/Programs/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-sandbox/workbench/workbench.html) imports
* Update all controller and service references
* Update permission enums and validation

### **Phase 2: Worker Module Implementation**

#### 2.1 Worker Registration System

* Worker registration with State/Branch selection
* Branch Admin approval workflow
* Worker profile management

#### 2.2 Event Volunteering System

* View finalized events in worker's branch
* Volunteer for events (automatic approval after branch admin approval)
* Track worker-event relationships

#### 2.3 Quick Guest Registration Interface

* 30-second guest registration form
* Guest data validation
* Pickup station selection from zone's available stations
* Worker-Guest relationship tracking

#### 2.4 Worker's Guest Management

* View list of registered guests
* Edit guest details (before event day)
* Delete guest registrations
* Performance tracking integration

### **Phase 3: Guest Management System**

#### 3.1 Guest Schema & Relationships

* Guest data structure (Name, Phone, Email, Pickup Station)
* Worker-Guest relationship tracking
* Event-Guest assignment with pickup station

#### 3.2 Guest Data Management

* Guest CRUD operations with worker restrictions
* Pickup station assignment validation
* Guest search and filtering capabilities
* Edit restrictions (only before event day)

### **Phase 4: Registrar Module Implementation**

#### 4.1 Registrar Registration & Assignment

* Registrar registration with Branch Admin approval
* Zone assignment by Branch/Zonal Admins
* Multiple zone assignments support
* Registrar profile management

#### 4.2 Check-in System

* Mobile-optimized check-in interface
* Guest search by name/phone number
* Check-in with timestamp tracking
* Handle both bus pickup and walk-in guests
* Real-time status updates

#### 4.3 Event Day Management

* Live database updates during check-in
* Check-in status synchronization
* Zone-specific guest lists
* Offline capabilities for mobile devices

### **Phase 5: Notification System**

#### 5.1 SMS/Email Service Integration

* SMS service provider integration (Twilio/similar)
* Email service provider integration
* Notification templates and personalization
* Delivery tracking and status

#### 5.2 Pre-Event Notifications

* Automated 3-day reminder system
* Event details with pickup information
* Pickup station location and departure time
* Notification scheduling and queue management

#### 5.3 Post-Event Notifications

* Thank you messages for checked-in guests
* Follow-up messages for no-shows
* Feedback collection integration
* Event recap and next steps

### **Phase 6: Analytics & Dashboard System**

#### 6.1 Worker Analytics

* Guest registration statistics per worker
* Worker performance ranking system
* Registration efficiency metrics
* Guest attendance correlation tracking

#### 6.2 Registrar Analytics

* Check-in efficiency statistics
* Zone coverage analytics
* Event day performance metrics
* Real-time check-in monitoring

#### 6.3 Event Analytics

* Overall attendance rates
* Pickup station utilization analysis
* Guest attendance patterns
* No-show analysis and trends

#### 6.4 Admin Dashboards

* Real-time event statistics
* Worker/Registrar performance overview
* System-wide analytics and reporting
* Export capabilities for all analytics

### **Phase 7: Mobile Optimization & UI Enhancements**

#### 7.1 Mobile-First Interfaces

* Responsive guest registration form
* Touch-optimized registrar check-in interface
* Quick-access worker dashboard
* Offline-capable mobile interfaces

#### 7.2 Performance Optimization

* Fast load times for event day operations
* Offline check-in capabilities
* Data caching strategies
* Real-time synchronization

### **Phase 8: Integration & Testing**

#### 8.1 System Integration

* Ensure all modules work seamlessly together
* Validate data relationships and workflows
* Test complete event lifecycle
* Cross-module functionality verification

#### 8.2 Performance & Load Testing

* Test with realistic data volumes
* Mobile performance validation
* Notification delivery testing
* Event day load simulation

---

## 🎯 **Key Changes from Original Plan**

1. **Role Mapping Clarified** :

* MARKETER → WORKER ✅
* ATTENDEE → GUEST ✅
* CONCIERGE → REGISTRAR ✅ (not new role)

1. **Fresh Start Approach** :

* No data migration needed
* Clean database setup
* Updated schemas from scratch

1. **Service Provider Focus** :

* Specific SMS/Email service provider integration
* Real provider implementation vs generic interfaces
