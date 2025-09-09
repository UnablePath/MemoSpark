import React from 'react';
import { useSimpleMoMoRecurring } from '@/hooks/useSimpleMoMoRecurring';
import { SimpleMoMoPaymentPrompt } from './SimpleMoMoPaymentPrompt';

interface SimpleMoMoCheckerProps {
  children: React.ReactNode;
}

export const SimpleMoMoChecker: React.FC<SimpleMoMoCheckerProps> = ({ children }) => {
  const {
    subscriptionStatus,
    isLoading,
    showPaymentPrompt,
    dismissPaymentPrompt,
    proceedWithPayment,
  } = useSimpleMoMoRecurring();

  return (
    <>
      {children}
      
      <SimpleMoMoPaymentPrompt
        isOpen={showPaymentPrompt}
        onClose={dismissPaymentPrompt}
        onProceed={proceedWithPayment}
        subscription={subscriptionStatus?.subscription}
        daysOverdue={subscriptionStatus?.daysOverdue}
        message={subscriptionStatus?.message}
        isLoading={isLoading}
      />
    </>
  );
};
