import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useJwtContext } from '@lit-protocol/vincent-app-sdk/react';
import { useChain } from '@/hooks/useChain';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ethers } from 'ethers';

const USDC_ABI = [
  'function transfer(address to, uint256 amount) public returns (bool)',
  'function approve(address spender, uint256 amount) public returns (bool)',
  'function balanceOf(address account) public view returns (uint256)',
  'function allowance(address owner, address spender) public view returns (uint256)',
];

const USDC_ADDRESS_SEPOLIA = '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8'; // Sepolia testnet

export function DepositToLitWallet() {
  const { address: userAddress, isConnected } = useAccount();
  const { authInfo } = useJwtContext();
  const { usdcContract } = useChain();
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [usdcBalance, setUsdcBalance] = useState<string>('0');
  const [isCheckingBalance, setIsCheckingBalance] = useState<boolean>(false);

  const handleCheckBalance = async () => {
    if (!userAddress) {
      setError('Please connect your wallet');
      return;
    }

    try {
      setIsCheckingBalance(true);
      setError('');
      const balance = await usdcContract.balanceOf(userAddress);
      const formattedBalance = ethers.utils.formatUnits(balance, 6);
      setUsdcBalance(formattedBalance);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Error checking balance: ${errorMessage}`);
    } finally {
      setIsCheckingBalance(false);
    }
  };

  const handleDeposit = async () => {
    if (!userAddress || !authInfo?.pkp.ethAddress || !depositAmount) {
      setError('Please connect your wallet and enter an amount');
      return;
    }

    if (parseFloat(depositAmount) <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      setSuccess('');

      // Get the signer from the user's MetaMask wallet
      const provider = new ethers.providers.Web3Provider(
        window.ethereum as unknown as ethers.providers.ExternalProvider
      );
      const signer = provider.getSigner();

      // Create USDC contract instance with the user's signer
      const usdcContractWithSigner = new ethers.Contract(USDC_ADDRESS_SEPOLIA, USDC_ABI, signer);

      // Convert amount to wei (USDC has 6 decimals)
      const amountInWei = ethers.utils.parseUnits(depositAmount, 6);

      // Execute the transfer
      const tx = await usdcContractWithSigner.transfer(authInfo.pkp.ethAddress, amountInWei);
      const receipt = await tx.wait();

      setSuccess(`Deposit successful! Transaction: ${receipt.transactionHash.slice(0, 10)}...`);
      setDepositAmount('');
      await handleCheckBalance();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Error: ${errorMessage}`);
      console.error('Deposit error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start border-2 border-green-100 rounded-2xl w-full md:w-xl p-6 shadow-md bg-green-50 gap-4">
      <span className="font-semibold text-xl text-gray-900">Deposit USDC to LitWallet</span>

      {!isConnected ? (
        <div className="w-full p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded text-sm">
          Please connect your MetaMask wallet to deposit USDC
        </div>
      ) : (
        <div className="w-full space-y-3">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">Your USDC Balance</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={`${Math.floor(parseFloat(usdcBalance) * 1000000) / 1000000}`}
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded text-sm"
              />
              <Button
                onClick={handleCheckBalance}
                disabled={isCheckingBalance || isLoading}
                variant="outline"
                size="sm"
              >
                {isCheckingBalance ? 'Checking...' : 'Check'}
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">Amount to Deposit (USDC)</label>
            <Input
              type="number"
              placeholder="Enter amount"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              disabled={isLoading}
              step="0.01"
            />
            <p className="text-xs text-gray-500">
              To: {authInfo?.pkp.ethAddress?.slice(0, 6)}...{authInfo?.pkp.ethAddress?.slice(-4)}
            </p>
          </div>

          <Button
            onClick={handleDeposit}
            disabled={isLoading || !depositAmount}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {isLoading ? 'Processing...' : 'Deposit USDC'}
          </Button>

          {error && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded text-sm">
              {success}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
