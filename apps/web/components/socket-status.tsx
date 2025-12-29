'use client';

import { useSocketContext } from '@/providers/socket-provider';
import { Wifi, WifiOff } from 'lucide-react';

export function SocketStatus() {
  const { isConnected } = useSocketContext();

  return (
    <div 
      className="flex items-center gap-2" 
      title={isConnected ? 'Real-time connected' : 'Disconnected'}
    >
      {isConnected ? (
        <Wifi className="w-4 h-4 text-green-500" />
      ) : (
        <WifiOff className="w-4 h-4 text-red-500" />
      )}
      <span className="text-xs text-gray-500">
        {isConnected ? 'Live' : 'Offline'}
      </span>
    </div>
  );
}
