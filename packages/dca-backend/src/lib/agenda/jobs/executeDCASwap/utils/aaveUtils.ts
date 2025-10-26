import consola from 'consola';
import { ethers } from 'ethers';

import { env } from '../../../../env';
import { getErc20ApprovalToolClient } from '../vincentAbilities';
import { alchemyGasSponsor, alchemyGasSponsorApiKey, alchemyGasSponsorPolicyId } from './alchemy';
import { AAVE_POOL_ABI, AAVE_POOL_ADDRESS_SEPOLIA, USDC_ADDRESS_SEPOLIA } from './constants';
import { handleOperationExecution } from './handle-operation-execution';

const { ALCHEMY_API_KEY } = env;

const SEPOLIA_CHAIN_ID = 11155111;
const SEPOLIA_RPC_URL = `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
const sepoliaProvider = new ethers.providers.AlchemyProvider(SEPOLIA_CHAIN_ID, ALCHEMY_API_KEY);

export const getProvider = (chainId: number) => {
  const alchemyApiKey = process.env.ALCHEMY_API_KEY;
  if (!alchemyApiKey) {
    throw new Error('ALCHEMY_API_KEY not found in environment variables');
  }

  return new ethers.providers.AlchemyProvider(chainId, alchemyApiKey);
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
  const provider = getProvider(SEPOLIA_CHAIN_ID);
  const aavePool = new ethers.Contract(AAVE_POOL_ADDRESS_SEPOLIA, AAVE_POOL_ABI, provider);

  const userData = await aavePool.getUserAccountData(userAddress);

  // The health factor is a large number with 18 decimals, so we format it
  const healthFactor = parseFloat(ethers.utils.formatEther(userData.healthFactor));
  return healthFactor;
}

export async function executeAaveRepay({
  onBehalfOf,
  pkpEthAddress,
  pkpPublicKey,
  repayAmount,
}: {
  onBehalfOf: string;
  pkpEthAddress: `0x${string}`;
  pkpPublicKey: string;
  repayAmount: string;
}): Promise<string> {
  consola.log('Starting Aave repay...', {
    onBehalfOf,
    pkpEthAddress,
    repayAmount,
  });

  const amountInWei = ethers.utils.parseUnits(repayAmount, 6);

  // Step 1: Approve USDC to Aave Pool using ERC20 approval ability
  consola.debug('Approving USDC to Aave Pool...');
  const erc20ApprovalToolClient = getErc20ApprovalToolClient();
  const approvalParams = {
    alchemyGasSponsor,
    alchemyGasSponsorApiKey,
    alchemyGasSponsorPolicyId,
    chainId: SEPOLIA_CHAIN_ID,
    rpcUrl: SEPOLIA_RPC_URL,
    spenderAddress: AAVE_POOL_ADDRESS_SEPOLIA,
    tokenAddress: USDC_ADDRESS_SEPOLIA,
    tokenAmount: amountInWei.toString(),
  };
  const approvalContext = {
    delegatorPkpEthAddress: pkpEthAddress,
  };

  // Check if approval is needed
  const approvalPrecheckResult = await erc20ApprovalToolClient.precheck(
    approvalParams,
    approvalContext
  );
  if (!approvalPrecheckResult.success) {
    throw new Error(`ERC20 approval tool precheck failed: ${approvalPrecheckResult}`);
  }

  // Send approval tx if needed
  if (!approvalPrecheckResult.result.alreadyApproved) {
    consola.debug('Sending approval transaction...');
    const approvalExecutionResult = await erc20ApprovalToolClient.execute(
      approvalParams,
      approvalContext
    );
    consola.trace('ERC20 Approval Vincent Tool Response:', approvalExecutionResult);
    if (!approvalExecutionResult.success) {
      throw new Error(`ERC20 approval tool execution failed: ${approvalExecutionResult}`);
    }

    const approvalHash = approvalExecutionResult.result.approvalTxHash as `0x${string}`;
    consola.debug('Approval hash:', approvalHash);

    // Wait for approval to be mined
    await handleOperationExecution({
      pkpPublicKey,
      isSponsored: alchemyGasSponsor,
      operationHash: approvalHash,
      provider: sepoliaProvider,
    });
    consola.debug('Approval transaction mined');
  } else {
    consola.debug('Approval already exists, skipping approval transaction');
  }

  // Step 2: Execute repay transaction using direct contract call
  // Using backend wallet (delegatee) to call the repay function on behalf of the user
  // The PKP wallet has already approved USDC, so Aave will pull from PKP wallet
  consola.debug('Preparing repay transaction...');

  consola.debug('Repay transaction details:', {
    repayAmount,
    debtOwner: onBehalfOf,
    payer: pkpEthAddress,
  });

  // Get backend signer (delegatee wallet)
  const signer = getSigner(SEPOLIA_CHAIN_ID);

  // Create Aave Pool contract instance
  const aavePool = new ethers.Contract(AAVE_POOL_ADDRESS_SEPOLIA, AAVE_POOL_ABI, signer);

  consola.debug('Executing repay transaction via backend wallet...');

  // Execute the repay transaction
  // The backend wallet calls repay(), but Aave pulls USDC from PKP wallet (which approved)
  // to repay the debt of onBehalfOf address (MetaMask wallet)
  const tx = await aavePool.repay(
    USDC_ADDRESS_SEPOLIA, // asset
    amountInWei, // amount
    2, // interestRateMode (variable rate)
    onBehalfOf // onBehalfOf - whose debt to repay (MetaMask wallet)
  );

  consola.debug('Repay transaction sent:', tx.hash);

  // Wait for transaction confirmation
  const receipt = await tx.wait();
  consola.debug('Repay transaction confirmed:', receipt.transactionHash);

  const repayHash = receipt.transactionHash as `0x${string}`;

  consola.log('Aave repay completed successfully!', {
    repayAmount,
    repayHash,
    debtOwner: onBehalfOf,
    payer: pkpEthAddress,
  });

  return repayHash;
}
