import mongoose from 'mongoose';

import { serviceLogger } from '../logger';

export async function connectToMongoDB(mongoUri: string): Promise<mongoose.Connection> {
  serviceLogger.info(`Connecting to MongoDB @ ${mongoUri}`);

  // Add connection options here
  const options = {
    bufferCommands: false, // <-- ADD THIS LINE
    serverSelectionTimeoutMS: 30000, // Keep the longer timeout
  };

  // Pass options to mongoose.connect
  await mongoose.connect(mongoUri, options);
  serviceLogger.info('Connected to MongoDB');

  // Add listeners for debugging connection state
  mongoose.connection.on('error', (err) => {
    serviceLogger.error('[Mongoose] Connection Error:', err);
  });
  mongoose.connection.on('disconnected', () => {
    serviceLogger.warn('[Mongoose] Connection Disconnected.');
  });
  mongoose.connection.on('reconnected', () => {
    serviceLogger.info('[Mongoose] Connection Reconnected.');
  });

  return mongoose.connection;
}
