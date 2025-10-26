import { useAccount, useBalance } from 'wagmi';
import { Navbar } from '@/components/navbar';
import { useHealthFactor } from '@/components/health-factor';
import { RepayTest } from '@/components/repay-test';
import { DepositToLitWallet } from '@/components/deposit-to-lit-wallet';
import { useCallback, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { Copy, Check } from 'lucide-react';

import { useJwtContext } from '@lit-protocol/vincent-app-sdk/react';

import { useChain } from '@/hooks/useChain';
export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const {
    data: balanceData,
    isLoading: balanceLoading,
    isError: balanceError,
    refetch,
  } = useBalance({
    address: address,
  });
  const { healthFactor, loading: hfLoading, error: hfError } = useHealthFactor();

  const { provider, usdcContract } = useChain();
  const [ethBalance, setEthBalance] = useState<string>('0');
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const { authInfo } = useJwtContext();

  // Function to fetch PKP balances
  const fetchPkpBalance = useCallback(async () => {
    if (!authInfo?.pkp.ethAddress) return;

    try {
      setIsLoadingBalance(true);

      const [ethBalanceWei] = await Promise.all([
        provider.getBalance(authInfo?.pkp.ethAddress),
        usdcContract.balanceOf(authInfo?.pkp.ethAddress),
      ]);

      setEthBalance(ethers.utils.formatUnits(ethBalanceWei, 18));

      setIsLoadingBalance(false);
    } catch (err: unknown) {
      console.error('Error fetching PKP balances:', err);
      setIsLoadingBalance(false);
    }
  }, [authInfo, provider, usdcContract]);

  useEffect(() => {
    queueMicrotask(() => fetchPkpBalance());
  }, [fetchPkpBalance]);

  const copyAddress = useCallback(async () => {
    const address = authInfo?.pkp.ethAddress;
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Failed to copy address to clipboard', err);
    }
  }, [authInfo?.pkp.ethAddress]);
  return (
    <>
      <Navbar />
      <div className="py-8 ">
        <div className="pl-10 md:pl-44">
          <span className="inline-block text-indigo-600 font-extrabold text-3xl sm:text-4xl tracking-tight">
            Dashboard
          </span>
        </div>

        {!isConnected && (
          <div className="mx-10 mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            Please connect your wallet to view dashboard
          </div>
        )}

        <div className="flex flex-wrap gap-6 mt-10 justify-center px-10 pt-10">
          <div className="flex flex-col items-start border-2 border-indigo-100 rounded-2xl w-full md:w-xl p-6  shadow-md min-h-[180px]">
            <span className="font-semibold text-xl text-gray-900 inline-block">
              MetaMask Balance
            </span>
            {balanceLoading && (
              <span className="font-bold text-3xl md:text-5xl text-blue-900 mt-10">Loading...</span>
            )}
            {balanceError && (
              <span className="font-bold text-3xl md:text-5xl text-red-600 mt-10">Error</span>
            )}
            {!balanceLoading && !balanceError && (
              <span className="font-bold  text-3xl md:text-5xl text-blue-900 mt-10">
                {balanceData?.formatted
                  ? Math.floor(parseFloat(balanceData.formatted) * 100) / 100
                  : '0.00'}{' '}
                <span className="text-2xl md:text-3xl">{balanceData?.symbol}</span>
              </span>
            )}
            {!balanceLoading && !balanceError && (
              <button
                onClick={() => refetch()}
                className="mt-4 px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
              >
                Refresh
              </button>
            )}
          </div>

          <div className="flex flex-row items-start justify-between border-2 border-indigo-100 rounded-2xl w-full md:w-xl p-6 shadow-md min-h-[180px]">
            <div className="flex flex-col ">
              <span className="font-semibold text-xl text-gray-900">Health Factor</span>
              <span className="font-bold  text-3xl md:text-5xl text-blue-900 mt-10">
                {hfLoading
                  ? 'Loading...'
                  : healthFactor != null
                    ? // Truncate to at most 2 decimals (do not round)
                      (Math.floor(healthFactor * 100) / 100).toString()
                    : 'N/A'}
              </span>
            </div>
            {hfError && <div className="text-sm text-red-600">{hfError}</div>}
          </div>

          <div className="flex flex-col items-start border-2 border-indigo-100 rounded-2xl w-full md:w-xl p-6 shadow-md min-h-[180px]">
            <span className="font-semibold text-xl text-gray-900">LitWallet</span>
            <div className="mt-8 w-full">
              <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                ETH Balance
              </span>
              <div className="flex items-center gap-3 mt-3">
                <span className="font-bold text-3xl md:text-5xl text-blue-900">
                  {isLoadingBalance ? 'Loading...' : Math.floor(parseFloat(ethBalance) * 100) / 100}
                </span>
                <span className="font-semibold text-xl md:text-2xl text-gray-700">ETH</span>
              </div>
            </div>
            <div className="mt-8 w-full">
              <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                Address
              </span>
              <button
                onClick={copyAddress}
                className="flex items-center gap-2 mt-3 px-4 py-2.5 bg-indigo-100 hover:bg-indigo-200 rounded text-sm text-indigo-700 font-semibold transition-colors"
              >
                {authInfo?.pkp.ethAddress
                  ? `${authInfo.pkp.ethAddress.slice(0, 6)}...${authInfo.pkp.ethAddress.slice(-4)}`
                  : 'N/A'}
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          <RepayTest />
          <DepositToLitWallet />
        </div>
      </div>
    </>
  );
}
