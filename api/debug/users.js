// Debug endpoint to check users in database
import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI);

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await client.connect();
    const db = client.db();
    
    // Count users
    const userCount = await db.collection('users').countDocuments();
    
    // Get sample users (without passwords)
    const users = await db.collection('users')
      .find({}, { projection: { password: 0 } })
      .limit(5)
      .toArray();

    res.json({
      success: true,
      userCount,
      users,
      database: db.databaseName,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Debug users error:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message,
      mongoUri: process.env.MONGODB_URI ? 'Set' : 'Not set'
    });
  } finally {
    await client.close();
  }
}