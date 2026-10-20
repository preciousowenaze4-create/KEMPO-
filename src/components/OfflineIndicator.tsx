import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-12 left-4 right-4 z-50 flex items-center justify-center gap-2 rounded-xl bg-red-900/90 border border-red-600 px-3 py-2 text-xs font-medium text-white shadow-xl backdrop-blur-md animate-in slide-in-from-top">
      <WifiOff className="w-4 h-4 text-red-300" />
      <span>Offline Mode — Cached chats and messages are available</span>
    </div>
  );
};
