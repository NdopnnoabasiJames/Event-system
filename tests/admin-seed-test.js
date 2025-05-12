// Test admin seeding
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Replace with your actual MongoDB connection string
const DB_CONNECTION = 'mongodb://localhost:27017/event_system';

async function testAdminUser() {
  try {
    // Connect to the database
    await mongoose.connect(DB_CONNECTION);
    console.log('Connected to MongoDB');
    
    // Check if admin user exists
    const userCollection = mongoose.connection.collection('users');
    const admin = await userCollection.findOne({ email: 'admin@example.com' });
    
    if (admin) {
      console.log('Admin user exists:', {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      });
      
      // You can use this to verify the password if needed:
      // const isMatch = await bcrypt.compare('Admin123!', admin.password);
      // console.log('Password matches:', isMatch);
    } else {
      console.log('Admin user does not exist');
    }
  } catch (error) {
    console.error('Error testing admin user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

testAdminUser();
