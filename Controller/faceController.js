const axios = require("axios");
require('dotenv').config();

// Student Registration
exports.faceVerify = async (req, res) => {
    try {
        const { student_code, photo } = req.body;
    
        if (!student_code || !photo) {
          return res.status(400).json({ message: "student_code and photo are required" });
        }
    
        // Step 1: Get the access token
        const accessTokenResponse = await axios.post(`${process.env.KU_API}/kuedu/api/face/verify`, {
          username: process.env.KU_USERNAME,
          password: process.env.KU_PASSWORD
        });
    
        const accessToken = accessTokenResponse.data.access;
        console.log(accessToken)
    
        // Step 2: Use the access token to pair token
        const response = await axios.post(
          `${process.env.KU_API}/kuedu/api/token/pair`,
          { student_code, photo },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          }
        );

        console.log(response)
    
        // Respond with the data from the pair token API
        res.status(200).json(response.data);
      } catch (error) {
        console.error("Error in verifyAndPairToken:", error.message);
        const status = error.response?.status || 500;
        const errorMessage = error.response?.data || { message: "An error occurred" };
        res.status(status).json(errorMessage);
      }
};
