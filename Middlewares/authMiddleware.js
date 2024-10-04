const jwt = require('jsonwebtoken');

const authenticateTokenAndRole = (allowedRoles) => {
  return (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ msg: 'Access Denied: No token provided' });

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'chickcheck');
      req.user = decoded;

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ msg: 'Access Denied: Insufficient permissions' });
      }

      next(); 
    } catch (err) {
      res.status(403).json({ msg: 'Invalid token' });
    }
  };
};

module.exports = { authenticateTokenAndRole};
