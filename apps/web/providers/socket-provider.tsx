'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { getSocket, disconnectSocket } from '@/lib/socket';
import { useAuthStore } from '@/stores/auth-store';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export function useSocketContext() {
  return useContext(SocketContext);
}

interface SocketProviderProps {
  children: ReactNode;
  tenantId?: string;
}

export function SocketProvider({ children, tenantId }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();
  const { token } = useAuthStore();

  useEffect(() => {
    if (!token) {
      disconnectSocket();
      setSocket(null);
      setIsConnected(false);
      return;
    }

    const s = getSocket(token);
    setSocket(s);

    // Connection handlers
    function onConnect() {
      console.log('[SOCKET] Connected:', s.id);
      setIsConnected(true);
      
      // Join tenant room
      const tid = tenantId || process.env.NEXT_PUBLIC_TENANT_ID || '3222348440';
      s.emit('join:tenant', tid);
    }

    function onDisconnect(reason: string) {
      console.log('[SOCKET] Disconnected:', reason);
      setIsConnected(false);
    }

    // Pricebook category events
    function onCategoriesSynced(data: { count: number; type: string; incremental: boolean; timestamp: string }) {
      console.log('[SOCKET] Categories synced:', data);
      toast({ title: 'Sync Complete', description: `Synced ${data.count} categories` });
      
      // Invalidate React Query cache
      queryClient.invalidateQueries({ queryKey: ['pricebook-categories'] });
      queryClient.invalidateQueries({ queryKey: ['pricebook-category-tree'] });
    }

    function onCategoryUpdated(data: { stId: number; name: string; changes: string[]; timestamp: string }) {
      console.log('[SOCKET] Category updated:', data);
      toast({ title: 'Category Updated', description: `"${data.name}" updated` });
      
      // Invalidate specific category
      queryClient.invalidateQueries({ queryKey: ['pricebook-categories'] });
      queryClient.invalidateQueries({ queryKey: ['pricebook-category', data.stId] });
    }

    function onCategoriesPushed(data: { count: number; success: number; failed: number; timestamp: string }) {
      console.log('[SOCKET] Categories pushed:', data);
      if (data.failed > 0) {
        toast({ title: 'Push Partial', description: `Pushed ${data.success} changes, ${data.failed} failed`, variant: 'destructive' });
      } else if (data.success > 0) {
        toast({ title: 'Push Complete', description: `Pushed ${data.success} changes to ServiceTitan` });
      }
      
      queryClient.invalidateQueries({ queryKey: ['pricebook-categories'] });
      queryClient.invalidateQueries({ queryKey: ['pending-overrides'] });
    }

    // General sync events
    function onSyncStarted(data: { entity: string; message: string; timestamp: string }) {
      console.log('[SOCKET] Sync started:', data);
      toast({ title: 'Sync Started', description: data.message });
    }

    function onSyncCompleted(data: { entity: string; fetched: number; duration: number; message: string; timestamp: string }) {
      console.log('[SOCKET] Sync completed:', data);
      toast({ title: 'Sync Complete', description: data.message });
    }

    function onSyncFailed(data: { entity: string; error: string; message: string; timestamp: string }) {
      console.log('[SOCKET] Sync failed:', data);
      toast({ title: 'Sync Failed', description: data.message, variant: 'destructive' });
    }

    // Register event listeners
    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('pricebook:categories:synced', onCategoriesSynced);
    s.on('pricebook:categories:updated', onCategoryUpdated);
    s.on('pricebook:categories:pushed', onCategoriesPushed);
    s.on('sync:started', onSyncStarted);
    s.on('sync:completed', onSyncCompleted);
    s.on('sync:failed', onSyncFailed);

    // Set initial state
    setIsConnected(s.connected);

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('pricebook:categories:synced', onCategoriesSynced);
      s.off('pricebook:categories:updated', onCategoryUpdated);
      s.off('pricebook:categories:pushed', onCategoriesPushed);
      s.off('sync:started', onSyncStarted);
      s.off('sync:completed', onSyncCompleted);
      s.off('sync:failed', onSyncFailed);
    };
  }, [token, tenantId, queryClient]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}
