'use client';

import { useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5050';

interface BalanceUpdate {
  accountId: string;
  balance: number;
  version: number;
}

interface TransactionEvent {
  _id: string;
  type: string;
  fromAccount: string | null;
  toAccount: string | null;
  amount: number;
  status: string;
  errorMessage?: string;
  createdAt: string;
}

export function useSocket() {
  const [connected, setConnected] = useState(false);
  const [balanceUpdates, setBalanceUpdates] = useState<BalanceUpdate[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<TransactionEvent[]>([]);
  const [failedTransactions, setFailedTransactions] = useState<TransactionEvent[]>([]);

  useEffect(() => {
    const socketInstance = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });

    socketInstance.on('connect', () => {
      setConnected(true);
      console.log('WebSocket connected');
    });

    socketInstance.on('disconnect', () => {
      setConnected(false);
      console.log('WebSocket disconnected');
    });

    socketInstance.on('balance:updated', (data: BalanceUpdate) => {
      setBalanceUpdates((prev) => {
        const filtered = prev.filter((u) => u.accountId !== data.accountId);
        return [data, ...filtered].slice(0, 50);
      });
    });

    socketInstance.on('transaction:created', (data: TransactionEvent) => {
      setRecentTransactions((prev) => [data, ...prev].slice(0, 50));
    });

    socketInstance.on('transaction:failed', (data: TransactionEvent) => {
      setFailedTransactions((prev) => [data, ...prev].slice(0, 50));
    });

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const clearEvents = useCallback(() => {
    setBalanceUpdates([]);
    setRecentTransactions([]);
    setFailedTransactions([]);
  }, []);

  return {
    connected,
    balanceUpdates,
    recentTransactions,
    failedTransactions,
    clearEvents,
  };
}
