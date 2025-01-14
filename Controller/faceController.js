const axios = require("axios");
require('dotenv').config();

async function verifyFace(student_code, photo) {
  try {
    // Step 1: Get the access token
    const accessTokenResponse = await axios.post(`${process.env.KU_API}/kuedu/api/token/pair`, {
      username: process.env.KU_USERNAME,
      password: process.env.KU_PASSWORD
    });

    const accessToken = accessTokenResponse.data.access;

    // Step 2: Use the access token to pair token
    const response = await axios.post(
      `${process.env.KU_API}/kuedu/api/face/verify`,
      { student_code, photo },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    return response.data; // Return the verification result
  } catch (error) {
    console.error("Error in verifyFace:", error.message);
    throw error.response?.data || new Error("An error occurred during face verification");
  }
}


exports.faceVerify = async (req, res) => {
    try {
      const { student_code, photo } = req.body;
  
      if (!student_code || !photo) {
        return res.status(400).json({ message: "student_code and photo are required" });
      }
  
      const verificationResult = await verifyFace(student_code, photo);
      res.status(200).json(verificationResult);
    } catch (error) {
      console.error("Error in faceVerify:", error.message);
      const status = error.response?.status || 500;
      const errorMessage = error.response?.data || { message: "An error occurred" };
      res.status(status).json(errorMessage);
    }
  };
  
