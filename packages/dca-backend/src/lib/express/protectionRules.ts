import { Response } from 'express';

import { getAppInfo, getPKPInfo, isAppUser } from '@lit-protocol/vincent-app-sdk/jwt';

import { ScheduleIdentitySchema, ScheduleParamsSchema } from './schema';
import { VincentAuthenticatedRequest } from './types';
import { executeAaveRepay } from '../agenda/jobs/executeDCASwap/utils/aaveUtils';
import { jobManager } from '../agenda/jobs/jobManagerInstance';

function getDataFromJWT(req: VincentAuthenticatedRequest) {
  if (!isAppUser(req.user.decodedJWT)) {
    throw new Error('Vincent JWT is not an app user');
  }

  const app = getAppInfo(req.user.decodedJWT);
  const pkpInfo = getPKPInfo(req.user.decodedJWT);

  return { app, pkpInfo };
}

export const handleListProtectionRulesRoute = async (
  req: VincentAuthenticatedRequest,
  res: Response
) => {
  const {
    pkpInfo: { ethAddress },
  } = getDataFromJWT(req);

  const jobs = await jobManager.listJobsByEthAddress(ethAddress);

  // Fetch the actual protection rules to get all the data
  const enrichedJobs = await Promise.all(
    jobs.map(async (job) => {
      const { ProtectionRule } = await import('../mongo/protectionRule.schema');
      const rule = await ProtectionRule.findById(job.attrs.data.ruleId);

      return {
        _id: job.attrs._id,
        data: {
          chainId: rule?.chainId,
          collateralAsset: rule?.collateralAsset,
          debtAsset: rule?.debtAsset,
          name: 'Health Guard',
          protocol: rule?.protocol,
          repayAmount: rule?.repayAmount ? parseFloat(rule.repayAmount) : 0,
          triggerPrice: rule?.triggerPrice,
          updatedAt: job.attrs.data.updatedAt || new Date().toISOString(),
        },
        disabled: job.attrs.disabled || false,
        failedAt: job.attrs.failedAt,
        failReason: job.attrs.failReason,
        lastFinishedAt: job.attrs.lastFinishedAt,
        lastRunAt: job.attrs.lastRunAt,
        nextRunAt: job.attrs.nextRunAt,
      };
    })
  );

  res.json({
    data: enrichedJobs,
    success: true,
  });
};

export const handleCreateProtectionRuleRoute = async (
  req: VincentAuthenticatedRequest,
  res: Response
) => {
  const { app, pkpInfo } = getDataFromJWT(req);

  const scheduleParams = ScheduleParamsSchema.parse({
    ...req.body,
    pkpInfo,
    app: {
      id: app.appId,
      version: app.version,
    },
  });

  const ruleData = {
    chainId: scheduleParams.chainId,
    collateralAsset: scheduleParams.collateralAsset,
    debtAsset: scheduleParams.debtAsset,
    protocol: scheduleParams.protocol,
    repayAmount: scheduleParams.repayAmount,
    triggerPrice: scheduleParams.triggerPrice,
    user: pkpInfo.ethAddress,
  };

  const { job, rule } = await jobManager.createRule(ruleData);

  res.status(201).json({
    data: {
      _id: job.attrs._id,
      data: {
        pkpInfo,
        chainId: rule.chainId,
        collateralAsset: rule.collateralAsset,
        debtAsset: rule.debtAsset,
        name: 'Health Guard',
        protocol: rule.protocol,
        repayAmount: parseFloat(rule.repayAmount),
        triggerPrice: rule.triggerPrice,
        updatedAt: new Date().toISOString(),
        vincentAppVersion: app.version,
      },
      disabled: job.attrs.disabled || false,
      failedAt: job.attrs.failedAt,
      failReason: job.attrs.failReason,
      lastFinishedAt: job.attrs.lastFinishedAt,
      lastRunAt: job.attrs.lastRunAt,
      nextRunAt: job.attrs.nextRunAt,
    },
    success: true,
  });
};

