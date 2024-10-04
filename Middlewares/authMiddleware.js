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

async function verifyToken(token, secret) {
  try {
    const decoded = jwt.verify(token, secret);
    return decoded;
  } catch (err) {
    console.error("Token verification failed:", err.message);
    return null;
  }
}

const verifyCookieToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    console.log("Authorization Header:", authHeader);
    if (!authHeader) {
      return res.status(401).json({ message: "No token provided" });
    }
    // Extract the token part from the 'Bearer ' prefix
    const token = authHeader.split(' ')[1];
    console.log("Token:", token);
    const decodedToken = await verifyToken(token, process.env.JWT_SECRET);
    console.log("Decoded Token:", decodedToken);
    if (!decodedToken) {
      return res.status(401).json({ message: "Token verification failed" });
    }
    req.user = decodedToken; // Ensure req.user contains all necessary fields
    next();
  } catch (err) {
    console.log("Error in token decode:", err);
    return res.status(400).json({ message: "Error in token decode" });
  }
};

module.exports = { authenticateTokenAndRole, verifyCookieToken };
