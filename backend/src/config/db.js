const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

async function connectDB(uri) {
  let mongoUri = uri;

  if (!mongoUri) {
    const memoryServer = await MongoMemoryServer.create();
    mongoUri = memoryServer.getUri();
    console.log(`Using in-memory MongoDB at ${mongoUri}`);
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000 });
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
}

module.exports = connectDB;
