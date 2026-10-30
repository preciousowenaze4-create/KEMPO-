import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  // Offline banner is disabled per user request: "If someone enters into the app offline, it should stop displaying offline at the top. That thing is blocking view, you should stop displaying it."
  return null;
};
