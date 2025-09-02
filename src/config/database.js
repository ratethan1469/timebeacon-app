const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/timebeacon');

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Create indexes for better performance
    await createIndexes();
    
    return conn;
  } catch (error) {
    console.error('Database connection error:', error);
    console.log('Running in development mode without MongoDB');
    // Don't exit in development - allow server to run for API testing
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

const createIndexes = async () => {
  try {
    const db = mongoose.connection.db;
    
    // Company indexes
    await db.collection('companies').createIndex({ slug: 1 }, { unique: true });
    await db.collection('companies').createIndex({ email: 1 }, { unique: true });
    await db.collection('companies').createIndex({ domain: 1 });
    
    // User indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ companyId: 1, role: 1 });
    await db.collection('users').createIndex({ companyId: 1, isActive: 1 });
    
    // Time entry indexes for efficient queries
    await db.collection('timeentries').createIndex({ companyId: 1, userId: 1, date: -1 });
    await db.collection('timeentries').createIndex({ companyId: 1, projectId: 1, date: -1 });
    await db.collection('timeentries').createIndex({ companyId: 1, status: 1, aiGenerated: 1 });
    
    console.log('Database indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
    process.exit(1);
  }
});

module.exports = connectDB;