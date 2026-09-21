'use strict';

const mongoose = require('mongoose');
const config = require('../config');

mongoose.set('strictQuery', true);

let connecting = null;

async function connect() {
  if (mongoose.connection.readyState === 1) return;
  if (connecting) return connecting;
  connecting = mongoose
    .connect(config.MONGO_URI, {
      dbName: config.MONGO_DB,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    })
    .finally(() => {
      connecting = null;
    });
  return connecting;
}

async function disconnect() {
  if (mongoose.connection.readyState === 0) return;
  await mongoose.disconnect();
}

module.exports = { connect, disconnect, mongoose };
