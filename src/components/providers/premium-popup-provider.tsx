'use client';

import React, { createContext, useContext } from 'react';
import { PremiumUpgradePopup } from '@/components/premium/PremiumUpgradePopup';
import { usePremiumPopupManager } from '@/hooks/usePremiumPopupManager';
import { useUserTier } from '@/hooks/useUserTier';

// Determine if we're in launch mode
const isLaunchMode = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENABLE_LAUNCH_MODE === 'true';

interface PremiumPopupContextType {
  showFeatureGatePopup: (featureName: string) => void;
  showGeneralPopup: () => void;
  showLaunchPopup: () => void;
  isPopupOpen: boolean;
}

const PremiumPopupContext = createContext<PremiumPopupContextType | undefined>(undefined);

export const usePremiumPopup = () => {
  const context = useContext(PremiumPopupContext);
  if (context === undefined) {
    throw new Error('usePremiumPopup must be used within a PremiumPopupProvider');
  }
  return context;
};

interface PremiumPopupProviderProps {
  children: React.ReactNode;
}

export const PremiumPopupProvider: React.FC<PremiumPopupProviderProps> = ({ children }) => {
  const { tier, isLoading } = useUserTier();
  
  const {
    popupState,
    showPopup,
    closePopup,
    showFeatureGatePopup,
    shouldShowPopups
  } = usePremiumPopupManager({
    popupIntervalMinutes: 3, // Show popup every 3 minutes
    isLaunchMode,
    userTier: tier
  });

  const showGeneralPopup = () => {
    if (shouldShowPopups) {
      showPopup('general');
    }
  };

  const showLaunchPopup = () => {
    if (shouldShowPopups) {
      showPopup('launch');
    }
  };

  const contextValue: PremiumPopupContextType = {
    showFeatureGatePopup,
    showGeneralPopup,
    showLaunchPopup,
    isPopupOpen: popupState.isOpen
  };

  // Don't render popup system while loading user tier
  if (isLoading) {
    return (
      <PremiumPopupContext.Provider value={contextValue}>
        {children}
      </PremiumPopupContext.Provider>
    );
  }

  return (
    <PremiumPopupContext.Provider value={contextValue}>
      {children}
      
      {/* Global Premium Popup */}
      <PremiumUpgradePopup
        isOpen={popupState.isOpen}
        onClose={closePopup}
        mode={popupState.mode}
        feature={popupState.feature}
      />
    </PremiumPopupContext.Provider>
  );
}; 