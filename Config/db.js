const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect('', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
//mongodb://root:example@localhost:27017/chickcheck?authSource=admin
