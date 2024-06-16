const getSimpleString = (req, res) => {
  // Extract user data from req.user
  const { userId, username, password } = req.user;

  // Return user data in response
  res.json({ userId, username, password });
};

module.exports = { getSimpleString };
