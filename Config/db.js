const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://chiccheck:J4sa6Z37@35.187.246.165:27017/chiccheck', {
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
