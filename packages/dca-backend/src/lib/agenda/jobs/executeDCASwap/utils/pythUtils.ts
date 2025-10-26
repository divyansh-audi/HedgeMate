import { HermesClient } from '@pythnetwork/hermes-client';
import PythAbi from '@pythnetwork/pyth-sdk-solidity/abis/IPyth.json' assert { type: 'json' };
import { ethers } from 'ethers';

import { getSigner } from "./aaveUtils";
import {
  PYTH_CONTRACT_ADDRESS_SEPOLIA,
  PYTH_PRICE_FEED_ID_ETH_USD,
  OUR_SMART_CONTRACT_ABI,
  OUR_SMART_CONTRACT_ADDRESS,
} from './constants';
import { serviceLogger } from '../../../../logger';

const hermes = new HermesClient('https://hermes.pyth.network');

export async function executeOnChainPriceUpdate(): Promise<number> {
  serviceLogger.info('[pythUtils] Starting executeOnChainPriceUpdate...');
  const signer = getSigner(11155111);

  serviceLogger.info('[pythUtils] Fetching latest price updates from Hermes...');
  const priceUpdatesResponse = await hermes.getLatestPriceUpdates([PYTH_PRICE_FEED_ID_ETH_USD]);
  serviceLogger.debug('[pythUtils] Raw Hermes Response:', priceUpdatesResponse);

  let priceUpdateData: string[];
  try {
    const binaryDataArray = priceUpdatesResponse?.binary?.data;
    if (!Array.isArray(binaryDataArray)) {
      serviceLogger.error(
        '[pythUtils] Hermes response.binary.data is not an array:',
        priceUpdatesResponse
      );
      throw new Error(
        'Unexpected response structure from Hermes API (binary.data missing or not array).'
      );
    }
    priceUpdateData = binaryDataArray.map((hexString) => {
      if (typeof hexString !== 'string') {
        throw new Error('Invalid item found in Hermes binary.data array');
      }
      return hexString.startsWith('0x') ? hexString : `0x${hexString}`;
    });
    serviceLogger.info(
      '[pythUtils] Successfully extracted priceUpdateData (hex strings):',
      priceUpdateData
    );
  } catch (processingError) {
    serviceLogger.error('[pythUtils] Error processing Hermes response:', processingError);
    throw processingError;
  }

  const pythContractAddressLower = PYTH_CONTRACT_ADDRESS_SEPOLIA.toLowerCase();
  serviceLogger.debug(
    `[pythUtils] Using Pyth contract address (lowercase): ${pythContractAddressLower}`
  );
  const pythContract = new ethers.Contract(pythContractAddressLower, PythAbi, signer.provider);

  serviceLogger.info('[pythUtils] Getting update fee with data:', priceUpdateData);

  let updateFee;
  try {
    updateFee = await pythContract.getUpdateFee(priceUpdateData);
  } catch (feeError: any) {
    serviceLogger.error(`[pythUtils] Error calling getUpdateFee:`, feeError);
    serviceLogger.error(`[pythUtils] Fee Error Code: ${feeError.code}`);
    serviceLogger.error(`[pythUtils] Fee Error Reason: ${feeError.reason}`);
    serviceLogger.error(`[pythUtils] Fee Error Transaction Data:`, feeError.transaction?.data);
    throw feeError;
  }
  serviceLogger.info(`[pythUtils] Required update fee: ${ethers.utils.formatEther(updateFee)} ETH`);

  const healthGuardianAddressLower = OUR_SMART_CONTRACT_ADDRESS.toLowerCase();
  serviceLogger.debug(
    `[pythUtils] Using Health Guardian contract address (lowercase): ${healthGuardianAddressLower}`
  );
  const healthGuardianContract = new ethers.Contract(
    healthGuardianAddressLower,
    OUR_SMART_CONTRACT_ABI,
    signer
  );

  serviceLogger.info('[pythUtils] Sending on-chain transaction...');
  const tx = await healthGuardianContract.updatePrices(priceUpdateData, { value: updateFee });
  await tx.wait();
  serviceLogger.info(`[pythUtils] Transaction confirmed: ${tx.hash}`);

  const storedPrice = await healthGuardianContract.getETHPrice();
  serviceLogger.debug('[pythUtils] Raw storedPriceResult:', storedPrice);

  const priceBigNumber = storedPrice[0];
  const exponent = storedPrice[1];
  const decimals = exponent * -1;
  const priceNumber = ethers.utils.formatUnits(priceBigNumber, decimals);

  serviceLogger.info(`[pythUtils] Success! Price: $${priceNumber}`);
  return parseFloat(priceNumber);
}
