import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useWithdrawalHistory } from '@/hooks/useWithdrawalHistory';
import Navigation from '@/components/Navigation';
import WithdrawalHistoryTable from '@/components/withdrawal-history/WithdrawalHistoryTable';

const SelfCheckoutHistoryPage: React.FC = () => {
  const { t } = useTranslation();
  const { withdrawalData, loading } = useWithdrawalHistory();

  return (
    <div className="min-h-screen w-full bg-background">
      <Navigation />
      <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">{t('withdrawal.historyTitle')}</h1>
          <p className="text-muted-foreground mt-2">{t('withdrawal.historyDescription')}</p>
        </div>

        <WithdrawalHistoryTable data={withdrawalData} loading={loading} />
      </div>
    </div>
  );
};

export default SelfCheckoutHistoryPage;