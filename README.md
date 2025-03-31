# 🛠️ ChicCheck Backend  

🚀 **Smart Self Attendance Check With Liveness Detection** – Secure and efficient attendance tracking using **Express.js** and **MongoDB**.

## 🚀 Getting Started  

### 1️⃣ Clone the repository  
To get started, clone the **chiccheck-backend** repository to your local machine:  
```bash
git clone https://github.com/KUChickCheck/chiccheck-backend.git 
cd chiccheck-backend
```

### 2️⃣ Install dependencies
Once inside the project directory, install all required dependencies using npm:
```bash
npm install
```

### 3️⃣ Set up environment variables
Create a .env file in the root of the project directory, and add the necessary environment variables:
```env
PORT=your_desired_port         # Port to listen on (e.g., 5000)
JWT_SECRET=your_jwt_secret     # Secret key for JWT authentication
MONGO_URI=your_mongo_uri       # MongoDB connection string
KU_API=your_ku_api_url         # API endpoint for KU system
KU_USERNAME=your_ku_username   # KU system username
KU_PASSWORD=your_ku_password   # KU system password
```
### 4️⃣ Run the server
```bash
node app.js
```

### 🤝 Contributing
Feel free to fork the repo, make your changes, and submit a pull request. All contributions are welcome!