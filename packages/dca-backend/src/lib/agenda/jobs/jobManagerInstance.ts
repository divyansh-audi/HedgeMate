import { Agenda } from '@whisthub/agenda';
import mongoose from 'mongoose';

import { LoanProtectionJobManager } from './loanProtectionJobManager';
import { serviceLogger } from '../../logger';
import { connectToMongoDB } from '../../mongo/mongoose';

const mongoConnectionString = process.env.MONGO_URI;
if (!mongoConnectionString) {
  serviceLogger.error('[JobManagerInstance] MONGO_URI is not set. Cannot start.');
  throw new Error('MONGO_URI is not set.');
}

const agenda = new Agenda({
  db: { address: mongoConnectionString!, collection: 'agendaJobs' },
  processEvery: '10 seconds',
});
serviceLogger.info('[JobManagerInstance] Agenda instance created.');

export const jobManager = new LoanProtectionJobManager(agenda);
serviceLogger.info('[JobManagerInstance] LoanProtectionJobManager instance created and exported.');

export async function startAgenda() {
  try {
    if (mongoose.connection.readyState === 0 || mongoose.connection.readyState === 3) {
      serviceLogger.info('[JobManagerInstance] Mongoose not connected, attempting connection...');
      await connectToMongoDB(mongoConnectionString!);
    } else if (mongoose.connection.readyState === 2) {
      serviceLogger.info('[JobManagerInstance] Mongoose is connecting, waiting...');
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Mongoose connection timed out')), 20000);
        mongoose.connection.once('connected', () => {
          clearTimeout(timeout);
          resolve();
        });
        mongoose.connection.once('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });
    }
    serviceLogger.info('[JobManagerInstance] Mongoose connection confirmed.');

    await agenda.start();
    serviceLogger.info('[JobManagerInstance] Agenda scheduler started successfully.');
  } catch (error) {
    serviceLogger.error(
      '[JobManagerInstance] CRITICAL: Failed to initialize Agenda/Manager:',
      error
    );
    process.exit(1);
  }
}
