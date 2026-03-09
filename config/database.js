// config/database.js - MongoDB connection
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    mongoose.set('strictQuery', false);
    const conn = await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/it-team-platform',
      {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
      }
    );
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    mongoose.connection.on('disconnected', () => console.log('⚠️  MongoDB disconnected'));
    mongoose.connection.on('reconnected',  () => console.log('✅ MongoDB reconnected'));
  } catch (error) {
    console.error(`❌ MongoDB Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
