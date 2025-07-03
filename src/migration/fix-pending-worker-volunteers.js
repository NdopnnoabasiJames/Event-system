/**
 * Migration script to auto-approve pending worker volunteer requests 
 * that should have been auto-approved based on new logic
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

// Database configuration
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/evangelion';

async function fixPendingWorkerVolunteers() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const eventsCollection = db.collection('events');
    const usersCollection = db.collection('users');
    
    // Find all events with pending worker volunteer requests
    const eventsWithPendingRequests = await eventsCollection.find({
      'volunteerRequests.status': 'pending'
    }).toArray();
    
    console.log(`Found ${eventsWithPendingRequests.length} events with pending worker requests`);
    
    let totalApproved = 0;
    
    for (const event of eventsWithPendingRequests) {
      console.log(`\n🔍 Processing event: ${event.name} (${event._id})`);
      console.log(`   Scope: ${event.scope}, Creator Level: ${event.creatorLevel}`);
      
      const pendingRequests = event.volunteerRequests.filter(req => req.status === 'pending');
      console.log(`   Found ${pendingRequests.length} pending requests`);
      
      for (const request of pendingRequests) {
        const worker = await usersCollection.findOne({ _id: request.workerId });
        
        if (!worker) {
          console.log(`   ❌ Worker not found: ${request.workerId}`);
          continue;
        }
        
        console.log(`   👤 Checking worker: ${worker.name} (${worker.email})`);
        console.log(`      Worker branch: ${worker.branch}`);
        
        // Apply the same auto-approval logic
        let shouldAutoApprove = false;
        let reason = '';
        
        // Check if it's a national event created by super admin
        if (event.scope === 'national' && event.creatorLevel === 'super_admin') {
          shouldAutoApprove = true;
          reason = 'National event created by super admin';
        }
        
        // Check if worker's branch is in availableBranches
        else if (event.availableBranches && 
                 event.availableBranches.some(branchId => branchId.toString() === worker.branch.toString())) {
          shouldAutoApprove = true;
          reason = 'Worker branch in availableBranches';
        }
        
        // Check if worker's branch is in selectedBranches
        else if (event.selectedBranches && 
                 event.selectedBranches.some(branchId => branchId.toString() === worker.branch.toString())) {
          shouldAutoApprove = true;
          reason = 'Worker branch in selectedBranches';
        }
        
        if (shouldAutoApprove) {
          console.log(`   ✅ Auto-approving: ${reason}`);
          
          // Update the request status to approved
          await eventsCollection.updateOne(
            { 
              _id: event._id,
              'volunteerRequests.workerId': request.workerId 
            },
            {
              $set: {
                'volunteerRequests.$.status': 'approved',
                'volunteerRequests.$.approvedBy': null, // System approval
                'volunteerRequests.$.approvedAt': new Date(),
                'volunteerRequests.$.notes': `Auto-approved (migration): ${reason}`
              }
            }
          );
          
          // Add worker to the workers array if not already there
          const isWorkerAlreadyAdded = event.workers.some(
            workerId => workerId.toString() === worker._id.toString()
          );
          
          if (!isWorkerAlreadyAdded) {
            await eventsCollection.updateOne(
              { _id: event._id },
              { $addToSet: { workers: worker._id } }
            );
            console.log(`   📝 Added worker to event workers array`);
          }
          
          // Update user's eventParticipation array if not already there
          const userEventParticipation = worker.eventParticipation || [];
          const isEventAlreadyInParticipation = userEventParticipation.some(
            eventId => eventId.toString() === event._id.toString()
          );
          
          if (!isEventAlreadyInParticipation) {
            await usersCollection.updateOne(
              { _id: worker._id },
              { $addToSet: { eventParticipation: event._id } }
            );
            console.log(`   📝 Added event to worker's participation array`);
          }
          
          totalApproved++;
        } else {
          console.log(`   ⏳ Keeping as pending: Does not meet auto-approval criteria`);
        }
      }
    }
    
    console.log(`\n🎉 Migration completed!`);
    console.log(`📊 Total requests auto-approved: ${totalApproved}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

// Run the migration
if (require.main === module) {
  fixPendingWorkerVolunteers()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { fixPendingWorkerVolunteers };
