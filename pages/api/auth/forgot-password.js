// Vercel serverless function for password reset
import { MongoClient } from 'mongodb';
import crypto from 'crypto';

const client = new MongoClient(process.env.MONGODB_URI);

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    await client.connect();
    const db = client.db();
    
    // Check if user exists
    const user = await db.collection('users').findOne({ email });
    
    if (!user) {
      // Don't reveal whether user exists or not for security
      return res.status(200).json({ 
        success: true, 
        message: 'If an account exists, reset instructions have been sent' 
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Store reset token
    await db.collection('users').updateOne(
      { email },
      {
        $set: {
          resetToken,
          resetTokenExpiry
        }
      }
    );

    // In a real app, you would send an email here
    // For demo purposes, we'll just log the reset link
    console.log(`Password reset for ${email}:`);
    console.log(`Reset token: ${resetToken}`);
    console.log(`Reset link: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`);

    res.status(200).json({
      success: true,
      message: 'Reset instructions sent to your email',
      // For demo purposes only - remove in production
      ...(process.env.NODE_ENV === 'development' && {
        resetToken,
        resetLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`
      })
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    await client.close();
  }
}