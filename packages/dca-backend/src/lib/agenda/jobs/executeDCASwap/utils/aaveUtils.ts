import { ethers } from 'ethers';

import { AAVE_POOL_ABI, AAVE_POOL_ADDRESS_SEPOLIA, USDC_ADDRESS_SEPOLIA } from './constants';
import { serviceLogger } from '../../../../logger';

export const getProvider = (chainId: number) => {
  // Read the RPC URL (which is stored in the ALCHEMY_API_KEY variable)
  const rpcUrlFromEnv = process.env.ALCHEMY_API_KEY;
  if (!rpcUrlFromEnv) {
    throw new Error('RPC URL (expected in ALCHEMY_API_KEY var) not found in environment variables');
  }

  // --- FIX IS HERE ---
  // Use the standard JsonRpcProvider with the URL from the .env file
  serviceLogger.info(
    `Connecting provider via JsonRpcProvider: ${rpcUrlFromEnv} for chainId ${chainId}`
  );
  return new ethers.providers.JsonRpcProvider(rpcUrlFromEnv, chainId);
  // --- END FIX ---
};

export const getSigner = (chainId: number) => {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('PRIVATE_KEY not found in environment variables');
  }

  const provider = getProvider(chainId);
  return new ethers.Wallet(privateKey, provider);
};

export async function checkHealthFactor(userAddress: string): Promise<number> {
  serviceLogger.info(`[aaveUtils] Starting checkHealthFactor for ${userAddress}...`);
  const provider = getProvider(11155111);
  const aavePool = new ethers.Contract(AAVE_POOL_ADDRESS_SEPOLIA, AAVE_POOL_ABI, provider);
  serviceLogger.info(`[aaveUtils] Calling getUserAccountData...`);
  const userData = await aavePool.getUserAccountData(userAddress);
  serviceLogger.info(`[aaveUtils] Received user data.`);
  // The health factor is a large number with 18 decimals, so we format it
  const healthFactor = parseFloat(ethers.utils.formatEther(userData.healthFactor));
  serviceLogger.info(`[aaveUtils] Success! Health Factor: ${healthFactor.toFixed(4)}`);
  return healthFactor;
}

export async function executeAaveRepay(userAddress: string, repayAmount: string): Promise<string> {
  // Use the backend's wallet to send the transaction
  const signer = getSigner(11155111);
  const aavePool = new ethers.Contract(AAVE_POOL_ADDRESS_SEPOLIA, AAVE_POOL_ABI, signer);

  const amountInWei = ethers.utils.parseUnits(repayAmount, 6);

  const tx = await aavePool.repay(USDC_ADDRESS_SEPOLIA, amountInWei, 2, userAddress);
  await tx.wait();
  return tx.hash;
}
