const mongoose = require("mongoose");

let connectionPromise = null;

const connectDatabase = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing. Add it to the root .env file.");
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGO_URI, {
      dbName: process.env.MONGO_DB_NAME || "code-runner",
    });
  }

  await connectionPromise;
  return mongoose.connection;
};

module.exports = { connectDatabase };
