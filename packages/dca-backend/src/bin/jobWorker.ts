// import { startWorker } from '../lib/jobWorker';
import { startAgenda } from '../lib/agenda/jobs/jobManagerInstance';
import { serviceLogger } from '../lib/logger';

async function gogo() {
  try {
    await startAgenda();
    serviceLogger.info('✅ Job worker started and connected to Agenda.');
  } catch (error) {
    // serviceLogger.error('!!! Failed to initialize service', error);
    // throw error;
  }
}

gogo();
