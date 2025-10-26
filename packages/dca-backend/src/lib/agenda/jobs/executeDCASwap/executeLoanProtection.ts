import { Job } from '@whisthub/agenda';

import { checkHealthFactor, executeAaveRepay } from './utils/aaveUtils';
import { executeOnChainPriceUpdate } from './utils/pythUtils';
import { serviceLogger } from '../../../logger';
import { ProtectionRule } from '../../../mongo/protectionRule.schema';

export const executeLoanProtection = async (job: Job): Promise<void> => {
  const { ruleId } = job.attrs.data as { ruleId: string };
  serviceLogger.info(`[Job] Starting check for rule: ${ruleId}`);
  let rule;
  try {
    serviceLogger.info(`[Job] ${ruleId}: Fetching rule from DB...`);
    rule = await ProtectionRule.findById(ruleId);
    serviceLogger.info(`[Job] ${ruleId}: Fetched rule.`);
    if (!rule || !rule.isActive) {
      serviceLogger.info(`[Job] Rule ${ruleId} is inactive or deleted. Removing job.`);
      await job.remove();
      return;
    }
    serviceLogger.info(`[Job] ${ruleId}: Rule is active.`);
    serviceLogger.info(`[Job] ${ruleId}: Calling updateAndGetOnChainPrice...`);
    const currentPrice = await executeOnChainPriceUpdate();
    serviceLogger.info(`[Job] ${ruleId}: Got currentPrice: ${currentPrice}`);
    serviceLogger.info(`[Job] ${ruleId}: Calling checkHealthFactor for ${rule.user}...`);
    const healthFactor = await checkHealthFactor(rule.user);
    serviceLogger.info(`[Job] ${ruleId}: Got healthFactor: ${healthFactor}`);
    const triggerPrice = parseFloat(rule.triggerPrice);

    serviceLogger.info(
      `[Job] On-Chain Data for ${ruleId}: HF=${healthFactor.toFixed(4)}, Price=$${currentPrice.toFixed(2)}, Trigger=$${triggerPrice}`
    );

    if (healthFactor < 1.2 && Number(currentPrice) < triggerPrice) {
      serviceLogger.info(`JOB CONDITION MET for rule ${ruleId}. Initiating repayment.`);

      await executeAaveRepay(rule.user, rule.repayAmount);
      serviceLogger.info(`[Job] ${ruleId}: Repayment function returned.`);
      rule.isActive = false;
      await rule.save();
      await job.remove();
      serviceLogger.info(`[Job] Repayment successful. Rule ${ruleId} deactivated and job removed.`);
    } else {
      serviceLogger.info(`[Job] Conditions not met for rule ${ruleId}.`);
    }
  } catch (error) {
    serviceLogger.error(`[Job] Error executing job for rule ${ruleId}:`, error);
  }
};
