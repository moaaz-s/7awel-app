// components/wallet/WalletIntegration.tsx
// Component demonstrating Web3Auth integration with traditional wallet functionality

import React, { useEffect, useState } from 'react';
import { useData } from '@/context/DataContext-v2';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wallet, DollarSign, Send } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import type { AssetBalance, StablecoinTransferParams } from '@/types';

export function WalletIntegration() {
  const { t } = useLanguage();
  const { web3Auth, balance, refreshBalance } = useData();
  const [selectedToken, setSelectedToken] = useState<AssetBalance | null>(null);
  const [transferParams, setTransferParams] = useState<StablecoinTransferParams>({
    toAddress: '',
    amount: 0,
    tokenMint: '',
  });

  // Auto-refresh traditional balance when Web3Auth balance changes
  useEffect(() => {
    if (web3Auth.isConnected) {
      refreshBalance();
    }
  }, [web3Auth.isConnected, refreshBalance]);

  const handleConnectWallet = async () => {
    try {
      await web3Auth.connectWallet('google');
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const handleSendStablecoin = async () => {
    if (!selectedToken || !transferParams.toAddress || transferParams.amount <= 0) {
      return;
    }

    try {
      const result = await web3Auth.sendStablecoin({
        ...transferParams,
        tokenMint: selectedToken.mint!,
      });

      if (result.success) {
        console.log('Transaction successful:', result.signature);
        // Refresh balances after successful transaction
        await Promise.all([
          web3Auth.refreshWalletInfo(),
          refreshBalance(),
        ]);
      } else {
        console.error('Transaction failed:', result.error);
      }
    } catch (error) {
      console.error('Send stablecoin failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Web3Auth Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Web3Auth Wallet Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Connection Status:</span>
              <Badge variant={web3Auth.isConnected ? 'default' : 'secondary'}>
                {web3Auth.isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>

            {web3Auth.isConnected && web3Auth.walletInfo && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Wallet Address:</span>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                    {web3Auth.walletInfo.address.slice(0, 8)}...{web3Auth.walletInfo.address.slice(-8)}
                  </code>
                </div>
                <div className="flex items-center justify-between">
                  <span>Total USD Value:</span>
                  <span className="font-semibold">${web3Auth.getTotalUSDValue().toFixed(2)}</span>
                </div>
              </div>
            )}

            {!web3Auth.isConnected && (
              <Button 
                onClick={handleConnectWallet}
                disabled={web3Auth.isConnecting}
                className="w-full"
              >
                {web3Auth.isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Connect Web3Auth Wallet'
                )}
              </Button>
            )}

            {web3Auth.error && (
              <div className="text-red-600 text-sm">
                Error: {web3Auth.error}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={web3Auth.clearError}
                  className="ml-2"
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Blockchain Balances */}
      {web3Auth.isConnected && web3Auth.walletInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Blockchain Balances
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* SOL Balance */}
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div>
                  <div className="font-medium">SOL</div>
                  <div className="text-sm text-gray-600">{web3Auth.walletInfo.solBalance.decimals} decimals</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{web3Auth.walletInfo.solBalance.amount.toFixed(6)}</div>
                  <div className="text-sm text-gray-600">
                    ${(web3Auth.walletInfo.solBalance.fiatValue || 0).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Stablecoin Balances */}
              {web3Auth.walletInfo.stablecoinBalances.map((balance) => (
                <div 
                  key={balance.id}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedToken?.id === balance.id ? 'bg-blue-100 border-2 border-blue-300' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                  onClick={() => setSelectedToken(balance)}
                >
                  <div>
                    <div className="font-medium">{balance.symbol}</div>
                    <div className="text-sm text-gray-600">
                      {balance.decimals} decimals • {balance.mint?.slice(0, 8)}...
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{balance.amount.toFixed(2)}</div>
                    <div className="text-sm text-gray-600">
                      ${(balance.fiatValue || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Send Interface */}
      {web3Auth.isConnected && selectedToken && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Send {selectedToken.symbol}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Recipient Address</label>
                <input
                  type="text"
                  value={transferParams.toAddress}
                  onChange={(e) => setTransferParams(prev => ({ ...prev, toAddress: e.target.value }))}
                  className="w-full p-2 border rounded-lg text-sm"
                  placeholder="Enter Solana wallet address"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Amount ({selectedToken.symbol})
                </label>
                <input
                  type="number"
                  value={transferParams.amount}
                  onChange={(e) => setTransferParams(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  className="w-full p-2 border rounded-lg"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  max={selectedToken.amount}
                />
                <div className="text-sm text-gray-600 mt-1">
                  Available: {selectedToken.amount.toFixed(2)} {selectedToken.symbol}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Memo (Optional)</label>
                <input
                  type="text"
                  value={transferParams.memo || ''}
                  onChange={(e) => setTransferParams(prev => ({ ...prev, memo: e.target.value }))}
                  className="w-full p-2 border rounded-lg"
                  placeholder="Transaction memo"
                />
              </div>

              <Button 
                onClick={handleSendStablecoin}
                disabled={!transferParams.toAddress || transferParams.amount <= 0 || transferParams.amount > selectedToken.amount}
                className="w-full"
              >
                Send {selectedToken.symbol}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Traditional vs Blockchain Balance Comparison */}
      {web3Auth.isConnected && balance && (
        <Card>
          <CardHeader>
            <CardTitle>Balance Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span>Traditional Balance:</span>
                <span className="font-semibold">${balance.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Blockchain Total:</span>
                <span className="font-semibold">${web3Auth.getTotalUSDValue().toFixed(2)}</span>
              </div>
              <div className="border-t pt-2">
                <div className="text-sm text-gray-600">
                  Integration allows both traditional and blockchain balances to coexist
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 