// app/debug/web3auth-test/page.tsx
// Debug page to test Web3Auth integration

import { PageContainer } from '@/components/layouts/page-container';
import { WalletIntegration } from '@/components/wallet/WalletIntegration';

export default function Web3AuthTestPage() {
  return (
    <PageContainer title="Web3Auth Integration Test" backHref="/debug">
      <div className="space-y-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Web3Auth Integration Test</h3>
          <p className="text-sm text-gray-600">
            This page demonstrates the Web3Auth integration with the main application.
            You can connect your wallet, view blockchain balances, and send stablecoin transactions.
          </p>
        </div>
        
        <WalletIntegration />
      </div>
    </PageContainer>
  );
} 