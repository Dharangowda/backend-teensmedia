const express = require('express');
const router = express.Router();
const storage = require('./storage');

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = storage.authenticateUser(username, password);
  
  if (user) {
    if (user.banned) {
      return res.status(403).json({ 
        success: false,
        message: 'Your account has been disabled for violating content guidelines'
      });
    }
    return res.json({ 
      success: true,
      userId: user.id,
      username: user.username
    });
  }
  
  res.status(401).json({ 
    success: false,
    message: 'Invalid credentials'
  });
});

router.post('/register', (req, res) => {
  const { username, password } = req.body;
  try {
    const user = storage.createUser(username, password);
    res.json({ 
      success: true,
      userId: user.id,
      username: user.username
    });
  } catch (error) {
    res.status(400).json({ 
      success: false,
      message: error.message
    });
  }
});

module.exports = router;