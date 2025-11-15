require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const authRoutes = require('./auth');
const storage = require('./storage');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);

// Content moderation endpoint
app.post('/api/check', async (req, res) => {
  try {
    const { imageBase64, userId } = req.body;
    const numericUserId = parseInt(userId, 10);  // 👈 ADD THIS
    

    // Validate input
    if (!userId || !imageBase64) {
      return res.status(400).json({
        status: 'ERROR',
        message: 'Missing required fields'
      });
    }

    // Check if user is banned
    if (storage.isUserBanned(numericUserId)) {
      return res.status(403).json({ 
        status: 'BANNED',
        message: 'Account disabled: 5/5 violations'
      });
    }

    // Call Google Vision API
    const response = await axios.post(
      `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_API_KEY}`,
      {
        requests: [{
          image: { content: imageBase64 },
          features: [{ type: 'SAFE_SEARCH_DETECTION' }]
        }]
      },
      { timeout: 10000 }
    );

    const { adult, racy } = response.data.responses[0].safeSearchAnnotation;
    const isExplicit = adult === 'VERY_LIKELY' || racy === 'VERY_LIKELY';
    const isQuestionable = adult === 'LIKELY' || racy === 'LIKELY';

    if (isExplicit) {
      const violations = storage.addViolation(numericUserId);
      
      if (violations >= 5) {
        return res.json({ 
          status: 'BANNED',
          message: `Account disabled (5/5 violations)`,
          violations
        });
      }
      return res.json({ 
        status: 'REJECTED',
        message: `Post blocked (${violations}/5 violations)`,
        violations
      });
    } 
    else if (isQuestionable) {
      return res.json({ 
        status: 'FLAGGED',
        message: 'Post flagged for review'
      });
    } 
    else {
      storage.savePost({ 
        userId: numericUserId, 
        imageBase64, 
        timestamp: new Date().toISOString() 
      });
      return res.json({ 
        status: 'APPROVED',
        message: 'Post successful!'
      });
    }

  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ 
      status: 'ERROR',
      message: error.response?.data?.error?.message || 'Content verification failed'
    });
  }
});

// Get posts endpoint
app.get('/api/posts', (req, res) => {
  try {
    res.json(storage.getPosts());
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Failed to fetch posts'
    });
  }
});

app.get('/api/user/status', (req, res) => {
  const { userId } = req.query;
  const numericUserId = parseInt(userId, 10);
  
  if (!numericUserId) {
    return res.status(400).json({ error: 'User ID required' });
  }
  
  const isBanned = storage.isUserBanned(numericUserId);
  res.json({ banned: isBanned });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});