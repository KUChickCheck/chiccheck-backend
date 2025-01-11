const jwt = require('jsonwebtoken');

const authenticateToken = (tokenType) => {
  return (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ msg: 'Access Denied: No token provided' });

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'chickcheck');

      if (tokenType === 'teacher' && !decoded.teacherId) {
        return res.status(403).json({ msg: 'Access Denied: Teacher token required' });
      }
      if (tokenType === 'student' && !decoded.studentId) {
        return res.status(403).json({ msg: 'Access Denied: Student token required' });
      }

      req.user = decoded;
      next();
    } catch (err) {
      res.status(403).json({ msg: 'Invalid token' });
    }
  };
};

module.exports = { authenticateToken };