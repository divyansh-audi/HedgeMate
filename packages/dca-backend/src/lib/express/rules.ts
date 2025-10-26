import { Router, Request, Response } from 'express';

// --- Use standard top-level import ---
import { jobManager } from '../agenda/jobs/jobManagerInstance';
// --- End Change ---
import { serviceLogger } from '../logger';
import { IProtectionRule } from '../mongo/protectionRule.schema';

export const router = Router();

router.post('/', async (req: Request, res: Response) => {
  // --- REMOVED DYNAMIC IMPORT BLOCK ---

  try {
    const ruleData: Partial<IProtectionRule> = req.body;
    serviceLogger.info('[API] Received request to create new rule:', ruleData);

    // --- Add a check here to be sure jobManager is loaded ---
    if (!jobManager) {
      serviceLogger.error('[API] FATAL: jobManager instance is not available!');
      res.status(500).json({ message: 'Internal server error (Job Manager failed to load).' });
      return;
    }
    // --- End Check ---

    if (!ruleData.user || !ruleData.triggerPrice || !ruleData.repayAmount) {
      res
        .status(400)
        .json({ message: 'Missing required fields: userAddress, triggerPrice, repayAmount.' });
      return;
    }

    // Add defaults
    ruleData.protocol = ruleData.protocol || 'AaveV3';
    ruleData.chainId = ruleData.chainId || 11155111;
    ruleData.collateralAsset = ruleData.collateralAsset || 'ETH';
    ruleData.debtAsset = ruleData.debtAsset || 'PYUSD';

    // Now call createRule directly
    const newRule = await jobManager.createRule(ruleData);

    res.status(201).json({
      message: 'Protection rule created and scheduled successfully.',
      rule: newRule,
    });
  } catch (error) {
    serviceLogger.error('[API] Error creating protection rule:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// Keep named export
// export { rulesRouter }; // Already exported via const declaration
