import { Response } from 'express';

import { VincentAuthenticatedRequest } from './types';
import { checkHealthFactor } from '../agenda/jobs/executeDCASwap/utils/aaveUtils';

export const handleGetHealthFactorRoute = async (
  req: VincentAuthenticatedRequest,
  res: Response
) => {
  try {
    const { userAddress } = req.body;

    if (!userAddress) {
      return res.status(400).json({ error: 'userAddress is required', success: false });
    }

    const healthFactor = await checkHealthFactor(userAddress);

    // Return the numeric health factor directly as `data` so the frontend
    // `sendRequest<number>` receives a number (not an object).
    return res.json({ data: healthFactor, success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch health factor', success: false });
  }
};
