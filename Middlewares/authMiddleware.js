const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const token = req.cookies.authToken || req.headers.authorization;

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Failed to authenticate token' });
    }

    req.user = decoded;
    next();
  });
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

module.exports = { authenticateToken, verifyCookieToken };
