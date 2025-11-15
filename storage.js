const users = [];
const posts = [];
const violationCounts = new Map();

let nextUserId = 1;

module.exports = {
  createUser(username, password) {
    if (users.some(u => u.username === username)) {
      throw new Error('Username already exists');
    }
    
    const user = {
      id: nextUserId++,
      username,
      password,
      banned: false
    };
    
    users.push(user);
    violationCounts.set(user.id, 0);
    return user;
  },

  authenticateUser(username, password) {
    return users.find(u => 
      u.username === username && 
      u.password === password
    );
  },

  addViolation(userId) {
    const count = (violationCounts.get(userId) || 0) + 1;
    violationCounts.set(userId, count);

    if (count >= 5) {
      this.banUser(userId);
    }
    return count;
  },

  banUser(userId) {
    const user = users.find(u => u.id === userId);
    if (user) user.banned = true;
  },

  isUserBanned(userId) {
    const user = users.find(u => u.id === userId);
    return user ? user.banned : false;
  },

  savePost(post) {
    posts.unshift(post);
  },

  getPosts() {
    return [...posts];
  },

  getViolationCount(userId) {
    return violationCounts.get(userId) || 0;
  }
};