export const handleEditProtectionRuleRoute = async (
  req: VincentAuthenticatedRequest,
  res: Response
) => {
  const { app, pkpInfo } = getDataFromJWT(req);
  const { scheduleId } = ScheduleIdentitySchema.parse(req.params);

  const scheduleParams = ScheduleParamsSchema.parse({
    ...req.body,
    pkpInfo,
    app: {
      id: app.appId,
      version: app.version,
    },
  });

  const ruleData = {
    chainId: scheduleParams.chainId,
    collateralAsset: scheduleParams.collateralAsset,
    debtAsset: scheduleParams.debtAsset,
    protocol: scheduleParams.protocol,
    repayAmount: scheduleParams.repayAmount,
    triggerPrice: scheduleParams.triggerPrice,
  };

  const rule = await jobManager.editRule(scheduleId, ruleData);
  const job = await jobManager.findJob({
    scheduleId,
    ethAddress: pkpInfo.ethAddress,
    mustExist: true,
  });

  res.status(200).json({
    data: {
      _id: job?.attrs._id,
      data: {
        pkpInfo,
        chainId: rule.chainId,
        collateralAsset: rule.collateralAsset,
        debtAsset: rule.debtAsset,
        name: 'Health Guard',
        protocol: rule.protocol,
        repayAmount: parseFloat(rule.repayAmount),
        triggerPrice: rule.triggerPrice,
        updatedAt: new Date().toISOString(),
        vincentAppVersion: app.version,
      },
      disabled: job?.attrs.disabled || false,
      failedAt: job?.attrs.failedAt,
      failReason: job?.attrs.failReason,
      lastFinishedAt: job?.attrs.lastFinishedAt,
      lastRunAt: job?.attrs.lastRunAt,
      nextRunAt: job?.attrs.nextRunAt,
    },
    success: true,
  });
};

export const handleDisableProtectionRuleRoute = async (
  req: VincentAuthenticatedRequest,
  res: Response
) => {
  const {
    pkpInfo: { ethAddress },
  } = getDataFromJWT(req);

  const { scheduleId } = ScheduleIdentitySchema.parse(req.params);

  const job = await jobManager.disableJob({ ethAddress, scheduleId });
  if (!job) {
    res.status(404).json({ error: 'Protection rule not found' });
    return;
  }

  const { ProtectionRule } = await import('../mongo/protectionRule.schema');
  const rule = await ProtectionRule.findById(job.attrs.data.ruleId);

  res.json({
    data: {
      _id: job.attrs._id,
      data: {
        chainId: rule?.chainId,
        collateralAsset: rule?.collateralAsset,
        debtAsset: rule?.debtAsset,
        name: 'Health Guard',
        protocol: rule?.protocol,
        repayAmount: rule?.repayAmount ? parseFloat(rule.repayAmount) : 0,
        triggerPrice: rule?.triggerPrice,
        updatedAt: new Date().toISOString(),
      },
      disabled: job.attrs.disabled || false,
      failedAt: job.attrs.failedAt,
      failReason: job.attrs.failReason,
      lastFinishedAt: job.attrs.lastFinishedAt,
      lastRunAt: job.attrs.lastRunAt,
      nextRunAt: job.attrs.nextRunAt,
    },
    success: true,
  });
};

export const handleEnableProtectionRuleRoute = async (
  req: VincentAuthenticatedRequest,
  res: Response
) => {
  const {
    pkpInfo: { ethAddress },
  } = getDataFromJWT(req);
  const { scheduleId } = ScheduleIdentitySchema.parse(req.params);

  const job = await jobManager.enableJob({ ethAddress, scheduleId });

  const { ProtectionRule } = await import('../mongo/protectionRule.schema');
  const rule = await ProtectionRule.findById(job.attrs.data.ruleId);

  res.json({
    data: {
      _id: job.attrs._id,
      data: {
        chainId: rule?.chainId,
        collateralAsset: rule?.collateralAsset,
        debtAsset: rule?.debtAsset,
        name: 'Health Guard',
        protocol: rule?.protocol,
        repayAmount: rule?.repayAmount ? parseFloat(rule.repayAmount) : 0,
        triggerPrice: rule?.triggerPrice,
        updatedAt: new Date().toISOString(),
      },
      disabled: job.attrs.disabled || false,
      failedAt: job.attrs.failedAt,
      failReason: job.attrs.failReason,
      lastFinishedAt: job.attrs.lastFinishedAt,
      lastRunAt: job.attrs.lastRunAt,
      nextRunAt: job.attrs.nextRunAt,
    },
    success: true,
  });
};

export const handleDeleteProtectionRuleRoute = async (
  req: VincentAuthenticatedRequest,
  res: Response
) => {
  const {
    pkpInfo: { ethAddress },
  } = getDataFromJWT(req);
  const { scheduleId } = ScheduleIdentitySchema.parse(req.params);

  await jobManager.cancelJob({ ethAddress, scheduleId });

  res.json({ success: true });
};

export const handleTestRepayRoute = async (req: VincentAuthenticatedRequest, res: Response) => {
  const { repayAmount, userAddress } = req.body;
  const { pkpInfo } = getDataFromJWT(req);

  if (!repayAmount || !userAddress) {
    throw new Error('repayAmount and userAddress are required');
  }

  try {
    const txHash = await executeAaveRepay({
      repayAmount,
      onBehalfOf: userAddress, // MetaMask wallet whose debt to repay
      pkpEthAddress: pkpInfo.ethAddress as `0x${string}`, // PKP wallet that pays
      pkpPublicKey: pkpInfo.publicKey,
    });
    res.json({ data: { txHash }, success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Repay failed: ${errorMessage}`);
  }
};
